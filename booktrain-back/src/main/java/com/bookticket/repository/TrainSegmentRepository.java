package com.bookticket.repository;

import com.bookticket.entity.TrainSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TrainSegmentRepository extends JpaRepository<TrainSegment, Integer> {
    Optional<TrainSegment> findByFromStationIdAndToStationId(Integer fromStationId, Integer toStationId);
    List<TrainSegment> findByFromStationId(Integer fromStationId);
}
