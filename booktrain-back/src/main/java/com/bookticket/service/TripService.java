package com.bookticket.service;

import com.bookticket.dto.SeatDTO;
import com.bookticket.dto.TripResultDTO;
import com.bookticket.entity.*;
import com.bookticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
    private final TrainTripRepository tripRepo;
    private final TrainCarriageAssignmentRepository assignmentRepo;
    private final TripSegmentPriceRepository priceRepo;
    private final SeatBookingRepository bookingRepo;
    private final SeatRepository seatRepo;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ─── Tính tổng duration (phút) giữa 2 ga liên tiếp theo hướng ────────────
    // Tổng hợp các segment từ fromOrderIndex → toOrderIndex
    private int calcDurationMinutes(List<TrainStation> allStations,
                                    int fromOrderIndex, int toOrderIndex) {
        List<TrainStation> sorted = allStations.stream()
                .sorted(Comparator.comparingInt(TrainStation::getOrderIndex))
                .toList();

        int total = 0;
        // Duyệt các segment liên tiếp từ from → to
        for (int i = 0; i < sorted.size() - 1; i++) {
            TrainStation a = sorted.get(i);
            TrainStation b = sorted.get(i + 1);
            // Chỉ cộng segment nằm trong đoạn [fromOrderIndex, toOrderIndex)
            if (a.getOrderIndex() >= fromOrderIndex && b.getOrderIndex() <= toOrderIndex) {
                Optional<TrainSegment> seg = segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                if (seg.isEmpty()) {
                    // Thử chiều ngược lại (cho tàu Nam→Bắc)
                    seg = segmentRepo.findByFromStationIdAndToStationId(b.getId(), a.getId());
                }
                seg.ifPresent(s -> {});
                if (seg.isPresent()) total += seg.get().getDurationMinutes();
            }
        }
        return total;
    }

    // Tính duration từ trip.fromStation.orderIndex → targetOrderIndex
    private int calcMinutesFromTripStart(TrainTrip trip, int targetOrderIndex,
                                         List<TrainStation> allStations) {
        int tripFromIdx = trip.getFromStation().getOrderIndex();
        int tripToIdx   = trip.getToStation().getOrderIndex();

        List<TrainStation> sorted = allStations.stream()
                .sorted(Comparator.comparingInt(TrainStation::getOrderIndex))
                .toList();

        // Nếu tàu đi Bắc→Nam (fromIdx < toIdx)
        boolean northToSouth = tripFromIdx < tripToIdx;

        int total = 0;
        if (northToSouth) {
            for (int i = 0; i < sorted.size() - 1; i++) {
                TrainStation a = sorted.get(i);
                TrainStation b = sorted.get(i + 1);
                if (a.getOrderIndex() >= tripFromIdx && b.getOrderIndex() <= targetOrderIndex) {
                    segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId())
                            .ifPresent(s -> {});
                    Optional<TrainSegment> seg =
                            segmentRepo.findByFromStationIdAndToStationId(a.getId(), b.getId());
                    if (seg.isPresent()) total += seg.get().getDurationMinutes();
                }
            }
        } else {
            // Nam→Bắc: orderIndex giảm dần
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

    // ─── Tìm kiếm chuyến ────────────────────────────────────────────────────
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

        return trips.stream().map(trip -> buildTripResult(trip, fromSt, toSt, allStations))
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
        // Phút từ điểm xuất phát của tàu đến ga khách lên và ga khách xuống
        int minsToBoard  = calcMinutesFromTripStart(trip, fromSt.getOrderIndex(), allStations);
        int minsToAlight = calcMinutesFromTripStart(trip, toSt.getOrderIndex(), allStations);

        OffsetDateTime boardTime  = trip.getDepartureDatetime().plusMinutes(minsToBoard);
        OffsetDateTime alightTime = trip.getDepartureDatetime().plusMinutes(minsToAlight);

        int durationMins = minsToAlight - minsToBoard;
        String durationStr = (durationMins / 60) + "h " + (durationMins % 60) + "p";

        boolean nextDay = !boardTime.toLocalDate().equals(alightTime.toLocalDate());

        // Toa + giá
        List<TrainCarriageAssignment> assignments =
                assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trip.getTrain().getId());

        List<TripSegmentPrice> prices =
                priceRepo.findByTripIdAndFromStationIdAndToStationId(
                        trip.getId(), fromSt.getId(), toSt.getId());

        // Count bookings cho đoạn này
        List<SeatBooking> confirmedBookings = bookingRepo.findConfirmedByTripId(trip.getId())
                .stream()
                .filter(b -> b.getFromOrderIndex() < toSt.getOrderIndex()
                          && b.getToOrderIndex() > fromSt.getOrderIndex())
                .toList();
        Set<Integer> bookedSeatIds = confirmedBookings.stream()
                .map(b -> b.getSeat().getId())
                .collect(Collectors.toSet());

        List<TripResultDTO.CarriageSummaryDTO> summaries = assignments.stream().map(a -> {
            Carriage c = a.getCarriage();
            List<Seat> seats = seatRepo.findByCarriageId(c.getId());
            int total = seats.size();
            int booked = (int) seats.stream().filter(s -> bookedSeatIds.contains(s.getId())).count();
            int available = total - booked;

            // Min price cho toa này
            Long minPrice = prices.stream()
                    .filter(p -> p.getCarriageType().equals(c.getCarriageType()))
                    .map(p -> p.getPrice().longValue())
                    .min(Long::compareTo)
                    .orElse(0L);

            return TripResultDTO.CarriageSummaryDTO.builder()
                    .carriageOrder(a.getCarriageOrder())
                    .carriageType(c.getCarriageType())
                    .isVip(c.getIsVip())
                    .amenities(c.getAmenities())
                    .availableSeats(available)
                    .totalSeats(total)
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

    // ─── Sơ đồ ghế ──────────────────────────────────────────────────────────
    public Map<Integer, List<SeatDTO>> getSeatsForTrip(
            Integer tripId, Integer fromStationId, Integer toStationId) {

        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        TrainStation fromSt = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toSt   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        List<TrainCarriageAssignment> assignments =
                assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trip.getTrain().getId());

        List<TripSegmentPrice> prices =
                priceRepo.findByTripIdAndFromStationIdAndToStationId(
                        tripId, fromStationId, toStationId);

        // Lấy ghế đã đặt trong đoạn này
        Set<Integer> bookedSeatIds = bookingRepo.findConfirmedByTripId(tripId).stream()
                .filter(b -> b.getFromOrderIndex() < toSt.getOrderIndex()
                          && b.getToOrderIndex() > fromSt.getOrderIndex())
                .map(b -> b.getSeat().getId())
                .collect(Collectors.toSet());

        Map<Integer, List<SeatDTO>> result = new LinkedHashMap<>();

        for (TrainCarriageAssignment a : assignments) {
            Carriage c = a.getCarriage();
            List<Seat> seats = seatRepo.findByCarriageIdOrderBySeatNumberAsc(c.getId());

            // Build price lookup: berthPosition → price
            Map<String, Long> priceByBerth = prices.stream()
                    .filter(p -> p.getCarriageType().equals(c.getCarriageType()))
                    .collect(Collectors.toMap(
                            TripSegmentPrice::getBerthPosition,
                            p -> p.getPrice().longValue(),
                            (a1, b) -> a1));

            List<SeatDTO> dtos = seats.stream().map(s -> SeatDTO.builder()
                    .id(s.getId())
                    .seatNumber(s.getSeatNumber())
                    .compartmentNo(s.getCompartmentNo())
                    .berthPosition(s.getBerthPosition())
                    .carriageId(c.getId())
                    .carriageOrder(a.getCarriageOrder())
                    .carriageType(c.getCarriageType())
                    .isVip(c.getIsVip())
                    .status(bookedSeatIds.contains(s.getId()) ? "booked" : "available")
                    .price(priceByBerth.getOrDefault(s.getBerthPosition(), 0L))
                    .build())
                    .collect(Collectors.toList());

            result.put(a.getCarriageOrder(), dtos);
        }
        return result;
    }

    // ─── Tính duration segment cho admin (dùng khi tạo chuyến) ──────────────
    public int calcTotalDurationMinutes(Integer fromStationId, Integer toStationId) {
        List<TrainStation> allStations = stationRepo.findAllByOrderByOrderIndexAsc();
        TrainStation from = stationRepo.findById(fromStationId).orElseThrow();
        TrainStation to   = stationRepo.findById(toStationId).orElseThrow();

        int fromIdx = from.getOrderIndex();
        int toIdx   = to.getOrderIndex();

        int total = 0;
        if (fromIdx < toIdx) {
            // Bắc → Nam
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
            // Nam → Bắc
            List<TrainStation> reversed = allStations.stream()
                    .sorted(Comparator.comparingInt(TrainStation::getOrderIndex).reversed())
                    .toList();
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
