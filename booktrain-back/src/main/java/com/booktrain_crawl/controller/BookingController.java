package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.dto.ConfirmPaymentRequest;
import com.booktrain_crawl.dto.CreateBookingRequest;
import com.booktrain_crawl.service.BookingService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/booking")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** POST /api/booking/create */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createBooking(
            @RequestBody CreateBookingRequest req,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();
        try {
            String userEmail = authentication.getName();
            String orderCode = bookingService.createOrder(req, userEmail);
            response.put("success", true);
            response.put("orderCode", orderCode);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * POST /api/booking/confirm — permitAll (gọi sau khi VNPay redirect về)
     * Nếu responseCode = "00" → lưu payment và cập nhật trạng thái ghế
     */
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmBooking(
            @RequestBody ConfirmPaymentRequest req) {

        Map<String, Object> response = new HashMap<>();

        if (!"00".equals(req.responseCode())) {
            response.put("success", false);
            response.put("message", "Thanh toán thất bại (mã: " + req.responseCode() + ")");
            return ResponseEntity.ok(response);
        }

        try {
            bookingService.confirmPayment(req);
            response.put("success", true);
            response.put("message", "Xác nhận đơn hàng thành công");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi xác nhận: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }
}
