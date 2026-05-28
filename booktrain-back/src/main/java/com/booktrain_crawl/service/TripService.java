package com.booktrain_crawl.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.booktrain_crawl.dto.SeatDTO;
import com.booktrain_crawl.dto.TripResultDTO;
import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TrainStationRepository stationRepo;
    private final TrainSegmentRepository segmentRepo;
    private final TrainTripRepository    tripRepo;
    private final TripCarriageRepository carriageRepo;
    private final TripSeatRepository     seatRepo;
    private final TripSegmentPriceRepository priceRepo;
    private final SeatBookingRepository  bookingRepo;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ─── Duration helpers ────────────────────────────────────────────────────────

    private int calcMinutesFromTripStart(TrainTrip trip, int targetOrderIndex,
                                         List<TrainStation> allStations) {
        int tripFromIdx = trip.getFromStation().getOrderIndex();
        int tripToIdx   = trip.getToStation().getOrderIndex();
        boolean northToSouth = tripFromIdx < tripToIdx;

        List<TrainStation> sorted = allStations.stream()
                .sorted(Comparator.comparingInt(TrainStation::getOrderIndex))
                .toList();

        int total = 0;
        if (northToSouth) {
            for (int i = 0; i < sorted.size() - 1; i++) {
                TrainStation a = sorted.get(i);
                TrainStation b = sorted.get(i + 1);
                if (a.getOrderIndex() >= tripFromIdx && b.getOrderIndex() <= targetOrderIndex) {
                    Optional<TrainSegment> seg =
                            segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                    if (seg.isPresent()) total += seg.get().getDurationMinutes();
                }
            }
        } else {
            List<TrainStation> reversed = sorted.stream()
                    .sorted(Comparator.comparingInt(TrainStation::getOrderIndex).reversed())
                    .toList();
            for (int i = 0; i < reversed.size() - 1; i++) {
                TrainStation a = reversed.get(i);
                TrainStation b = reversed.get(i + 1);
                if (a.getOrderIndex() <= tripFromIdx && b.getOrderIndex() >= targetOrderIndex) {
                    Optional<TrainSegment> seg =
                            segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                    if (seg.isPresent()) total += seg.get().getDurationMinutes();
                }
            }
        }
        return total;
    }

    // ─── Search ─────────────────────────────────────────────────────────────────

    public List<TripResultDTO> searchTrips(Integer fromStationId, Integer toStationId, LocalDate date) {
        TrainStation fromSt = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toSt   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        if (fromSt.getOrderIndex().equals(toSt.getOrderIndex()))
            throw new RuntimeException("Ga đi và ga đến phải khác nhau");

        List<TrainStation> allStations = stationRepo.findAllByOrderByOrderIndexAsc();
        List<TrainTrip> trips = tripRepo.findOpenTripsForSegment(
                fromSt.getOrderIndex(), toSt.getOrderIndex(), date);

        return trips.stream()
                .map(trip -> buildTripResult(trip, fromSt, toSt, allStations))
                .collect(Collectors.toList());
    }

    public TripResultDTO getTripById(Integer tripId, Integer fromStationId, Integer toStationId) {
        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        TrainStation fromSt = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toSt   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));
        List<TrainStation> allStations = stationRepo.findAllByOrderByOrderIndexAsc();
        return buildTripResult(trip, fromSt, toSt, allStations);
    }

    private TripResultDTO buildTripResult(TrainTrip trip, TrainStation fromSt,
                                          TrainStation toSt, List<TrainStation> allStations) {
        int minsToBoard  = calcMinutesFromTripStart(trip, fromSt.getOrderIndex(), allStations);
        int minsToAlight = calcMinutesFromTripStart(trip, toSt.getOrderIndex(),   allStations);

        OffsetDateTime boardTime  = trip.getDepartureDatetime().plusMinutes(minsToBoard);
        OffsetDateTime alightTime = trip.getDepartureDatetime().plusMinutes(minsToAlight);
        int durationMins = minsToAlight - minsToBoard;
        String durationStr = (durationMins / 60) + "h " + (durationMins % 60) + "p";
        boolean nextDay = !boardTime.toLocalDate().equals(alightTime.toLocalDate());

        // Lấy carriages của trip này
        List<TripCarriage> tripCarriages = carriageRepo.findByTripIdOrderByCarriageOrder(trip.getId());

        // Lấy giá theo segment
        List<TripSegmentPrice> prices =
                priceRepo.findByTripIdAndFromStationIdAndToStationId(
                        trip.getId(), fromSt.getId(), toSt.getId());

        // Lấy seat ids đã booked
        Set<Long> bookedSeatIds = bookingRepo.findConfirmedByTripId(trip.getId()).stream()
                .filter(b -> b.getFromOrderIndex() < toSt.getOrderIndex()
                          && b.getToOrderIndex()   > fromSt.getOrderIndex())
                .map(b -> b.getTripSeat().getId())
                .collect(Collectors.toSet());

        List<TripResultDTO.CarriageSummaryDTO> summaries = tripCarriages.stream().map(tc -> {
            int totalSeats  = tc.getTotalSeats();
            int bookedCount = (int) seatRepo.findByTripCarriageIdOrderBySeatNumber(tc.getId()).stream()
                    .filter(s -> bookedSeatIds.contains(s.getId())).count();
            int available = totalSeats - bookedCount;

            Long minPrice = prices.stream()
                    .filter(p -> p.getCarriageType().equals(tc.getCarriageType()))
                    .map(p -> p.getPrice().longValue())
                    .min(Long::compareTo)
                    .orElseGet(() -> tc.getMinPrice() != null ? tc.getMinPrice() : 0L);

            return TripResultDTO.CarriageSummaryDTO.builder()
                    .carriageOrder(tc.getCarriageOrder())
                    .carriageType(tc.getCarriageType())
                    .carriageName(tc.getCarriageName())
                    .isVip(false)
                    .amenities(null)
                    .availableSeats(available)
                    .totalSeats(totalSeats)
                    .minPrice(minPrice)
                    .build();
        }).collect(Collectors.toList());

        return TripResultDTO.builder()
                .tripId(trip.getId())
                .trainCode(trip.getTrain().getTrainCode())
                .trainName(trip.getTrain().getTrainName())
                .fromStationName(fromSt.getName())
                .toStationName(toSt.getName())
                .fromStationCode(fromSt.getCode())
                .toStationCode(toSt.getCode())
                .boardTime(boardTime.format(TIME_FMT))
                .alightTime(alightTime.format(TIME_FMT))
                .boardDate(boardTime.format(DATE_FMT))
                .alightDate(alightTime.format(DATE_FMT))
                .duration(durationStr)
                .nextDay(nextDay)
                .carriageSummary(summaries)
                .build();
    }

    // ─── Seat map ────────────────────────────────────────────────────────────────

    public Map<Integer, List<SeatDTO>> getSeatsForTrip(
            Integer tripId, Integer fromStationId, Integer toStationId) {

        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        TrainStation fromSt = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toSt   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        List<TripCarriage> tripCarriages = carriageRepo.findByTripIdOrderByCarriageOrder(tripId);

        List<TripSegmentPrice> prices =
                priceRepo.findByTripIdAndFromStationIdAndToStationId(tripId, fromStationId, toStationId);

        Set<Long> bookedSeatIds = bookingRepo.findConfirmedByTripId(tripId).stream()
                .filter(b -> b.getFromOrderIndex() < toSt.getOrderIndex()
                          && b.getToOrderIndex()   > fromSt.getOrderIndex())
                .map(b -> b.getTripSeat().getId())
                .collect(Collectors.toSet());

        Map<Integer, List<SeatDTO>> result = new LinkedHashMap<>();

        for (TripCarriage tc : tripCarriages) {
            List<TripSeat> seats = seatRepo.findByTripCarriageIdOrderBySeatNumber(tc.getId());

            Map<String, Long> priceByBerth = prices.stream()
                    .filter(p -> p.getCarriageType().equals(tc.getCarriageType()))
                    .collect(Collectors.toMap(
                            TripSegmentPrice::getBerthPosition,
                            p -> p.getPrice().longValue(),
                            (a, b) -> a));

            List<SeatDTO> dtos = seats.stream().map(s -> SeatDTO.builder()
                    .id(s.getId().intValue())
                    .seatNumber(s.getSeatNumber())
                    .compartmentNo(s.getCompartmentNo())
                    .berthPosition(s.getBerthPosition())
                    .carriageId(tc.getId().intValue())
                    .carriageOrder(tc.getCarriageOrder())
                    .carriageType(tc.getCarriageType())
                    .isVip(false)
                    .status(bookedSeatIds.contains(s.getId()) ? "booked" : "available")
                    .price(priceByBerth.getOrDefault(s.getBerthPosition(), 0L))
                    .build()).collect(Collectors.toList());

            result.put(tc.getCarriageOrder(), dtos);
        }
        return result;
    }

    // ─── Trip carriages for new endpoint ────────────────────────────────────────

    public List<Map<String, Object>> getTripCarriages(Integer tripId) {
        return carriageRepo.findByTripIdOrderByCarriageOrder(tripId).stream().map(tc -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",             tc.getId());
            m.put("carriageOrder",  tc.getCarriageOrder());
            m.put("carriageModel",  tc.getCarriageModel());
            m.put("carriageName",   tc.getCarriageName());
            m.put("carriageType",   tc.getCarriageType());
            m.put("seatGroup",      tc.getSeatGroup());
            m.put("totalSeats",     tc.getTotalSeats());
            m.put("availableSeats", tc.getAvailableSeats());
            m.put("minPrice",       tc.getMinPrice());
            return m;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getCarriageSeats(Long carriageId) {
        return seatRepo.findByTripCarriageIdOrderBySeatNumber(carriageId).stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",             s.getId());
            m.put("seatNumber",     s.getSeatNumber());
            m.put("compartmentNo",  s.getCompartmentNo());
            m.put("berthPosition",  s.getBerthPosition());
            return m;
        }).collect(Collectors.toList());
    }

    // ─── Duration for admin trip creation ───────────────────────────────────────

    public int calcTotalDurationMinutes(Integer fromStationId, Integer toStationId) {
        List<TrainStation> allStations = stationRepo.findAllByOrderByOrderIndexAsc();
        TrainStation from = stationRepo.findById(fromStationId).orElseThrow();
        TrainStation to   = stationRepo.findById(toStationId).orElseThrow();
        int fromIdx = from.getOrderIndex();
        int toIdx   = to.getOrderIndex();
        int total   = 0;

        if (fromIdx < toIdx) {
            for (int i = 0; i < allStations.size() - 1; i++) {
                TrainStation a = allStations.get(i);
                TrainStation b = allStations.get(i + 1);
                if (a.getOrderIndex() >= fromIdx && b.getOrderIndex() <= toIdx) {
                    Optional<TrainSegment> seg =
                            segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                    if (seg.isPresent()) total += seg.get().getDurationMinutes();
                }
            }
        } else {
            List<TrainStation> reversed = allStations.stream()
                    .sorted(Comparator.comparingInt(TrainStation::getOrderIndex).reversed()).toList();
            for (int i = 0; i < reversed.size() - 1; i++) {
                TrainStation a = reversed.get(i);
                TrainStation b = reversed.get(i + 1);
                if (a.getOrderIndex() <= fromIdx && b.getOrderIndex() >= toIdx) {
                    Optional<TrainSegment> seg =
                            segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                    if (seg.isPresent()) total += seg.get().getDurationMinutes();
                }
            }
        }
        return total;
    }
}
