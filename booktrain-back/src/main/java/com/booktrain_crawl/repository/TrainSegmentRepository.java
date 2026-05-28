package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.TrainSegment;

import java.util.List;
import java.util.Optional;

public interface TrainSegmentRepository extends JpaRepository<TrainSegment, Integer> {
    Optional<TrainSegment> findByFromStationIdAndToStationId(Integer fromStationId, Integer toStationId);
    List<TrainSegment> findByFromStationId(Integer fromStationId);
}
