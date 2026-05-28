package com.bookticket.controller;

import com.bookticket.entity.*;
import com.bookticket.repository.*;
import com.bookticket.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TrainAdminController {

    private final TrainRepository                  trainRepo;
    private final TrainCarriageAssignmentRepository assignmentRepo;
    private final SeatRepository                   seatRepo;
    private final CarriageRepository               carriageRepo;
    private final TrainTripRepository              tripRepo;
    private final SeatBookingRepository            seatBookingRepo;
    private final TrainStationRepository           stationRepo;
    private final AdminLogRepository               adminLogRepo;
    private final UserRepository                   userRepo;
    private final TripService                      tripService;

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
            m.put("id",           t.getId());
            m.put("train_code",   t.getTrainCode());
            m.put("train_name",   t.getTrainName());
            m.put("train_type",   "express");
            m.put("status",       t.getStatus());
            m.put("carriage_count", assignmentRepo.countByTrainIdAndUnassignedAtIsNull(t.getId()));
            m.put("has_active_trip", hasActiveTrip(t.getId()));
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/trains/{trainId}")
    public ResponseEntity<?> trainDetail(@PathVariable Integer trainId) {
        Train train = trainRepo.findById(trainId).orElse(null);
        if (train == null) return ResponseEntity.notFound().build();

        List<TrainCarriageAssignment> assignments =
                assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trainId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",         train.getId());
        result.put("train_code", train.getTrainCode());
        result.put("train_name", train.getTrainName());
        result.put("train_type", "express");
        result.put("status",     train.getStatus());

        List<Map<String, Object>> carriages = assignments.stream().map(a -> {
            Carriage c = a.getCarriage();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                    c.getId());
            m.put("carriage_number",       a.getCarriageOrder());
            m.put("carriage_type",         c.getCarriageType());
            m.put("is_vip",                c.getIsVip());
            m.put("amenities",             c.getAmenities());
            m.put("seats_per_compartment", c.getCarriageType().startsWith("sleeper") ? 3 : null);
            m.put("assignment_id",         a.getId());

            List<Map<String, Object>> seats = seatRepo.findByCarriageIdOrderBySeatNumberAsc(c.getId())
                    .stream().map(s -> {
                        Map<String, Object> sm = new LinkedHashMap<>();
                        sm.put("id",             s.getId());
                        sm.put("seat_number",    s.getSeatNumber());
                        sm.put("berth_position", s.getBerthPosition());
                        return sm;
                    }).toList();
            m.put("seats", seats);
            return m;
        }).collect(Collectors.toList());

        result.put("carriages", carriages);
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

        // Chỉ chặn nếu có chuyến đang hoạt động (khởi hành trong tương lai)
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Tàu đang có chuyến hoạt động, không thể xóa. Hãy hủy kế hoạch khởi hành trước."));

        // Kiểm tra xem các chuyến (kể cả đã qua) có đơn hàng chưa
        List<TrainTrip> allTrips = tripRepo.findByTrainId(trainId);
        if (!allTrips.isEmpty()) {
            List<Integer> tripIds = allTrips.stream().map(TrainTrip::getId).toList();
            if (seatBookingRepo.existsByTripIdIn(tripIds)) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Tàu có lịch sử đặt vé, không thể xóa. Hãy hủy các đơn hàng liên quan trước."));
            }
            // Không có booking → xóa các chuyến trước khi xóa tàu
            tripRepo.deleteAll(allTrips);
        }

        // Tháo tất cả toa
        List<TrainCarriageAssignment> assignments = assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trainId);
        for (TrainCarriageAssignment a : assignments) {
            a.setUnassignedAt(OffsetDateTime.now());
            assignmentRepo.save(a);
            Carriage c = a.getCarriage();
            c.setStatus("available");
            carriageRepo.save(c);
        }
        trainRepo.delete(train);

        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa tàu thành công"));
    }

    // ─── CARRIAGE MANAGEMENT (delegated to assignments) ──────────────────────────

    @GetMapping("/trains/{trainId}/carriages")
    public ResponseEntity<List<Map<String, Object>>> trainCarriages(@PathVariable Integer trainId) {
        List<TrainCarriageAssignment> assignments = assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trainId);
        List<Map<String, Object>> result = assignments.stream().map(a -> {
            Carriage c = a.getCarriage();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                    c.getId());
            m.put("carriage_number",       a.getCarriageOrder());
            m.put("carriage_type",         c.getCarriageType());
            m.put("is_vip",                c.getIsVip());
            m.put("amenities",             c.getAmenities());
            m.put("seat_count",            seatRepo.countByCarriageId(c.getId()));
            m.put("seats_per_compartment", c.getCarriageType().startsWith("sleeper") ? 3 : null);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trains/{trainId}/carriages")
    @Transactional
    public ResponseEntity<?> addCarriage(
            @PathVariable Integer trainId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đang có chuyến hoạt động"));

        int count = assignmentRepo.countByTrainIdAndUnassignedAtIsNull(trainId);
        if (count >= 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đã có tối đa 8 toa"));

        // Tạo carriage mới và gắn vào tàu
        String carriageType = (String) body.getOrDefault("carriageType", "seat");
        Boolean isVip       = Boolean.TRUE.equals(body.get("isVip"));
        String amenities    = (String) body.getOrDefault("amenities", "");

        Train train = trainRepo.findById(trainId).orElseThrow();

        long codeSeq = carriageRepo.count() + 1;
        String code  = "C" + String.format("%03d", codeSeq);
        while (carriageRepo.existsByCarriageCode(code)) {
            codeSeq++;
            code = "C" + String.format("%03d", codeSeq);
        }

        Carriage carriage = Carriage.builder()
                .carriageCode(code)
                .carriageType(carriageType)
                .isVip(isVip)
                .amenities(amenities)
                .status("in_use")
                .build();
        carriage = carriageRepo.save(carriage);
        generateSeats(carriage);

        TrainCarriageAssignment assignment = TrainCarriageAssignment.builder()
                .train(train)
                .carriage(carriage)
                .carriageOrder(count + 1)
                .build();
        assignmentRepo.save(assignment);

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(getAdminId(userDetails))
                    .action("ADD_CARRIAGE").targetType("carriage").targetId(carriage.getId())
                    .detail("Thêm toa " + code + " vào tàu " + train.getTrainCode()).build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("success", true, "id", carriage.getId(), "carriageNumber", count + 1));
    }

    @PutMapping("/carriages/{carriageId}")
    @Transactional
    public ResponseEntity<?> updateCarriage(
            @PathVariable Integer carriageId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        Carriage carriage = carriageRepo.findById(carriageId).orElse(null);
        if (carriage == null) return ResponseEntity.notFound().build();

        // Kiểm tra tàu có đang chạy không
        Optional<TrainCarriageAssignment> activeAssign =
                assignmentRepo.findByCarriageIdAndUnassignedAtIsNull(carriageId);
        if (activeAssign.isPresent() && hasActiveTrip(activeAssign.get().getTrain().getId())) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Không thể chỉnh sửa: tàu đang có kế hoạch khởi hành. " +
                    "Vào menu Kế hoạch khởi hành để hủy kế hoạch trước."));
        }

        String newType = body.containsKey("carriageType") ? (String) body.get("carriageType") : carriage.getCarriageType();

        if (!newType.equals(carriage.getCarriageType())) {
            // Xóa ghế cũ, sinh ghế mới
            seatRepo.deleteByCarriageId(carriageId);
            seatRepo.flush();
            carriage.setCarriageType(newType);
            carriageRepo.save(carriage);
            generateSeats(carriage);
        }

        if (body.containsKey("isVip"))    carriage.setIsVip(Boolean.TRUE.equals(body.get("isVip")));
        if (body.containsKey("amenities")) carriage.setAmenities((String) body.get("amenities"));
        carriageRepo.save(carriage);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật toa thành công"));
    }

    @DeleteMapping("/carriages/{carriageId}")
    @Transactional
    public ResponseEntity<?> deleteCarriage(
            @PathVariable Integer carriageId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Carriage carriage = carriageRepo.findById(carriageId).orElse(null);
        if (carriage == null) return ResponseEntity.notFound().build();

        // Kiểm tra tàu đang có chuyến hoạt động không
        assignmentRepo.findByCarriageIdAndUnassignedAtIsNull(carriageId).ifPresent(a -> {
            if (hasActiveTrip(a.getTrain().getId()))
                throw new RuntimeException("Tàu đang có chuyến hoạt động, không thể xóa toa");
        });

        // Chỉ chặn nếu có vé đã xác nhận (confirmed) — vé đã hủy không cản trở
        if (seatBookingRepo.existsBySeatCarriageId(carriageId)) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Toa đang có vé đã đặt, không thể xóa. Hãy hủy các đơn hàng liên quan trước."));
        }

        // Xóa assignment trước (hard-delete) để giải phóng FK trước khi xóa carriage
        assignmentRepo.deleteByCarriageId(carriageId);

        // Xóa ghế rồi xóa toa
        seatRepo.deleteByCarriageId(carriageId);
        carriageRepo.delete(carriage);

        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa toa thành công"));
    }

    @DeleteMapping("/seats/{seatId}")
    public ResponseEntity<?> deleteSeat(
            @PathVariable Integer seatId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Seat seat = seatRepo.findById(seatId).orElse(null);
        if (seat == null) return ResponseEntity.notFound().build();

        // Kiểm tra tàu có kế hoạch active không
        assignmentRepo.findByCarriageIdAndUnassignedAtIsNull(seat.getCarriage().getId()).ifPresent(a -> {
            if (hasActiveTrip(a.getTrain().getId()))
                throw new RuntimeException("Không thể chỉnh sửa: tàu đang có kế hoạch khởi hành.");
        });

        seatRepo.delete(seat);
        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa ghế thành công"));
    }

    @PostMapping("/carriages/{carriageId}/seats")
    public ResponseEntity<?> addSeat(
            @PathVariable Integer carriageId,
            @RequestBody Map<String, Object> body) {

        Carriage carriage = carriageRepo.findById(carriageId).orElse(null);
        if (carriage == null) return ResponseEntity.notFound().build();

        // Kiểm tra tàu có kế hoạch active không
        Optional<TrainCarriageAssignment> activeAssign =
                assignmentRepo.findByCarriageIdAndUnassignedAtIsNull(carriageId);
        if (activeAssign.isPresent() && hasActiveTrip(activeAssign.get().getTrain().getId())) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Không thể chỉnh sửa: tàu đang có kế hoạch khởi hành. " +
                    "Vào menu Kế hoạch khởi hành để hủy kế hoạch trước."));
        }

        String seatNumber    = (String) body.get("seatNumber");
        String berthPosition = (String) body.getOrDefault("berthPosition", "seat");

        Seat seat = Seat.builder()
                .carriage(carriage)
                .seatNumber(seatNumber)
                .berthPosition(berthPosition)
                .build();
        seat = seatRepo.save(seat);
        return ResponseEntity.ok(Map.of("success", true, "id", seat.getId()));
    }

    // ─── VALIDATE ────────────────────────────────────────────────────────────────

    @GetMapping("/trains/{trainId}/validate")
    public ResponseEntity<?> validateTrain(@PathVariable Integer trainId) {
        List<String> errors = new ArrayList<>();
        List<TrainCarriageAssignment> assignments = assignmentRepo.findByTrainIdAndUnassignedAtIsNull(trainId);

        if (assignments.size() < 4) errors.add("Tàu cần có ít nhất 4 toa (hiện có " + assignments.size() + " toa)");

        for (TrainCarriageAssignment a : assignments) {
            Carriage c = a.getCarriage();
            int seats  = seatRepo.countByCarriageId(c.getId());
            int num    = a.getCarriageOrder();

            if ("seat".equals(c.getCarriageType())) {
                if (seats < 1)  errors.add("Toa " + num + " (ghế ngồi) cần ít nhất 1 ghế");
                if (seats > 32) errors.add("Toa " + num + " (ghế ngồi) tối đa 32 ghế");
            } else {
                if (seats < 2)  errors.add("Toa " + num + " (nằm) cần ít nhất 1 khoang");
                if (seats > 18) errors.add("Toa " + num + " (nằm) tối đa 6 khoang");
            }
        }

        return ResponseEntity.ok(Map.of("valid", errors.isEmpty(), "errors", errors));
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

    // ─── AVAILABLE STATIONS (cho trip wizard) ────────────────────────────────────

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

    // ─── Sinh ghế tự động ────────────────────────────────────────────────────────

    private void generateSeats(Carriage carriage) {
        List<Seat> seats = new ArrayList<>();
        switch (carriage.getCarriageType()) {
            case "seat" -> {
                for (int i = 1; i <= 32; i++)
                    seats.add(Seat.builder().carriage(carriage)
                            .seatNumber(String.format("%02d", i)).berthPosition("seat").build());
            }
            case "sleeper_3" -> {
                for (int k = 1; k <= 6; k++) {
                    String p = String.format("%02d", k);
                    seats.add(Seat.builder().carriage(carriage).seatNumber(p+"-L").compartmentNo(k).berthPosition("lower").build());
                    seats.add(Seat.builder().carriage(carriage).seatNumber(p+"-M").compartmentNo(k).berthPosition("middle").build());
                    seats.add(Seat.builder().carriage(carriage).seatNumber(p+"-U").compartmentNo(k).berthPosition("upper").build());
                }
            }
            case "sleeper_2" -> {
                for (int k = 1; k <= 6; k++) {
                    String p = String.format("%02d", k);
                    seats.add(Seat.builder().carriage(carriage).seatNumber(p+"-L").compartmentNo(k).berthPosition("lower").build());
                    seats.add(Seat.builder().carriage(carriage).seatNumber(p+"-U").compartmentNo(k).berthPosition("upper").build());
                }
            }
        }
        seatRepo.saveAll(seats);
    }
}
