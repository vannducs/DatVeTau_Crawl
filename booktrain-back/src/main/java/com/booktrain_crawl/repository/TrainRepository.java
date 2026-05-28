package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.Train;

import java.util.List;
import java.util.Optional;

public interface TrainRepository extends JpaRepository<Train, Integer> {
    List<Train> findByStatus(String status);
    List<Train> findByStatusOrderByTrainCodeAsc(String status);
    Optional<Train> findByTrainCode(String trainCode);
    boolean existsByTrainCode(String trainCode);
}
