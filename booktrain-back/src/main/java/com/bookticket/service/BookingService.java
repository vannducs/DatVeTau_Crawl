package com.bookticket.service;

import com.bookticket.dto.ConfirmPaymentRequest;
import com.bookticket.dto.CreateBookingRequest;
import com.bookticket.entity.*;
import com.bookticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final OrderRepository       orderRepository;
    private final OrderItemRepository   orderItemRepository;
    private final PaymentRepository     paymentRepository;
    private final SeatRepository        seatRepository;
    private final TrainTripRepository   tripRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final TrainStationRepository stationRepository;
    private final UserRepository        userRepository;
    private final AdminLogRepository    adminLogRepository;

    @Transactional
    public String createOrder(CreateBookingRequest req, String userEmail) {
        User customer = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + userEmail));

        TrainTrip trip = tripRepository.findById(req.tripId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến: " + req.tripId()));

        TrainStation fromStation = stationRepository.findById(req.fromStationId())
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toStation   = stationRepository.findById(req.toStationId())
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        int fromOrderIndex = fromStation.getOrderIndex();
        int toOrderIndex   = toStation.getOrderIndex();

        BigDecimal subtotal    = req.passengers().stream()
                .map(p -> BigDecimal.valueOf(p.ticketPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceFee  = BigDecimal.valueOf(req.serviceFee() != null ? req.serviceFee() : 15_000L);
        BigDecimal totalAmount = subtotal.add(serviceFee);

        String date      = new SimpleDateFormat("MMdd").format(new Date());
        int    rand      = new Random().nextInt(9000) + 1000;
        String orderCode = "DV" + date + rand;

        Order order = Order.builder()
                .orderCode(orderCode)
                .customer(customer)
                .subtotal(subtotal)
                .serviceFee(serviceFee)
                .discount(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .status("pending_payment")
                .build();
        order = orderRepository.save(order);

        for (CreateBookingRequest.PassengerDto p : req.passengers()) {
            long conflicts = seatBookingRepository.countConflicts(
                    p.seatId(), trip.getId(), fromOrderIndex, toOrderIndex);
            if (conflicts > 0) {
                throw new RuntimeException(
                        "Ghế " + p.seatNumber() + " đã được đặt cho đoạn này. Vui lòng chọn ghế khác.");
            }

            Seat seat = seatRepository.findById(p.seatId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế: " + p.seatId()));

            SeatBooking sb = SeatBooking.builder()
                    .seat(seat)
                    .trip(trip)
                    .fromStation(fromStation)
                    .toStation(toStation)
                    .fromOrderIndex(fromOrderIndex)
                    .toOrderIndex(toOrderIndex)
                    .ticketPrice(BigDecimal.valueOf(p.ticketPrice()))
                    .status("confirmed")
                    .build();
            sb = seatBookingRepository.save(sb);

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .seatBooking(sb)
                    .passengerName(p.passengerName())
                    .idNumber(p.idNumber())
                    .phoneNumber(p.phoneNumber())
                    .dateOfBirth(p.dateOfBirth())
                    .ticketPrice(BigDecimal.valueOf(p.ticketPrice()))
                    .status("confirmed")
                    .build();
            orderItemRepository.save(item);
        }

        try {
            adminLogRepository.save(AdminLog.builder()
                    .adminId(customer.getId())
                    .action("CREATE_ORDER")
                    .targetType("order")
                    .detail("Order " + orderCode + " created by " + userEmail)
                    .build());
        } catch (Exception ignored) {}

        return orderCode;
    }

    @Transactional
    public void confirmPayment(ConfirmPaymentRequest req) {
        System.out.println("[confirmPayment] orderCode=" + req.orderCode()
                + " txn=" + req.transactionNo() + " amount=" + req.amount());

        // Tìm chính xác trước; nếu không có thì tìm theo suffix (compat với orderCode cũ bị cắt ngắn bởi VNPay)
        Order order = orderRepository.findByOrderCode(req.orderCode()).orElse(null);
        if (order == null) {
            List<Order> matches = orderRepository.findByOrderCodeEndingWith(req.orderCode());
            if (matches.size() == 1) {
                order = matches.get(0);
                System.out.println("[confirmPayment] found by suffix: " + order.getOrderCode());
            }
        }
        if (order == null) {
            throw new RuntimeException("Không tìm thấy đơn hàng: " + req.orderCode());
        }

        if ("paid".equals(order.getStatus())) {
            System.out.println("[confirmPayment] order " + req.orderCode() + " already paid — checking payment record");
            boolean hasPayment = !paymentRepository.findByOrderId(order.getId()).isEmpty();
            if (!hasPayment) {
                // Order is paid but payment record missing — create it now
                Payment payment = Payment.builder()
                        .order(order)
                        .paymentMethod("VNPay")
                        .amount(BigDecimal.valueOf(req.amount()))
                        .status("success")
                        .transactionCode(req.transactionNo())
                        .paidAt(OffsetDateTime.now())
                        .build();
                paymentRepository.save(payment);
                System.out.println("[confirmPayment] backfilled missing payment for " + req.orderCode());
            }
            return;
        }

        order.setStatus("paid");
        orderRepository.save(order);
        System.out.println("[confirmPayment] order " + req.orderCode() + " → paid");

        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod("VNPay")
                .amount(BigDecimal.valueOf(req.amount()))
                .status("success")
                .transactionCode(req.transactionNo())
                .paidAt(OffsetDateTime.now())
                .build();
        paymentRepository.save(payment);
        System.out.println("[confirmPayment] payment saved for " + req.orderCode());
    }
}
