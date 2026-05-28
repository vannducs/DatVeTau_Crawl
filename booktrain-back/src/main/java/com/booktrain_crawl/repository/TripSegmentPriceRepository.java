package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.TripSegmentPrice;

import java.util.List;

public interface TripSegmentPriceRepository extends JpaRepository<TripSegmentPrice, Integer> {
    List<TripSegmentPrice> findByTripId(Integer tripId);
    List<TripSegmentPrice> findByTripIdAndFromStationIdAndToStationId(
            Integer tripId, Integer fromStationId, Integer toStationId);
    void deleteByTripId(Integer tripId);
}
