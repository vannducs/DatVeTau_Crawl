package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.SeatBooking;

import java.util.List;

public interface SeatBookingRepository extends JpaRepository<SeatBooking, Integer> {

    @Query("""
        SELECT COUNT(sb) FROM SeatBooking sb
        WHERE sb.tripSeat.id    = :tripSeatId
          AND sb.trip.id        = :tripId
          AND sb.status         = 'confirmed'
          AND sb.fromOrderIndex < :toOrderIndex
          AND sb.toOrderIndex   > :fromOrderIndex
    """)
    long countConflicts(
            @Param("tripSeatId")      Long tripSeatId,
            @Param("tripId")         Integer tripId,
            @Param("fromOrderIndex") int fromOrderIndex,
            @Param("toOrderIndex")   int toOrderIndex
    );

    List<SeatBooking> findByTripId(Integer tripId);

    @Query("""
        SELECT sb FROM SeatBooking sb
        JOIN FETCH sb.tripSeat ts
        JOIN FETCH ts.tripCarriage tc
        WHERE sb.trip.id = :tripId AND sb.status = 'confirmed'
    """)
    List<SeatBooking> findConfirmedByTripId(@Param("tripId") Integer tripId);

    List<SeatBooking> findByTripIdAndStatus(Integer tripId, String status);

    @Query("SELECT COUNT(sb) > 0 FROM SeatBooking sb WHERE sb.trip.id IN :tripIds")
    boolean existsByTripIdIn(@Param("tripIds") List<Integer> tripIds);

    /** Có booking THẬT (user đặt, ticket_price > 0) cho trip không? */
    @Query("SELECT COUNT(sb) > 0 FROM SeatBooking sb WHERE sb.trip.id = :tripId AND sb.ticketPrice > 0")
    boolean existsRealBookingByTripId(@Param("tripId") Integer tripId);

    /** Xóa các booking mock do crawler tạo (ticket_price = 0). GIỮ booking thật. */
    @Modifying
    @Query("DELETE FROM SeatBooking sb WHERE sb.trip.id = :tripId AND sb.ticketPrice <= 0")
    void deleteMockByTripId(@Param("tripId") Integer tripId);
}
