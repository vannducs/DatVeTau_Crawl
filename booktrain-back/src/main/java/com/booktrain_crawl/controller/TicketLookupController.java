package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketLookupController {

    // Backend = nguồn chân lý giờ VN; trả string "HH:mm dd/MM/yyyy", frontend không tự parse
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private static String fmtVN(OffsetDateTime dt) {
        return dt == null ? "" : dt.toInstant().atZone(VN).format(FMT);
    }


    private final OrderRepository      orderRepo;
    private final OrderItemRepository  orderItemRepo;
    private final PaymentRepository    paymentRepo;

    @GetMapping("/{orderCode}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> lookup(@PathVariable String orderCode) {
        Optional<Order> opt = orderRepo.findByOrderCode(orderCode.toUpperCase().trim());
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy mã đặt vé: " + orderCode));
        }

        Order order = opt.get();
        List<OrderItem> items = orderItemRepo.findByOrderId(order.getId());

        List<Payment> payments = paymentRepo.findByOrderId(order.getId());
        Payment payment = payments.stream()
                .filter(p -> "success".equals(p.getStatus()))
                .findFirst()
                .orElse(payments.isEmpty() ? null : payments.get(0));

        List<Map<String, Object>> passengers = new ArrayList<>();
        String trainCode = null, trainName = null, originName = null, destinationName = null;
        String departureTime = null, arrivalTime = null;

        for (OrderItem item : items) {
            SeatBooking sb  = item.getSeatBooking();
            TripSeat    ts  = sb.getTripSeat();
            TripCarriage tc = ts != null ? ts.getTripCarriage() : null;
            TrainTrip trip  = sb.getTrip();
            Train train     = trip.getTrain();

            if (trainCode == null) {
                trainCode = train.getTrainCode();
                trainName = train.getTrainName();
                originName = sb.getFromStation().getName();
                destinationName = sb.getToStation().getName();
                departureTime = fmtVN(trip.getDepartureDatetime());
                arrivalTime   = fmtVN(trip.getArrivalDatetime());
            }

            Map<String, Object> p = new LinkedHashMap<>();
            p.put("passengerName", item.getPassengerName());
            p.put("idNumber",      item.getIdNumber());
            p.put("seatNumber",    ts != null ? ts.getSeatNumber() : "");
            p.put("carriageNumber",tc != null ? tc.getCarriageOrder() : 0);
            p.put("carriageType",  tc != null ? tc.getCarriageType() : "");
            p.put("carriageName",  tc != null ? tc.getCarriageName() : "");
            p.put("ticketPrice",   item.getTicketPrice());
            p.put("status",        item.getStatus());
            passengers.add(p);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderCode",       order.getOrderCode());
        result.put("status",          order.getStatus());
        result.put("trainCode",       trainCode);
        result.put("trainName",       trainName);
        result.put("originName",      originName);
        result.put("destinationName", destinationName);
        result.put("departureTime",   departureTime);
        result.put("arrivalTime",     arrivalTime);
        result.put("passengers",      passengers);
        result.put("totalAmount",     order.getTotalAmount());
        result.put("serviceFee",      order.getServiceFee());
        result.put("paymentMethod",   payment != null ? payment.getPaymentMethod() : null);
        result.put("transactionCode", payment != null ? payment.getTransactionCode() : null);
        result.put("paidAt",          payment != null && payment.getPaidAt() != null
                                      ? fmtVN(payment.getPaidAt()) : null);

        return ResponseEntity.ok(result);
    }
}
