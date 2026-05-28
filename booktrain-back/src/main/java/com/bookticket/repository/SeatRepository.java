package com.bookticket.repository;

import com.bookticket.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {
    List<Seat> findByCarriageId(Integer carriageId);
    List<Seat> findByCarriageIdOrderBySeatNumberAsc(Integer carriageId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Seat s WHERE s.carriage.id = :carriageId")
    void deleteByCarriageId(@Param("carriageId") Integer carriageId);

    int countByCarriageId(Integer carriageId);
}
