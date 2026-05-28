package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.booktrain_crawl.entity.CrawlerConfig;

import java.util.List;

public interface CrawlerConfigRepository extends JpaRepository<CrawlerConfig, Integer> {

    @Query("SELECT c FROM CrawlerConfig c JOIN FETCH c.fromStation JOIN FETCH c.toStation WHERE c.isActive = true")
    List<CrawlerConfig> findAllActive();

    @Query("SELECT c FROM CrawlerConfig c JOIN FETCH c.fromStation JOIN FETCH c.toStation")
    List<CrawlerConfig> findAllWithStations();
}
