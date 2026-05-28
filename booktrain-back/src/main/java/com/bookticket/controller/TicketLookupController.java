package com.bookticket.controller;

import com.bookticket.entity.*;
import com.bookticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketLookupController {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final PaymentRepository paymentRepo;
    private final TrainCarriageAssignmentRepository assignmentRepo;

    @GetMapping("/{orderCode}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> lookup(@PathVariable String orderCode) {
        Optional<Order> opt = orderRepo.findByOrderCode(orderCode.toUpperCase().trim());
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy mã đặt vé: " + orderCode));
        }

        Order order = opt.get();
        List<OrderItem> items = orderItemRepo.findByOrderId(order.getId());

        // Payment info
        List<Payment> payments = paymentRepo.findByOrderId(order.getId());
        Payment payment = payments.stream()
                .filter(p -> "success".equals(p.getStatus()))
                .findFirst()
                .orElse(payments.isEmpty() ? null : payments.get(0));

        // Build passengers list
        List<Map<String, Object>> passengers = new ArrayList<>();
        String trainCode = null, trainName = null, originName = null, destinationName = null;
        String departureTime = null, arrivalTime = null;

        for (OrderItem item : items) {
            SeatBooking sb = item.getSeatBooking();
            Seat seat = sb.getSeat();
            Carriage carriage = seat.getCarriage();
            TrainTrip trip = sb.getTrip();
            Train train = trip.getTrain();

            // Set trip info from first item (all items share same trip)
            if (trainCode == null) {
                trainCode = train.getTrainCode();
                trainName = train.getTrainName();
                originName = sb.getFromStation().getName();
                destinationName = sb.getToStation().getName();
                departureTime = trip.getDepartureDatetime().toString();
                arrivalTime = trip.getArrivalDatetime().toString();
            }

            int carriageOrder = assignmentRepo
                    .findByCarriageIdAndUnassignedAtIsNull(carriage.getId())
                    .map(TrainCarriageAssignment::getCarriageOrder)
                    .orElse(0);

            Map<String, Object> p = new LinkedHashMap<>();
            p.put("passengerName", item.getPassengerName());
            p.put("idNumber", item.getIdNumber());
            p.put("seatNumber", seat.getSeatNumber());
            p.put("carriageNumber", carriageOrder);
            p.put("carriageType", resolveCarriageType(carriage));
            p.put("ticketPrice", item.getTicketPrice());
            p.put("status", item.getStatus());
            passengers.add(p);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderCode", order.getOrderCode());
        result.put("status", order.getStatus());
        result.put("trainCode", trainCode);
        result.put("trainName", trainName);
        result.put("originName", originName);
        result.put("destinationName", destinationName);
        result.put("departureTime", departureTime);
        result.put("arrivalTime", arrivalTime);
        result.put("passengers", passengers);
        result.put("totalAmount", order.getTotalAmount());
        result.put("serviceFee", order.getServiceFee());
        result.put("paymentMethod", payment != null ? payment.getPaymentMethod() : null);
        result.put("transactionCode", payment != null ? payment.getTransactionCode() : null);
        result.put("paidAt", payment != null && payment.getPaidAt() != null ? payment.getPaidAt().toString() : null);

        return ResponseEntity.ok(result);
    }

    private String resolveCarriageType(Carriage c) {
        String type = c.getCarriageType();
        if (c.getIsVip() != null && c.getIsVip()) return "vip_ac_sleeper";
        return switch (type) {
            case "seat" -> "hard_seat";
            case "sleeper_3" -> "hard_sleeper";
            case "sleeper_2" -> "soft_sleeper";
            default -> type;
        };
    }
}
