package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.TripSeat;

import java.util.List;

public interface TripSeatRepository extends JpaRepository<TripSeat, Long> {
    List<TripSeat> findByTripCarriageIdOrderBySeatNumber(Long tripCarriageId);
    List<TripSeat> findByTripCarriageIdIn(List<Long> tripCarriageIds);
    int countByTripCarriageId(Long tripCarriageId);
}
