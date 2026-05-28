package com.bookticket.repository;

import com.bookticket.entity.TrainCarriageAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface TrainCarriageAssignmentRepository extends JpaRepository<TrainCarriageAssignment, Integer> {

    @Query("""
        SELECT a FROM TrainCarriageAssignment a
        JOIN FETCH a.carriage
        WHERE a.train.id = :trainId AND a.unassignedAt IS NULL
        ORDER BY a.carriageOrder ASC
    """)
    List<TrainCarriageAssignment> findByTrainIdAndUnassignedAtIsNull(@Param("trainId") Integer trainId);

    Optional<TrainCarriageAssignment> findByCarriageIdAndUnassignedAtIsNull(Integer carriageId);

    boolean existsByTrainIdAndUnassignedAtIsNull(Integer trainId);

    int countByTrainIdAndUnassignedAtIsNull(Integer trainId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TrainCarriageAssignment a WHERE a.carriage.id = :carriageId")
    void deleteByCarriageId(@Param("carriageId") Integer carriageId);
}
