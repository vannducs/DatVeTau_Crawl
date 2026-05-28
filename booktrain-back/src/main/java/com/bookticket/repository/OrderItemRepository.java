package com.bookticket.repository;

import com.bookticket.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    @Query("SELECT oi FROM OrderItem oi JOIN FETCH oi.seatBooking WHERE oi.order.id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Integer orderId);

    @Query("""
        SELECT oi FROM OrderItem oi
        JOIN FETCH oi.seatBooking sb
        JOIN FETCH oi.order o
        WHERE sb.trip.id = :tripId
    """)
    List<OrderItem> findBySeatBookingTripId(@Param("tripId") Integer tripId);
}
