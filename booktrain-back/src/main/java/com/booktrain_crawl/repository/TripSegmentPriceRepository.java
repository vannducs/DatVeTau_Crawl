package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.TripSegmentPrice;

import java.util.List;
import java.util.Optional;

public interface TripSegmentPriceRepository extends JpaRepository<TripSegmentPrice, Integer> {
    List<TripSegmentPrice> findByTripId(Integer tripId);
    List<TripSegmentPrice> findByTripIdAndFromStationIdAndToStationId(
            Integer tripId, Integer fromStationId, Integer toStationId);
    void deleteByTripId(Integer tripId);

    /** Xóa toàn bộ giá segment của 1 trip (bulk). */
    @Modifying
    @Query("DELETE FROM TripSegmentPrice p WHERE p.trip.id = :tripId")
    void deleteByTripIdBulk(@Param("tripId") Integer tripId);

    @Query("""
        SELECT p FROM TripSegmentPrice p
        WHERE p.trip.id        = :tripId
          AND p.fromStation.id = :fromId
          AND p.toStation.id   = :toId
          AND p.carriageType   = :carriageType
          AND p.berthPosition  = :berthPosition
    """)
    Optional<TripSegmentPrice> findByKey(
            @Param("tripId")       Integer tripId,
            @Param("fromId")       Integer fromId,
            @Param("toId")         Integer toId,
            @Param("carriageType") String  carriageType,
            @Param("berthPosition")String  berthPosition
    );
}
