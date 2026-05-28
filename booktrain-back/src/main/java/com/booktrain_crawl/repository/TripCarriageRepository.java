package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.TripCarriage;

import java.util.List;

public interface TripCarriageRepository extends JpaRepository<TripCarriage, Long> {
    List<TripCarriage> findByTripIdOrderByCarriageOrder(Integer tripId);
    long countByTripId(Integer tripId);
    void deleteByTripId(Integer tripId);
}
