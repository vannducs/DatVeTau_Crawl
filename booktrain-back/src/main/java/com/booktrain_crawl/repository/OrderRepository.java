package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.Order;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    Optional<Order> findByOrderCode(String orderCode);

    @Query("SELECT o FROM Order o WHERE o.orderCode LIKE CONCAT('%', :suffix) ORDER BY o.id DESC")
    List<Order> findByOrderCodeEndingWith(@Param("suffix") String suffix);
}
