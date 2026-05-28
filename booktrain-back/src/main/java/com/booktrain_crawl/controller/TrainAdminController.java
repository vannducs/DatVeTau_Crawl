package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;
import com.booktrain_crawl.service.TripService;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TrainAdminController {

    private final TrainRepository        trainRepo;
    private final TrainTripRepository    tripRepo;
    private final SeatBookingRepository  seatBookingRepo;
    private final TrainStationRepository stationRepo;
    private final AdminLogRepository     adminLogRepo;
    private final UserRepository         userRepo;
    private final TripService            tripService;

    private boolean hasActiveTrip(Integer trainId) {
        return tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(trainId, "open", OffsetDateTime.now());
    }

    private Integer getAdminId(UserDetails u) {
        return userRepo.findByEmail(u.getUsername()).map(User::getId).orElse(null);
    }

    // ─── TRAIN CRUD ───────────────────────────────────────────────────────────────

    @GetMapping("/trains")
    public ResponseEntity<List<Map<String, Object>>> listTrains() {
        List<Train> trains = trainRepo.findAll();
        List<Map<String, Object>> result = trains.stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              t.getId());
            m.put("train_code",      t.getTrainCode());
            m.put("train_name",      t.getTrainName());
            m.put("train_type",      "express");
            m.put("status",          t.getStatus());
            m.put("carriage_count",  0);
            m.put("has_active_trip", hasActiveTrip(t.getId()));
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/trains/{trainId}")
    public ResponseEntity<?> trainDetail(@PathVariable Integer trainId) {
        Train train = trainRepo.findById(trainId).orElse(null);
        if (train == null) return ResponseEntity.notFound().build();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",         train.getId());
        result.put("train_code", train.getTrainCode());
        result.put("train_name", train.getTrainName());
        result.put("train_type", "express");
        result.put("status",     train.getStatus());
        result.put("carriages",  List.of());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trains")
    public ResponseEntity<?> createTrain(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String trainCode = (String) body.get("trainCode");
        String trainName = (String) body.get("trainName");

        if (trainCode == null || trainCode.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Mã tàu không được trống"));
        if (trainRepo.existsByTrainCode(trainCode))
            return ResponseEntity.badRequest().body(Map.of("message", "Mã tàu '" + trainCode + "' đã tồn tại"));

        Train train = Train.builder()
                .trainCode(trainCode.toUpperCase())
                .trainName(trainName)
                .status("active")
                .build();
        train = trainRepo.save(train);

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(getAdminId(userDetails))
                    .action("CREATE_TRAIN").targetType("train").targetId(train.getId())
                    .detail("Tạo tàu " + trainCode).build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("success", true, "id", train.getId(), "message", "Tạo tàu thành công"));
    }

    @PutMapping("/trains/{trainId}")
    public ResponseEntity<?> updateTrain(
            @PathVariable Integer trainId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        Train train = trainRepo.findById(trainId).orElse(null);
        if (train == null) return ResponseEntity.notFound().build();
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đang có chuyến hoạt động"));

        if (body.containsKey("trainName")) train.setTrainName((String) body.get("trainName"));
        if (body.containsKey("status"))    train.setStatus((String) body.get("status"));
        trainRepo.save(train);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thành công"));
    }

    @DeleteMapping("/trains/{trainId}")
    @Transactional
    public ResponseEntity<?> deleteTrain(
            @PathVariable Integer trainId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Train train = trainRepo.findById(trainId).orElse(null);
        if (train == null) return ResponseEntity.notFound().build();

        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Tàu đang có chuyến hoạt động, không thể xóa. Hãy hủy kế hoạch khởi hành trước."));

        List<TrainTrip> allTrips = tripRepo.findByTrainId(trainId);
        if (!allTrips.isEmpty()) {
            List<Integer> tripIds = allTrips.stream().map(TrainTrip::getId).toList();
            if (seatBookingRepo.existsByTripIdIn(tripIds)) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Tàu có lịch sử đặt vé, không thể xóa. Hãy hủy các đơn hàng liên quan trước."));
            }
            tripRepo.deleteAll(allTrips);
        }

        trainRepo.delete(train);
        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa tàu thành công"));
    }

    // ─── TRIP STATUS ─────────────────────────────────────────────────────────────

    @GetMapping("/trains/{trainId}/trip-status")
    public ResponseEntity<?> tripStatus(@PathVariable Integer trainId) {
        boolean active = hasActiveTrip(trainId);
        Optional<TrainTrip> latest = tripRepo.findTopByTrainIdOrderByDepartureDatetimeDesc(trainId);

        OffsetDateTime now      = OffsetDateTime.now();
        OffsetDateTime earliest = now.plusDays(1);
        OffsetDateTime latest14 = now.plusDays(14);

        if (latest.isPresent()) {
            OffsetDateTime lastArr = latest.get().getArrivalDatetime();
            if (lastArr != null && lastArr.isAfter(earliest)) earliest = lastArr.plusDays(1);
        }

        return ResponseEntity.ok(Map.of(
                "hasActiveTrip",       active,
                "earliestNewTripDate", earliest.toLocalDate().toString(),
                "latestAllowedDate",   latest14.toLocalDate().toString()));
    }

    // ─── AVAILABLE STATIONS ───────────────────────────────────────────────────────

    @GetMapping("/trains/{trainId}/available-stations")
    public ResponseEntity<?> availableStations(@PathVariable Integer trainId) {
        List<TrainStation> stations = stationRepo.findAllByOrderByOrderIndexAsc();
        List<Map<String, Object>> result = stations.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("location_id",   s.getId());
            m.put("location_name", s.getName());
            m.put("stop_order",    s.getOrderIndex());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ─── SCHEDULE DURATION ────────────────────────────────────────────────────────

    @GetMapping("/trains/{trainId}/schedule-duration")
    public ResponseEntity<?> scheduleDuration(
            @PathVariable Integer trainId,
            @RequestParam Integer originId,
            @RequestParam Integer destinationId) {
        try {
            int duration = tripService.calcTotalDurationMinutes(originId, destinationId);
            return ResponseEntity.ok(Map.of("durationMinutes", duration, "found", duration > 0));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("durationMinutes", 0, "found", false));
        }
    }
}
