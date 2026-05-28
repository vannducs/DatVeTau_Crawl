package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.dto.CancelOrderRequest;
import com.booktrain_crawl.dto.OrderSummaryDto;
import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;
import com.booktrain_crawl.service.OrderService;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService          orderService;
    private final OrderRepository       orderRepo;
    private final OrderItemRepository   orderItemRepo;
    private final PaymentRepository     paymentRepo;
    private final SeatBookingRepository seatBookingRepo;
    private final UserRepository        userRepo;
    private final NotificationRepository notificationRepo;
    private final AdminLogRepository    adminLogRepo;
    private final PasswordEncoder       passwordEncoder;

    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderSummaryDto>> getMyOrders(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(orderService.getMyOrders(email));
    }

    @GetMapping("/my-orders/{orderCode}")
    public ResponseEntity<?> getOrderDetail(
            @PathVariable String orderCode,
            Authentication auth) {

        String email = auth.getName();
        OrderSummaryDto detail = orderService.getOrderDetail(email, orderCode);
        if (detail == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đơn hàng"));
        }
        return ResponseEntity.ok(detail);
    }

    @PutMapping("/{orderCode}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(
            @PathVariable String orderCode,
            @RequestBody CancelOrderRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Order order = orderRepo.findByOrderCode(orderCode).orElse(null);
        if (order == null)
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đơn hàng"));

        if (!order.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Không có quyền hủy đơn hàng này"));

        if (!"paid".equals(order.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ có thể hủy đơn hàng đã thanh toán"));

        if (req.password() == null || req.password().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập mật khẩu"));

        if (!passwordEncoder.matches(req.password(), user.getPassword()))
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu không đúng"));

        List<OrderItem> items = orderItemRepo.findByOrderId(order.getId());
        if (items.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy thông tin vé"));

        TrainTrip trip = items.get(0).getSeatBooking().getTrip();
        ZoneId vn = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(vn);
        LocalDate departureDate = trip.getDepartureDatetime().atZoneSameInstant(vn).toLocalDate();

        if (!departureDate.isAfter(today))
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Không thể hủy vé cho chuyến đã khởi hành hoặc khởi hành hôm nay"));

        for (OrderItem item : items) {
            SeatBooking sb = item.getSeatBooking();
            sb.setStatus("cancelled");
            seatBookingRepo.save(sb);
            item.setStatus("cancelled");
            orderItemRepo.save(item);
        }

        List<Payment> payments = paymentRepo.findByOrderId(order.getId());
        if (!payments.isEmpty()) {
            Payment p = payments.get(0);
            p.setStatus("refunded");
            paymentRepo.save(p);
        }

        order.setStatus("refunded");
        order.setNote("Khách hủy: " + req.reason());
        orderRepo.save(order);

        String departureDateStr = departureDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String trainCode = trip.getTrain().getTrainCode();

        notificationRepo.save(Notification.builder()
                .userId(user.getId())
                .title("Hủy vé thành công — Hoàn tiền thành công")
                .body("Bạn đã hủy vé chuyến tàu " + trainCode + " ngày " + departureDateStr + ".\n"
                        + "Lý do: " + req.reason() + "\n"
                        + "Số tiền " + order.getTotalAmount().toPlainString()
                        + "đ đã được hoàn vào tài khoản của bạn.")
                .notiType("refund")
                .isRead(false)
                .build());

        for (User admin : userRepo.findByAccountType("admin")) {
            notificationRepo.save(Notification.builder()
                    .userId(admin.getId())
                    .title("Khách hàng hủy vé")
                    .body("Khách hàng " + user.getFullName() + " (" + user.getEmail() + ") "
                            + "đã hủy vé chuyến tàu " + trainCode + " ngày " + departureDateStr + ".\n"
                            + "Lý do: " + req.reason() + "\n"
                            + "Số tiền hoàn: " + order.getTotalAmount().toPlainString() + "đ.\n"
                            + "Mã đơn hàng: " + orderCode)
                    .notiType("system")
                    .isRead(false)
                    .build());
        }

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(user.getId())
                    .action("CUSTOMER_CANCEL_ORDER")
                    .targetType("order")
                    .targetId(order.getId())
                    .detail("Khách " + user.getFullName() + " hủy đơn " + orderCode
                            + ". Lý do: " + req.reason()
                            + ". Hoàn: " + order.getTotalAmount() + "đ")
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "message", "Hủy vé thành công. Tiền sẽ được hoàn trong 1-3 ngày làm việc.",
                "refundAmount", order.getTotalAmount()
        ));
    }
}
