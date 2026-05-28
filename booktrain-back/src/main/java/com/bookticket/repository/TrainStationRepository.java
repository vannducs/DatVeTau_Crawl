package com.bookticket.repository;

import com.bookticket.entity.TrainStation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TrainStationRepository extends JpaRepository<TrainStation, Integer> {
    List<TrainStation> findAllByOrderByOrderIndexAsc();
    Optional<TrainStation> findByCode(String code);
}
