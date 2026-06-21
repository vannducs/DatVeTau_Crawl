package com.booktrain_crawl.crawler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VexereCrawlerService {

    private final WebClient              vexereWebClient;
    private final TrainStationRepository stationRepo;
    private final TrainRepository        trainRepo;
    private final TrainTripRepository    tripRepo;
    private final TripCarriageRepository carriageRepo;
    private final TripSeatRepository     seatRepo;
    private final TripSegmentPriceRepository priceRepo;
    private final CrawlerLogRepository   crawlerLogRepo;
    private final SeatBookingRepository  seatBookingRepo;
    private final CrawlerUpsertService   upsertService;

    private static final Map<String, String> GROUP_TO_TYPE = Map.of(
            "NGM", "seat",
            "NAC", "sleeper_3",
            "NAM", "sleeper_2"
    );

    // Vexere numeric station IDs — fallback khi DB chưa có vexere_station_id
    private static final Map<String, Long> VEXERE_STATION_ID = Map.of(
            "HNO", 102188L,
            "SGO", 28284L,
            "DNA", 135548L,
            "VIN", 0L   // chưa xác định, bổ sung sau
    );

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .setPropertyNamingStrategy(com.fasterxml.jackson.databind.PropertyNamingStrategies.LOWER_CAMEL_CASE);

    public record CrawlResult(int tripsFound, int tripsSaved, int totalCarriages, int totalSeats, String status) {}


    public CrawlResult crawlAndSave(String fromVexereCode, String toVexereCode,
                                    LocalDate date, String vexereToken) {
        long start = System.currentTimeMillis();
        int tripsFound = 0, tripsSaved = 0, totalCarriages = 0, totalSeats = 0;
        String status = "success";
        String errorMsg = null;

        try {
            TrainStation fromStation = stationRepo.findByVexereCode(fromVexereCode)
                    .orElseThrow(() -> new RuntimeException("Station not found: " + fromVexereCode));
            TrainStation toStation = stationRepo.findByVexereCode(toVexereCode)
                    .orElseThrow(() -> new RuntimeException("Station not found: " + toVexereCode));

            String timeId        = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
            String timeIdEncoded = timeId.replace(":", "%3A");
            final String token   = vexereToken;

            String uri = String.format(
                    "/v2/route/train?filter%%5Bfrom%%5D%%5B0%%5D=%s&filter%%5Bto%%5D%%5B0%%5D=%s&filter%%5Bdate%%5D=%s&filter%%5Bquantity%%5D=1&filter%%5Bpage%%5D=1&filter%%5Btime_id%%5D=%s&page=1&sort=fare%%3Aasc&time_id=%s",
                    fromVexereCode, toVexereCode, date.toString(), timeIdEncoded, timeIdEncoded);

            String url = "https://internal-vroute-cmc.vexere.com" + uri;
            log.info("=== CALLING URL: {}", url);
            log.info("=== TOKEN: {}", token != null ? token.substring(0, Math.min(30, token.length())) + "..." : "NULL");

            String raw = vexereWebClient.get()
                    .uri(uri)
                    .headers(headers -> {
                        if (token != null && !token.isBlank())
                            headers.set("Authorization", "Bearer " + token);
                        headers.set("origin-request-id",      "FE_NEXTJS_" + System.currentTimeMillis() + "_CRAWLER");
                        headers.set("origin-request-product", "FE_NEXTJS");
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("=== RAW RESPONSE: {}", raw);

            VexereApiResponse resp = objectMapper.readValue(raw, VexereApiResponse.class);
            String bookingCode = resp.getBookingCode();
            log.info("=== BOOKING CODE: {}", bookingCode);

            List<VexereApiResponse.TripData> data = resp.getData();
            if (data == null) data = List.of();

            if (data.isEmpty()) {
                log.info("[Crawl] Data empty - raw: {}", raw);
            } else {
                log.info("[Crawl] {}->{} {}: {} phần tử trong data[]", fromVexereCode, toVexereCode, date, data.size());
                for (VexereApiResponse.TripData item : data) {
                    log.info("[Crawl]   idIndex={} date={}", item.getIdIndex(), item.getDate());
                }
            }

            for (VexereApiResponse.TripData item : data) {
                tripsFound++;

                int itemCarriages = item.getListToaXe() != null ? item.getListToaXe().size() : 0;
                int itemSeats     = item.getListToaXe() != null
                        ? item.getListToaXe().stream().mapToInt(t -> t.getSoChoCon() != null ? t.getSoChoCon() : 0).sum()
                        : 0;

                Optional<TrainTrip> existingOpt = (item.getIdIndex() != null)
                        ? tripRepo.findByVexereIdIndex(item.getIdIndex())
                        : Optional.empty();

                if (existingOpt.isPresent()) {
                    TrainTrip existing = existingOpt.get();
                    boolean hasRealBooking = seatBookingRepo.existsRealBookingByTripId(existing.getId());

                    applyTripFields(existing, item, fromStation, toStation, date);
                    tripRepo.save(existing);

                    try {
                        if (hasRealBooking) {
                            // Có vé thật → KHÔNG xóa seats (booking đang trỏ vào trip_seat_id)
                            // Chỉ refresh giá segment (UPSERT) cho các toa hiện có
                            log.info("[Crawl] Trip {} (id={}) có booking thật — chỉ update giá/available, GIỮ ghế",
                                    item.getIdIndex(), existing.getId());
                            refreshSegmentPrices(existing, item, fromStation, toStation);
                        } else {
                            // Chưa có vé thật → xóa sạch data crawl cũ rồi insert lại (UPSERT)
                            log.info("[Crawl] Trip {} (id={}) — UPSERT: xóa data cũ + crawl lại",
                                    item.getIdIndex(), existing.getId());
                            upsertService.purgeCrawledData(existing.getId());
                            saveCarriagesForTrip(existing, item, fromStation, toStation, bookingCode, date, token);
                        }
                        tripsSaved++;
                        totalCarriages += itemCarriages;
                        totalSeats     += itemSeats;
                    } catch (Exception e) {
                        log.error("=== UPSERT error for trip {}: ", item.getIdIndex(), e);
                        if (!"partial".equals(status)) status = "partial";
                    }
                    continue;
                }

                try {
                    saveTripData(item, fromStation, toStation, date, bookingCode, token);
                    tripsSaved++;
                    totalCarriages += itemCarriages;
                    totalSeats     += itemSeats;
                } catch (Exception e) {
                    log.error("=== SAVE TRIP ERROR: ", e);
                    if (!"partial".equals(status)) status = "partial";
                }
            }

            Thread.sleep(800);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            status = "failed";
            errorMsg = "Interrupted";
        } catch (Exception e) {
            log.error("Crawl {}->{} {}: {}", fromVexereCode, toVexereCode, date, e.getMessage());
            status = "failed";
            errorMsg = e.getMessage() != null
                    ? e.getMessage().substring(0, Math.min(500, e.getMessage().length()))
                    : "Unknown error";
        }

        int durationMs = (int)(System.currentTimeMillis() - start);
        final int found = tripsFound, saved = tripsSaved;
        final String finalStatus = status, finalErr = errorMsg;
        crawlerLogRepo.save(CrawlerLog.builder()
                .fromCode(fromVexereCode).toCode(toVexereCode).crawlDate(date)
                .tripsFound(found).tripsSaved(saved)
                .status(finalStatus).errorMessage(finalErr).durationMs(durationMs)
                .build());

        return new CrawlResult(tripsFound, tripsSaved, totalCarriages, totalSeats, status);
    }

    public void saveTripData(VexereApiResponse.TripData item,
                             TrainStation fromStation, TrainStation toStation,
                             LocalDate date, String bookingCode, String token) {
        String trainCode = item.getTrainNumber() != null ? item.getTrainNumber() : "UNKNOWN";
        Train train = trainRepo.findByTrainCode(trainCode).orElseGet(() -> {
            VexereApiResponse.Company co = item.getCompany();
            String coCode = co != null ? co.getCode() : "VNR";
            String coName = co != null ? co.getName() : "Vietnam Railways Corporation";
            return trainRepo.save(Train.builder()
                    .trainCode(trainCode)
                    .trainName("Tàu " + trainCode)
                    .companyCode(coCode)
                    .companyName(coName)
                    .status("active")
                    .build());
        });

        String depTime    = item.getTime()        != null ? item.getTime()        : "00:00:00";
        String arrDateStr = item.getArrivalDate()  != null ? item.getArrivalDate() : date.toString();
        String arrTime    = item.getArrivalTime()  != null ? item.getArrivalTime() : "00:00:00";

        if (depTime.length() == 5) depTime += ":00";
        if (arrTime.length() == 5) arrTime += ":00";

        OffsetDateTime depDt = OffsetDateTime.parse(date      + "T" + depTime + "+07:00");
        OffsetDateTime arrDt = OffsetDateTime.parse(arrDateStr + "T" + arrTime + "+07:00");

        TrainTrip trip = tripRepo.save(TrainTrip.builder()
                .train(train)
                .fromStation(fromStation)
                .toStation(toStation)
                .departureDatetime(depDt)
                .arrivalDatetime(arrDt)
                .durationMinutes(item.getDuration())
                .minPrice(item.getMinPrice())
                .maxPrice(item.getMaxPrice())
                .totalSeats(0)
                .availableSeats(item.getSeatAvailable() != null ? item.getSeatAvailable() : 0)
                .vexereIdIndex(item.getIdIndex())
                .vexereTrainId(item.getTrainId())
                .vexereSession(item.getSession())
                .crawledAt(OffsetDateTime.now())
                .status("open")
                .build());

        saveCarriagesForTrip(trip, item, fromStation, toStation, bookingCode, date, token);
    }

    /** Cập nhật field trip-level từ data crawl mới (dùng cho UPSERT). */
    private void applyTripFields(TrainTrip trip, VexereApiResponse.TripData item,
                                 TrainStation from, TrainStation to, LocalDate date) {
        String depTime    = item.getTime()        != null ? item.getTime()        : "00:00:00";
        String arrDateStr = item.getArrivalDate()  != null ? item.getArrivalDate() : date.toString();
        String arrTime    = item.getArrivalTime()  != null ? item.getArrivalTime() : "00:00:00";
        if (depTime.length() == 5) depTime += ":00";
        if (arrTime.length() == 5) arrTime += ":00";

        trip.setFromStation(from);
        trip.setToStation(to);
        trip.setDepartureDatetime(OffsetDateTime.parse(date      + "T" + depTime + "+07:00"));
        trip.setArrivalDatetime(OffsetDateTime.parse(arrDateStr + "T" + arrTime + "+07:00"));
        trip.setDurationMinutes(item.getDuration());
        trip.setMinPrice(item.getMinPrice());
        trip.setMaxPrice(item.getMaxPrice());
        trip.setAvailableSeats(item.getSeatAvailable() != null ? item.getSeatAvailable() : 0);
        trip.setVexereTrainId(item.getTrainId());
        trip.setVexereSession(item.getSession());
        trip.setCrawledAt(OffsetDateTime.now());
    }

    /** Refresh giá segment (UPSERT) cho các toa hiện có — dùng khi trip có booking thật, không xóa ghế. */
    private void refreshSegmentPrices(TrainTrip trip, VexereApiResponse.TripData item,
                                      TrainStation from, TrainStation to) {
        Map<String, List<Long>> groupPrices = buildGroupPrices(item);
        for (TripCarriage tc : carriageRepo.findByTripIdOrderByCarriageOrder(trip.getId())) {
            String nhom = tc.getSeatGroup() != null ? tc.getSeatGroup() : "NGM";
            savePrices(trip, from, to, tc.getCarriageType(), nhom, groupPrices);
        }
    }

    /** Build map nhomCho → list giá từ seat_group_status. */
    private Map<String, List<Long>> buildGroupPrices(VexereApiResponse.TripData item) {
        Map<String, List<Long>> groupPrices = new HashMap<>();
        if (item.getSeatGroupStatus() != null) {
            for (VexereApiResponse.SeatGroupStatus sg : item.getSeatGroupStatus()) {
                if (sg.getType() != null && sg.getPrices() != null)
                    groupPrices.put(sg.getType(), sg.getPrices());
            }
        }
        return groupPrices;
    }

    /** Lưu toa/ghế/giá cho một trip. Dùng cho cả trip mới và backfill. */
    public void saveCarriagesForTrip(TrainTrip trip, VexereApiResponse.TripData item,
                                     TrainStation from, TrainStation to,
                                     String bookingCode, LocalDate date, String token) {
        log.info("=== TRIP saved id={} | listToaXe={}", trip.getId(),
                item.getListToaXe() == null ? "NULL" : item.getListToaXe().size());

        Map<String, List<Long>> groupPrices = buildGroupPrices(item);

        long fromStId = getVexereStationId(from);
        long toStId   = getVexereStationId(to);
        boolean canCallApi2 = bookingCode != null && !bookingCode.isBlank()
                && item.getTrainId() != null && fromStId > 0 && toStId > 0;

        int totalSeats = 0;
        Set<String> savedPriceKeys = new HashSet<>();

        List<VexereApiResponse.ToaXe> listToa = item.getListToaXe();
        if (listToa != null) {
            int order = 1;
            for (VexereApiResponse.ToaXe toa : listToa) {
                String nhom         = toa.getNhomChoWeb() != null ? toa.getNhomChoWeb() : "NGM";
                String carriageType = GROUP_TO_TYPE.getOrDefault(nhom, "seat");
                int realTotalSeats  = parseTotalSeatsFromModel(toa.getToaXe());
                if (realTotalSeats == 0) realTotalSeats = toa.getSoChoCon() != null ? toa.getSoChoCon() : 0;
                int soChoTrong = toa.getSoChoTrong() != null ? toa.getSoChoTrong() : 0;

                try {
                    log.info("=== Saving carriage model={} type={} realTotal={} available={}",
                            toa.getToaXe(), carriageType, realTotalSeats, soChoTrong);
                    TripCarriage carriage = carriageRepo.save(TripCarriage.builder()
                            .trip(trip)
                            .carriageOrder(order++)
                            .carriageModel(toa.getToaXe())
                            .carriageName(toa.getToaXeDienGiai())
                            .carriageType(carriageType)
                            .seatGroup(nhom)
                            .totalSeats(realTotalSeats)
                            .availableSeats(soChoTrong)
                            .minPrice(toa.getMinPrice())
                            .vexereId(toa.getId())
                            .build());
                    log.info("=== Carriage SAVED id={}", carriage.getId());

                    boolean api2Success = false;

                    if (canCallApi2 && toa.getId() != null) {
                        try {
                            Thread.sleep(200); // nhẹ nhàng với Vexere API
                            VexereSeatDetailResponse detail = callSeatDetailApi(
                                    token, bookingCode, item.getTrainId(), toa.getId(),
                                    fromStId, toStId, date, soChoTrong);

                            if (detail != null && detail.getData() != null
                                    && detail.getData().getCoachSeatTemplate() != null) {
                                List<TripSeat> seats = parseSeatsFromApi2(carriage, carriageType, detail);
                                if (!seats.isEmpty()) {
                                    List<TripSeat> savedSeats = seatRepo.saveAll(seats);
                                    totalSeats += savedSeats.size();
                                    api2Success = true;
                                    log.info("=== API2 OK: toa {} saved {} ghế thật", toa.getId(), savedSeats.size());

                                    // Mock booking: đánh dấu số ghế đã bán theo tỉ lệ từ API 1
                                    int realTotal      = carriage.getTotalSeats();
                                    int availableCount = toa.getSoChoTrong() != null ? toa.getSoChoTrong() : realTotal;
                                    int soldCount      = realTotal - availableCount;

                                    if (soldCount > 0) {
                                        List<TripSeat> shuffled = new ArrayList<>(savedSeats);
                                        java.util.Collections.shuffle(shuffled);
                                        List<SeatBooking> bookings = new ArrayList<>();
                                        for (int i = 0; i < Math.min(soldCount, shuffled.size()); i++) {
                                            bookings.add(SeatBooking.builder()
                                                    .tripSeat(shuffled.get(i))
                                                    .trip(trip)
                                                    .fromStation(from)
                                                    .toStation(to)
                                                    .fromOrderIndex(from.getOrderIndex())
                                                    .toOrderIndex(to.getOrderIndex())
                                                    .ticketPrice(java.math.BigDecimal.ZERO)
                                                    .status("confirmed")
                                                    .build());
                                        }
                                        seatBookingRepo.saveAll(bookings);
                                        log.info("Mocked {} sold seats for carriage {}", bookings.size(), carriage.getId());
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("=== API2 FAILED for toa {}: {}", toa.getId(), e.getMessage());
                        }
                    }

                    if (!api2Success) {
                        // Fallback: tự sinh ghế + mock booking để hiển thị đúng số chỗ đã bán
                        log.info("=== Fallback generateSeats for carriage id={}", carriage.getId());
                        List<TripSeat> savedSeats = seatRepo.saveAll(generateSeats(carriage, realTotalSeats));
                        totalSeats += realTotalSeats;

                        int soldCount = realTotalSeats - soChoTrong;
                        if (soldCount > 0 && !savedSeats.isEmpty()) {
                            List<TripSeat> shuffled = new ArrayList<>(savedSeats);
                            java.util.Collections.shuffle(shuffled);
                            List<SeatBooking> mockBookings = new ArrayList<>();
                            for (int i = 0; i < Math.min(soldCount, shuffled.size()); i++) {
                                mockBookings.add(SeatBooking.builder()
                                        .tripSeat(shuffled.get(i))
                                        .trip(trip)
                                        .fromStation(from)
                                        .toStation(to)
                                        .fromOrderIndex(from.getOrderIndex())
                                        .toOrderIndex(to.getOrderIndex())
                                        .ticketPrice(java.math.BigDecimal.ZERO)
                                        .status("confirmed")
                                        .build());
                            }
                            seatBookingRepo.saveAll(mockBookings);
                        }
                    }

                    String priceKey = carriageType;
                    if (!savedPriceKeys.contains(priceKey)) {
                        savedPriceKeys.add(priceKey);
                        savePrices(trip, from, to, carriageType, nhom, groupPrices);
                    }
                } catch (Exception ex) {
                    log.error("=== CARRIAGE SAVE FAILED model={}: ", toa.getToaXe(), ex);
                }
            }
        }

        trip.setTotalSeats(totalSeats);
        tripRepo.save(trip);
    }

    // ── API 2: POST /v2/train/seatByTrainCar ─────────────────────────────────────

    private VexereSeatDetailResponse callSeatDetailApi(String token, String bookingCode,
            Long trainId, Long toaId, long fromStId, long toStId, LocalDate date, int soChoTrong) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type",             "depart");
        body.put("DMTauId",          trainId);
        body.put("DMToaVLId",        toaId);
        body.put("BookingCode",      bookingCode);
        body.put("from",             fromStId);
        body.put("to",               toStId);
        body.put("date",             date.toString());
        body.put("seatFeAvailable",  soChoTrong);

        String queryParam = "?bookingCode=" + bookingCode + "&isShowMinPrice=true";

        String raw = vexereWebClient.post()
                .uri("/v2/train/seatByTrainCar" + queryParam)
                .contentType(MediaType.APPLICATION_JSON)
                .headers(headers -> {
                    if (token != null && !token.isBlank())
                        headers.set("Authorization", "Bearer " + token);
                    headers.set("origin-request-id",      "FE_NEXTJS_" + System.currentTimeMillis() + "_SEAT");
                    headers.set("origin-request-product", "FE_NEXTJS");
                })
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        log.info("=== SEAT DETAIL RAW (toa {}): {}", toaId,
                raw != null && raw.length() > 600 ? raw.substring(0, 600) + "..." : raw);

        try {
            return objectMapper.readValue(raw, VexereSeatDetailResponse.class);
        } catch (Exception e) {
            log.error("=== SEAT DETAIL PARSE FAILED toa {}: {}", toaId, e.getMessage());
            return null;
        }
    }

    /** Parse danh sách TripSeat từ response API 2. */
    private List<TripSeat> parseSeatsFromApi2(TripCarriage carriage, String carriageType,
                                               VexereSeatDetailResponse detail) {
        List<TripSeat> seats = new ArrayList<>();

        List<VexereSeatDetailResponse.CoachSeatTemplate> templates =
                detail.getData().getCoachSeatTemplate();
        if (templates == null) return seats;

        for (VexereSeatDetailResponse.CoachSeatTemplate coach : templates) {
            if (coach.getSeats() == null) continue;

            int coachNum = coach.getCoachNum() != null ? coach.getCoachNum() : 1;
            String berthPos = mapCoachNumToBerth(carriageType, coachNum);

            for (VexereSeatDetailResponse.Seat seat : coach.getSeats()) {
                String seatCode = seat.getSeatCode();

                // Bỏ qua hành lang và bàn
                if ("HL".equals(seatCode) || (seatCode != null && seatCode.startsWith("B")))
                    continue;

                VexereSeatDetailResponse.TrainData td = seat.getTrainData();
                if (td == null || td.getChoSo() == null) continue;

                String seatStatus = "available";
                if (td.getStatus() != null && td.getStatus().getStatus() != null
                        && td.getStatus().getStatus() == 3) {
                    seatStatus = "booked";
                }

                long price = 0L;
                if (td.getGiaVe() != null) price = td.getGiaVe() * 1000L;

                // compartmentNo: dùng row trong template (= vị trí khoang)
                Integer compartmentNo = ("seat".equals(carriageType)) ? null : seat.getRow();

                seats.add(TripSeat.builder()
                        .tripCarriage(carriage)
                        .seatNumber(td.getChoSo().toString())
                        .compartmentNo(compartmentNo)
                        .berthPosition(berthPos)
                        .gridRow(seat.getRow())
                        .gridCol(seat.getCol())
                        .seatCode(seatCode)
                        .loaiCho(td.getLoaiCho())
                        .price(price)
                        .status(seatStatus)
                        .build());
            }
        }
        return seats;
    }

    /** Map coach_num → berthPosition theo loại toa. */
    private String mapCoachNumToBerth(String carriageType, int coachNum) {
        return switch (carriageType) {
            case "sleeper_2" -> coachNum == 1 ? "lower" : "upper";
            case "sleeper_3" -> switch (coachNum) {
                case 1 -> "lower";
                case 2 -> "middle";
                default -> "upper";
            };
            default -> "seat";
        };
    }

    /** Lấy numeric Vexere station ID: từ entity trước, fallback static map. */
    private long getVexereStationId(TrainStation station) {
        if (station.getVexereStationId() != null && station.getVexereStationId() > 0)
            return station.getVexereStationId();
        return VEXERE_STATION_ID.getOrDefault(station.getVexereCode(), 0L);
    }

    // ── Fallback: tự sinh ghế khi API 2 không khả dụng ──────────────────────────

    private List<TripSeat> generateSeats(TripCarriage carriage, int total) {
        List<TripSeat> seats = new ArrayList<>();
        switch (carriage.getCarriageType()) {
            case "seat" -> {
                for (int i = 1; i <= total; i++)
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(String.format("%02d", i)).berthPosition("seat").build());
            }
            case "sleeper_3" -> {
                int khoang = total > 0 ? total / 6 : 0;
                for (int k = 1; k <= khoang; k++) {
                    String p = String.format("%02d", k);
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L1").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L2").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-M1").compartmentNo(k).berthPosition("middle").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-M2").compartmentNo(k).berthPosition("middle").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U1").compartmentNo(k).berthPosition("upper").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U2").compartmentNo(k).berthPosition("upper").build());
                }
            }
            case "sleeper_2" -> {
                int khoang = total > 0 ? total / 4 : 0;
                for (int k = 1; k <= khoang; k++) {
                    String p = String.format("%02d", k);
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L1").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L2").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U1").compartmentNo(k).berthPosition("upper").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U2").compartmentNo(k).berthPosition("upper").build());
                }
            }
        }
        return seats;
    }

    /** Trích số ghế thực tế từ tên model toa: A64LV→64, An28LMV→28, Bn42LM→42. */
    private int parseTotalSeatsFromModel(String toaXe) {
        if (toaXe == null) return 0;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d+").matcher(toaXe);
        if (m.find()) {
            try { return Integer.parseInt(m.group()); } catch (Exception e) { /* fall through */ }
        }
        return 0;
    }

    private void savePrices(TrainTrip trip, TrainStation from, TrainStation to,
                            String carriageType, String nhom, Map<String, List<Long>> groupPrices) {
        List<Long> prices = groupPrices.getOrDefault(nhom, List.of());
        if (prices.isEmpty()) return;

        List<String[]> berthPrices = new ArrayList<>();
        switch (carriageType) {
            case "seat"      -> berthPrices.add(new String[]{"seat",   prices.get(0).toString()});
            case "sleeper_3" -> {
                if (prices.size() > 0) berthPrices.add(new String[]{"lower",  prices.get(0).toString()});
                if (prices.size() > 1) berthPrices.add(new String[]{"middle", prices.get(1).toString()});
                if (prices.size() > 2) berthPrices.add(new String[]{"upper",  prices.get(2).toString()});
            }
            case "sleeper_2" -> {
                if (prices.size() > 0) berthPrices.add(new String[]{"lower", prices.get(0).toString()});
                if (prices.size() > 1) berthPrices.add(new String[]{"upper", prices.get(1).toString()});
            }
        }

        for (String[] bp : berthPrices) {
            try {
                log.info("=== Saving price: trip_id={} from={} to={} type={} berth={} price={}",
                        trip.getId(), from.getCode(), to.getCode(), carriageType, bp[0], bp[1]);
                priceRepo.findByKey(trip.getId(), from.getId(), to.getId(), carriageType, bp[0])
                        .ifPresentOrElse(
                            existing -> {
                                existing.setPrice(new BigDecimal(bp[1]));
                                priceRepo.save(existing);
                            },
                            () -> priceRepo.save(TripSegmentPrice.builder()
                                    .trip(trip).fromStation(from).toStation(to)
                                    .carriageType(carriageType).berthPosition(bp[0])
                                    .price(new BigDecimal(bp[1]))
                                    .build())
                        );
            } catch (Exception ignored) {}
        }
    }
}
