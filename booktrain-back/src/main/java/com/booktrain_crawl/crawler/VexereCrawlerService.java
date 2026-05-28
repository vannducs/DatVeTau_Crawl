package com.booktrain_crawl.crawler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private static final Map<String, String> GROUP_TO_TYPE = Map.of(
            "NGM", "seat",
            "NAC", "sleeper_3",
            "NAM", "sleeper_2"
    );

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    /** Result returned per crawlAndSave call — used by CrawlerController.triggerAll */
    public record CrawlResult(int tripsFound, int tripsSaved, int totalCarriages, int totalSeats, String status) {}

    /**
     * Crawl một tuyến một ngày.
     * @param vexereToken Bearer token để gửi lên Vexere API; null → không gửi header Authorization
     */
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

            // Build and log the full URL before calling
            String url = "https://internal-vroute-cmc.vexere.com" + uri;
            log.info("=== CALLING URL: {}", url);
            log.info("=== TOKEN: {}", token != null ? token.substring(0, Math.min(30, token.length())) + "..." : "NULL");

            // Receive as String first, log raw, then parse
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

                // Count carriages/seats from API data (used for both new and backfill paths)
                int itemCarriages = item.getListToaXe() != null ? item.getListToaXe().size() : 0;
                int itemSeats     = item.getListToaXe() != null
                        ? item.getListToaXe().stream().mapToInt(t -> t.getSoChoCon() != null ? t.getSoChoCon() : 0).sum()
                        : 0;

                // Check if trip already exists by vexereIdIndex
                Optional<TrainTrip> existingOpt = (item.getIdIndex() != null)
                        ? tripRepo.findByVexereIdIndex(item.getIdIndex())
                        : Optional.empty();

                if (existingOpt.isPresent()) {
                    TrainTrip existing = existingOpt.get();
                    long carriageCount = carriageRepo.countByTripId(existing.getId());
                    if (carriageCount == 0) {
                        // Trip exists but carriages were never saved — backfill now
                        log.info("[Crawl] Trip {} (id={}) exists but missing carriages — backfilling",
                                item.getIdIndex(), existing.getId());
                        try {
                            saveCarriagesForTrip(existing, item, fromStation, toStation);
                            totalCarriages += itemCarriages;
                            totalSeats     += itemSeats;
                        } catch (Exception e) {
                            log.error("=== Carriage save error for trip {}: ", item.getIdIndex(), e);
                            if (!"partial".equals(status)) status = "partial";
                        }
                    } else {
                        log.info("[Crawl] Trip {} already has {} carriages — skipping",
                                item.getIdIndex(), carriageCount);
                    }
                    continue;
                }

                // New trip — create trip + carriages
                try {
                    saveTripData(item, fromStation, toStation, date);
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

    @Transactional
    public void saveTripData(VexereApiResponse.TripData item,
                             TrainStation fromStation, TrainStation toStation, LocalDate date) {
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

        saveCarriagesForTrip(trip, item, fromStation, toStation);
    }

    /** Lưu toa/ghế/giá cho một trip (dùng cho cả trip mới và backfill trip cũ thiếu carriage). */
    @Transactional
    public void saveCarriagesForTrip(TrainTrip trip, VexereApiResponse.TripData item,
                                     TrainStation from, TrainStation to) {
        log.info("=== TRIP saved id={}, listToaXe size={}", trip.getId(),
                item.getListToaXe() != null ? item.getListToaXe().size() : "NULL");

        Map<String, List<Long>> groupPrices = new HashMap<>();
        if (item.getSeatGroupStatus() != null) {
            for (VexereApiResponse.SeatGroupStatus sg : item.getSeatGroupStatus()) {
                if (sg.getType() != null && sg.getPrices() != null)
                    groupPrices.put(sg.getType(), sg.getPrices());
            }
        }

        int totalSeats = 0;
        Set<String> savedPriceKeys = new HashSet<>();

        List<VexereApiResponse.ToaXe> listToa = item.getListToaXe();
        if (listToa != null) {
            int order = 1;
            for (VexereApiResponse.ToaXe toa : listToa) {
                String nhom         = toa.getNhomChoWeb() != null ? toa.getNhomChoWeb() : "NGM";
                String carriageType = GROUP_TO_TYPE.getOrDefault(nhom, "seat");
                int soChoCon   = toa.getSoChoCon()   != null ? toa.getSoChoCon()   : 0;
                int soChoTrong = toa.getSoChoTrong() != null ? toa.getSoChoTrong() : 0;

                log.info("=== Saving carriage: model={} type={} soChoCon={}", toa.getToaXe(), carriageType, soChoCon);

                TripCarriage carriage = carriageRepo.save(TripCarriage.builder()
                        .trip(trip)
                        .carriageOrder(order++)
                        .carriageModel(toa.getToaXe())
                        .carriageName(toa.getToaXeDienGiai())
                        .carriageType(carriageType)
                        .seatGroup(nhom)
                        .totalSeats(soChoCon)
                        .availableSeats(soChoTrong)
                        .minPrice(toa.getMinPrice())
                        .vexereId(toa.getId())
                        .build());

                seatRepo.saveAll(generateSeats(carriage, soChoCon));
                totalSeats += soChoCon;

                String priceKey = carriageType;
                if (!savedPriceKeys.contains(priceKey)) {
                    savedPriceKeys.add(priceKey);
                    savePrices(trip, from, to, carriageType, nhom, groupPrices);
                }
            }
        }

        trip.setTotalSeats(totalSeats);
        tripRepo.save(trip);
    }

    private List<TripSeat> generateSeats(TripCarriage carriage, int total) {
        List<TripSeat> seats = new ArrayList<>();
        switch (carriage.getCarriageType()) {
            case "seat" -> {
                for (int i = 1; i <= total; i++)
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(String.format("%02d", i)).berthPosition("seat").build());
            }
            case "sleeper_3" -> {
                int khoang = total > 0 ? total / 3 : 0;
                for (int k = 1; k <= khoang; k++) {
                    String p = String.format("%02d", k);
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-M").compartmentNo(k).berthPosition("middle").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U").compartmentNo(k).berthPosition("upper").build());
                }
            }
            case "sleeper_2" -> {
                int khoang = total > 0 ? total / 2 : 0;
                for (int k = 1; k <= khoang; k++) {
                    String p = String.format("%02d", k);
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-L").compartmentNo(k).berthPosition("lower").build());
                    seats.add(TripSeat.builder().tripCarriage(carriage)
                            .seatNumber(p+"-U").compartmentNo(k).berthPosition("upper").build());
                }
            }
        }
        return seats;
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
                priceRepo.save(TripSegmentPrice.builder()
                        .trip(trip).fromStation(from).toStation(to)
                        .carriageType(carriageType).berthPosition(bp[0])
                        .price(new BigDecimal(bp[1]))
                        .build());
            } catch (Exception ignored) {}
        }
    }
}
