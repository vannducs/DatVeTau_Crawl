package com.booktrain_crawl.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.booktrain_crawl.dto.ConfirmPaymentRequest;
import com.booktrain_crawl.dto.CreateBookingRequest;
import com.booktrain_crawl.entity.*;
import com.booktrain_crawl.repository.*;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final OrderRepository         orderRepository;
    private final OrderItemRepository     orderItemRepository;
    private final PaymentRepository       paymentRepository;
    private final TripSeatRepository      tripSeatRepository;
    private final TrainTripRepository     tripRepository;
    private final SeatBookingRepository   seatBookingRepository;
    private final TrainStationRepository  stationRepository;
    private final UserRepository          userRepository;
    private final AdminLogRepository      adminLogRepository;

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

        BigDecimal subtotal   = req.passengers().stream()
                .map(p -> BigDecimal.valueOf(p.ticketPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceFee = BigDecimal.valueOf(req.serviceFee() != null ? req.serviceFee() : 15_000L);
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
                    p.tripSeatId(), trip.getId(), fromOrderIndex, toOrderIndex);
            if (conflicts > 0) {
                throw new RuntimeException(
                        "Ghế " + p.seatNumber() + " đã được đặt cho đoạn này. Vui lòng chọn ghế khác.");
            }

            TripSeat tripSeat = tripSeatRepository.findById(p.tripSeatId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế: " + p.tripSeatId()));

            SeatBooking sb = SeatBooking.builder()
                    .tripSeat(tripSeat)
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
        Order order = orderRepository.findByOrderCode(req.orderCode()).orElse(null);
        if (order == null) {
            List<Order> matches = orderRepository.findByOrderCodeEndingWith(req.orderCode());
            if (matches.size() == 1) order = matches.get(0);
        }
        if (order == null)
            throw new RuntimeException("Không tìm thấy đơn hàng: " + req.orderCode());

        if ("paid".equals(order.getStatus())) {
            boolean hasPayment = !paymentRepository.findByOrderId(order.getId()).isEmpty();
            if (!hasPayment) {
                paymentRepository.save(Payment.builder()
                        .order(order).paymentMethod("VNPay")
                        .amount(BigDecimal.valueOf(req.amount()))
                        .status("success").transactionCode(req.transactionNo())
                        .paidAt(OffsetDateTime.now()).build());
            }
            return;
        }

        order.setStatus("paid");
        orderRepository.save(order);

        paymentRepository.save(Payment.builder()
                .order(order).paymentMethod("VNPay")
                .amount(BigDecimal.valueOf(req.amount()))
                .status("success").transactionCode(req.transactionNo())
                .paidAt(OffsetDateTime.now()).build());
    }
}
