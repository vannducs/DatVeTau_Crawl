package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.TripSeat;

import java.util.List;

public interface TripSeatRepository extends JpaRepository<TripSeat, Long> {
    List<TripSeat> findByTripCarriageIdOrderBySeatNumber(Long tripCarriageId);
    List<TripSeat> findByTripCarriageIdIn(List<Long> tripCarriageIds);
    int countByTripCarriageId(Long tripCarriageId);

    /** Xóa toàn bộ ghế thuộc các toa của 1 trip (bulk). */
    @Modifying
    @Query("DELETE FROM TripSeat ts WHERE ts.tripCarriage.id IN " +
           "(SELECT c.id FROM TripCarriage c WHERE c.trip.id = :tripId)")
    void deleteByTripIdBulk(@Param("tripId") Integer tripId);
}
