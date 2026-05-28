package com.booktrain_crawl.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.CrawlerLog;

public interface CrawlerLogRepository extends JpaRepository<CrawlerLog, Integer> {
    Page<CrawlerLog> findAllByOrderByCrawledAtDesc(Pageable pageable);
}
