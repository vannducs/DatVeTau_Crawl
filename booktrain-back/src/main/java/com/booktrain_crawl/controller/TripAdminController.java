package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.crawler.CrawlerUpsertService;
import com.booktrain_crawl.dto.CancelTripRequest;
import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;
import com.booktrain_crawl.service.TripService;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/trips")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TripAdminController {

    private final TrainTripRepository        tripRepo;
    private final TrainRepository            trainRepo;
    private final TrainStationRepository     stationRepo;
    private final TripSegmentPriceRepository priceRepo;
    private final SeatBookingRepository      seatBookingRepo;
    private final OrderItemRepository        orderItemRepo;
    private final OrderRepository            orderRepo;
    private final PaymentRepository          paymentRepo;
    private final NotificationRepository     notificationRepo;
    private final UserRepository             userRepo;
    private final AdminLogRepository         adminLogRepo;
    private final TripService                tripService;
    private final PasswordEncoder            passwordEncoder;
    private final CrawlerUpsertService       upsertService;

    private static String formatCurrency(java.math.BigDecimal amount) {
        NumberFormat nf = NumberFormat.getInstance(Locale.of("vi", "VN"));
        return nf.format(amount) + "đ";
    }

    // ─── LIST ────────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")  int     page,
            @RequestParam(defaultValue = "10") int     size,
            @RequestParam(required = false)    String  status,
            @RequestParam(required = false)    Integer trainId,
            @RequestParam(required = false)    Integer fromStationId,
            @RequestParam(required = false)    Integer toStationId,
            @RequestParam(required = false)    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        // Empty string → null (frontend gửi "" khi chưa chọn filter)
        if (status != null && status.isBlank()) status = null;

        // Lọc trong Java thay vì JPQL vì Hibernate 6 có bug query plan caching
        List<TrainTrip> all = tripRepo.findAllTripsWithJoins();

        OffsetDateTime now = OffsetDateTime.now();

        // Auto-compute effective status:
        // Nếu arrivalDatetime < now && status vẫn là "open" → coi là "completed"
        java.util.function.Function<TrainTrip, String> effectiveStatus = t -> {
            if ("open".equals(t.getStatus()) && t.getArrivalDatetime().isBefore(now)) {
                return "completed";
            }
            return t.getStatus();
        };

        final String fStatus = status;
        if (fStatus != null) {
            if ("hidden".equals(fStatus)) {
                // Lọc riêng chuyến đã ẩn (cross-cutting với open/completed/cancelled)
                all = all.stream().filter(t -> Boolean.TRUE.equals(t.getIsHidden())).toList();
            } else {
                all = all.stream().filter(t -> fStatus.equals(effectiveStatus.apply(t))).toList();
            }
        }
        if (trainId != null) {
            all = all.stream().filter(t -> trainId.equals(t.getTrain().getId())).toList();
        }
        if (fromStationId != null) {
            all = all.stream().filter(t -> fromStationId.equals(t.getFromStation().getId())).toList();
        }
        if (toStationId != null) {
            all = all.stream().filter(t -> toStationId.equals(t.getToStation().getId())).toList();
        }
        if (date != null) {
            all = all.stream().filter(t -> {
                LocalDate tripDate = t.getDepartureDatetime()
                        .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                return date.equals(tripDate);
            }).toList();
        }

        // Khi không filter ngày cụ thể: ẩn chuyến khởi hành trước hôm nay
        if (date == null) {
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            all = all.stream().filter(t -> {
                LocalDate tripDate = t.getDepartureDatetime()
                        .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                return !tripDate.isBefore(today);
            }).toList();
        }

        // Sort: ngày gần hôm nay nhất lên đầu (theo khoảng cách tuyệt đối)
        all = all.stream()
                .sorted(Comparator.comparingLong(t ->
                        Math.abs(java.time.Duration.between(now, ((TrainTrip) t).getDepartureDatetime()).toMinutes()))
                )
                .toList();

        int total = all.size();
        List<TrainTrip> paged = all.stream()
                .skip((long) page * size).limit(size).toList();

        List<Map<String, Object>> trips = paged.stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              t.getId());
            m.put("train_id",        t.getTrain().getId());
            m.put("train_code",      t.getTrain().getTrainCode());
            m.put("train_name",      t.getTrain().getTrainName());
            m.put("origin_name",     t.getFromStation().getName());
            m.put("destination_name",t.getToStation().getName());
            m.put("departure_time",  t.getDepartureDatetime());
            m.put("arrival_time",    t.getArrivalDatetime());
            m.put("status",          effectiveStatus.apply(t));
            m.put("is_hidden",       Boolean.TRUE.equals(t.getIsHidden()));
            m.put("has_real_booking", seatBookingRepo.existsRealBookingByTripId(t.getId()));
            long confirmedBookings = seatBookingRepo.findByTripIdAndStatus(t.getId(), "confirmed").size();
            m.put("confirmed_bookings", confirmedBookings);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("trips", trips, "total", total));
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────────

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        Integer trainId         = (Integer) body.get("trainId");
        Integer fromStationId   = (Integer) body.get("fromStationId");
        Integer toStationId     = (Integer) body.get("toStationId");
        String  departureDatetime = (String)  body.get("departureDatetime");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> segmentPrices =
                (List<Map<String, Object>>) body.get("segmentPrices");

        Train train = trainRepo.findById(trainId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tàu"));
        TrainStation fromStation = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toStation   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        // Validate: không có chuyến active
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trainId, "open", OffsetDateTime.now());
        if (hasActive)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đang có chuyến chưa kết thúc"));

        OffsetDateTime depDt = OffsetDateTime.parse(departureDatetime);

        // Validate: trong 2 tuần tới
        OffsetDateTime now     = OffsetDateTime.now();
        OffsetDateTime twoWeeks = now.plusDays(14);
        if (depDt.isBefore(now))
            return ResponseEntity.badRequest().body(Map.of("message", "Thời gian khởi hành phải sau hiện tại"));
        if (depDt.isAfter(twoWeeks))
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ lên kế hoạch trong 2 tuần tới"));

        // Validate: cách chuyến gần nhất ≥ 2 ngày (chỉ tính chuyến chưa bị hủy)
        Optional<TrainTrip> lastTrip = tripRepo
                .findTopByTrainIdAndStatusNotOrderByDepartureDatetimeDesc(trainId, "cancelled");
        if (lastTrip.isPresent()) {
            OffsetDateTime lastDep = lastTrip.get().getDepartureDatetime();
            if (Math.abs(lastDep.until(depDt, java.time.temporal.ChronoUnit.HOURS)) < 48)
                return ResponseEntity.badRequest().body(Map.of("message", "Chuyến mới phải cách chuyến gần nhất ít nhất 2 ngày"));
        }

        // VĐ6: Kiểm tra trùng ngày
        LocalDate newDate = depDt.atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        boolean sameDay = tripRepo.existsOnSameDateForTrain(trainId, newDate);
        if (sameDay) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Tàu này đã có kế hoạch trong ngày " +
                    newDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
        }

        // VĐ6: Kiểm tra trùng giờ (±2 giờ buffer)
        boolean conflictTime = tripRepo.existsByTrainIdAndDepartureDatetimeBetweenAndStatusNot(
                trainId, depDt.minusHours(2), depDt.plusHours(2), "cancelled");
        if (conflictTime) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Tàu này đã có kế hoạch trùng giờ khởi hành"));
        }

        // Tính arrivalDatetime
        int totalMinutes = tripService.calcTotalDurationMinutes(fromStationId, toStationId);
        if (totalMinutes == 0)
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy dữ liệu thời gian cho tuyến này"));

        OffsetDateTime arrDt = depDt.plusMinutes(totalMinutes);

        // Lấy adminId
        Integer adminId = userRepo.findByEmail(userDetails.getUsername())
                .map(User::getId).orElse(null);

        TrainTrip trip = TrainTrip.builder()
                .train(train)
                .fromStation(fromStation)
                .toStation(toStation)
                .departureDatetime(depDt)
                .arrivalDatetime(arrDt)
                .status("open")
                .createdBy(adminId)
                .build();
        trip = tripRepo.save(trip);

        // Lưu giá
        if (segmentPrices != null) {
            for (Map<String, Object> sp : segmentPrices) {
                Integer spFromId = (Integer) sp.get("fromStationId");
                Integer spToId   = (Integer) sp.get("toStationId");
                String  cType    = (String)  sp.get("carriageType");
                String  berth    = (String)  sp.get("berthPosition");
                Number  priceNum = (Number)  sp.get("price");
                if (priceNum == null || priceNum.longValue() <= 0) continue;

                TrainStation spFrom = stationRepo.findById(spFromId).orElse(null);
                TrainStation spTo   = stationRepo.findById(spToId).orElse(null);
                if (spFrom == null || spTo == null) continue;

                priceRepo.save(TripSegmentPrice.builder()
                        .trip(trip)
                        .fromStation(spFrom)
                        .toStation(spTo)
                        .carriageType(cType)
                        .berthPosition(berth)
                        .price(java.math.BigDecimal.valueOf(priceNum.longValue()))
                        .build());
            }
        }

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId)
                    .action("CREATE_TRIP")
                    .targetType("trip")
                    .targetId(trip.getId())
                    .detail("Tạo chuyến " + train.getTrainCode() + " " + depDt)
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "tripId",  trip.getId(),
                "message", "Đã lên kế hoạch chuyến thành công",
                "arrivalDatetime", arrDt.toString()));
    }

    // ─── CANCEL ───────────────────────────────────────────────────────────────────

    @PutMapping("/{tripId}/cancel")
    @Transactional
    public ResponseEntity<?> cancel(
            @PathVariable Integer tripId,
            @RequestBody CancelTripRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        if (!"open".equals(trip.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ hủy được chuyến đang mở"));

        // VĐ5b: Không hủy chuyến khởi hành hôm nay
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate departureDate = trip.getDepartureDatetime()
                .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        if (departureDate.equals(today)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Không thể hủy chuyến khởi hành trong ngày hôm nay"));
        }

        // VĐ5b: Verify mật khẩu admin
        User admin = userRepo.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy admin"));
        if (req.adminPassword() == null || req.adminPassword().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Vui lòng nhập mật khẩu admin"));
        }
        if (!passwordEncoder.matches(req.adminPassword(), admin.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Mật khẩu admin không đúng"));
        }

        // Validate lý do
        String cancelReason = req.cancelReason();
        if (cancelReason == null || cancelReason.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Vui lòng nhập lý do hủy chuyến"));
        }

        Integer adminId = admin.getId();

        trip.setStatus("cancelled");
        trip.setCancelledBy(adminId);
        trip.setCancelledAt(OffsetDateTime.now());
        trip.setCancelReason(cancelReason);
        tripRepo.save(trip);

        // Cascade cancel: seat_bookings → order_items → orders → payments
        List<SeatBooking> bookings = seatBookingRepo.findByTripIdAndStatus(tripId, "confirmed");
        Set<Integer> orderIds = new HashSet<>();

        for (SeatBooking sb : bookings) {
            sb.setStatus("cancelled");
            seatBookingRepo.save(sb);
        }

        // Cancel tất cả order_items liên quan
        List<OrderItem> items = orderItemRepo.findBySeatBookingTripId(tripId);
        for (OrderItem item : items) {
            item.setStatus("cancelled");
            orderItemRepo.save(item);
            orderIds.add(item.getOrder().getId());
        }

        // Cancel orders và refund payments + thông báo
        for (Integer orderId : orderIds) {
            orderRepo.findById(orderId).ifPresent(o -> {
                o.setStatus("refunded");
                orderRepo.save(o);

                // Tạo payment refund
                paymentRepo.findByOrderId(orderId).stream()
                        .filter(p -> "success".equals(p.getStatus()))
                        .forEach(p -> {
                            p.setStatus("refunded");
                            paymentRepo.save(p);
                        });

                // VĐ5b: Gửi notification chi tiết cho khách
                notificationRepo.save(Notification.builder()
                        .userId(o.getCustomer().getId())
                        .title("Chuyến tàu bị hủy — Hoàn tiền thành công")
                        .body("Chuyến tàu " + trip.getTrain().getTrainCode()
                                + " ngày " + departureDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                + " đã bị hủy.\n"
                                + "Lý do: " + cancelReason + "\n"
                                + "Số tiền " + formatCurrency(o.getTotalAmount())
                                + " đã được hoàn vào tài khoản của bạn.")
                        .notiType("refund")
                        .build());
            });
        }

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId)
                    .action("CANCEL_TRIP")
                    .targetType("trip")
                    .targetId(tripId)
                    .detail("Hủy chuyến " + trip.getTrain().getTrainCode()
                            + " ngày " + departureDate + ". Lý do: " + cancelReason
                            + ". Ảnh hưởng " + orderIds.size() + " đơn hàng.")
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "message", "Đã hủy kế hoạch thành công",
                "affectedOrders", orderIds.size()));
    }

    // ─── TRIP STATUS (để check trước khi lên kế hoạch mới) ──────────────────────

    @GetMapping("/{tripId}/trip-status")
    public ResponseEntity<?> tripStatus(@PathVariable Integer tripId) {
        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trip.getTrain().getId(), "open", OffsetDateTime.now());
        return ResponseEntity.ok(Map.of("hasActiveTrip", hasActive));
    }

    // ─── TRAIN TRIP STATUS (dùng cho admin tàu, check trước khi thêm chuyến mới) ─

    @GetMapping("/train-status/{trainId}")
    public ResponseEntity<?> trainTripStatus(@PathVariable Integer trainId) {
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trainId, "open", OffsetDateTime.now());
        Optional<TrainTrip> lastTrip = tripRepo.findTopByTrainIdOrderByDepartureDatetimeDesc(trainId);

        OffsetDateTime now      = OffsetDateTime.now();
        OffsetDateTime earliest = now.plusDays(1);
        OffsetDateTime latest   = now.plusDays(14);

        if (lastTrip.isPresent()) {
            OffsetDateTime lastArr = lastTrip.get().getArrivalDatetime();
            if (lastArr.isAfter(earliest)) earliest = lastArr.plusDays(1);
        }

        return ResponseEntity.ok(Map.of(
                "hasActiveTrip",       hasActive,
                "earliestNewTripDate", earliest.toLocalDate().toString(),
                "latestAllowedDate",   latest.toLocalDate().toString()));
    }

    // ─── CANCEL INFO ──────────────────────────────────────────────────────────────

    @GetMapping("/{tripId}/cancel-info")
    public ResponseEntity<?> cancelInfo(@PathVariable Integer tripId) {
        long affected = seatBookingRepo.findByTripIdAndStatus(tripId, "confirmed").size();
        return ResponseEntity.ok(Map.of("affectedOrders", affected));
    }

    // ─── TOGGLE HIDDEN (ẩn/hiện khỏi search công khai) ──────────────────────────────

    @PutMapping("/{tripId}/toggle-hidden")
    @Transactional
    public ResponseEntity<?> toggleHidden(
            @PathVariable Integer tripId,
            @AuthenticationPrincipal UserDetails userDetails) {

        TrainTrip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null) return ResponseEntity.notFound().build();

        boolean newHidden = !Boolean.TRUE.equals(trip.getIsHidden());
        trip.setIsHidden(newHidden);
        tripRepo.save(trip);

        try {
            Integer adminId = userRepo.findByEmail(userDetails.getUsername()).map(User::getId).orElse(null);
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId).action(newHidden ? "HIDE_TRIP" : "SHOW_TRIP")
                    .targetType("trip").targetId(tripId)
                    .detail((newHidden ? "Ẩn" : "Hiện") + " chuyến " + trip.getTrain().getTrainCode())
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "success", true,
                "isHidden", newHidden,
                "message", newHidden ? "Đã ẩn chuyến khỏi tìm kiếm" : "Đã hiện lại chuyến"));
    }

    // ─── DELETE (chỉ khi chưa có vé thật bán) ───────────────────────────────────────

    @DeleteMapping("/{tripId}")
    @Transactional
    public ResponseEntity<?> delete(
            @PathVariable Integer tripId,
            @AuthenticationPrincipal UserDetails userDetails) {

        TrainTrip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null) return ResponseEntity.notFound().build();

        // Chặn xóa nếu có vé thật (ticket_price > 0)
        if (seatBookingRepo.existsRealBookingByTripId(tripId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chuyến đã có vé bán, không thể xóa"));
        }

        String trainCode = trip.getTrain().getTrainCode();
        // Xóa mock booking + trip_seats + trip_carriages + trip_segment_prices, rồi xóa trip
        upsertService.purgeCrawledData(tripId);
        tripRepo.delete(trip);

        try {
            Integer adminId = userRepo.findByEmail(userDetails.getUsername()).map(User::getId).orElse(null);
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId).action("DELETE_TRIP")
                    .targetType("trip").targetId(tripId)
                    .detail("Xóa chuyến " + trainCode + " (id=" + tripId + ")")
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa chuyến"));
    }
}
