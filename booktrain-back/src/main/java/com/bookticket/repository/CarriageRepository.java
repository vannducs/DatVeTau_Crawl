package com.bookticket.repository;

import com.bookticket.entity.Carriage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CarriageRepository extends JpaRepository<Carriage, Integer> {
    List<Carriage> findByStatus(String status);
    List<Carriage> findByCarriageType(String carriageType);
    List<Carriage> findByStatusOrderByCarriageCodeAsc(String status);
    boolean existsByCarriageCode(String carriageCode);
}
