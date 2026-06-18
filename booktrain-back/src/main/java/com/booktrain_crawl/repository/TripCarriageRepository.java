package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.TripCarriage;

import java.util.List;

public interface TripCarriageRepository extends JpaRepository<TripCarriage, Long> {
    List<TripCarriage> findByTripIdOrderByCarriageOrder(Integer tripId);
    long countByTripId(Integer tripId);
    void deleteByTripId(Integer tripId);

    /** Xóa toàn bộ toa của 1 trip (bulk). */
    @Modifying
    @Query("DELETE FROM TripCarriage c WHERE c.trip.id = :tripId")
    void deleteByTripIdBulk(@Param("tripId") Integer tripId);
}
