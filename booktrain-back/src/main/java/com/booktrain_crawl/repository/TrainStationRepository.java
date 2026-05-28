package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.TrainStation;

import java.util.List;
import java.util.Optional;

public interface TrainStationRepository extends JpaRepository<TrainStation, Integer> {
    List<TrainStation> findAllByOrderByOrderIndexAsc();
    Optional<TrainStation> findByCode(String code);
    Optional<TrainStation> findByVexereCode(String vexereCode);
}
