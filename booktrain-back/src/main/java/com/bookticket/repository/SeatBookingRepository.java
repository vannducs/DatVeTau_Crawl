package com.bookticket.repository;

import com.bookticket.entity.SeatBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatBookingRepository extends JpaRepository<SeatBooking, Integer> {

    @Query("""
        SELECT COUNT(sb) FROM SeatBooking sb
        WHERE sb.seat.id        = :seatId
          AND sb.trip.id        = :tripId
          AND sb.status         = 'confirmed'
          AND sb.fromOrderIndex < :toOrderIndex
          AND sb.toOrderIndex   > :fromOrderIndex
    """)
    long countConflicts(
            @Param("seatId")         Integer seatId,
            @Param("tripId")         Integer tripId,
            @Param("fromOrderIndex") int fromOrderIndex,
            @Param("toOrderIndex")   int toOrderIndex
    );

    List<SeatBooking> findByTripId(Integer tripId);

    @Query("""
        SELECT sb FROM SeatBooking sb
        JOIN FETCH sb.seat s
        JOIN FETCH s.carriage c
        WHERE sb.trip.id = :tripId AND sb.status = 'confirmed'
    """)
    List<SeatBooking> findConfirmedByTripId(@Param("tripId") Integer tripId);

    List<SeatBooking> findByTripIdAndStatus(Integer tripId, String status);

    @Query("SELECT COUNT(sb) > 0 FROM SeatBooking sb WHERE sb.seat.carriage.id = :carriageId AND sb.status = 'confirmed'")
    boolean existsBySeatCarriageId(@Param("carriageId") Integer carriageId);

    @Query("SELECT COUNT(sb) > 0 FROM SeatBooking sb WHERE sb.trip.id IN :tripIds")
    boolean existsByTripIdIn(@Param("tripIds") List<Integer> tripIds);
}
