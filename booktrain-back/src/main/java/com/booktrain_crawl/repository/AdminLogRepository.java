package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.AdminLog;

public interface AdminLogRepository extends JpaRepository<AdminLog, Integer> {
}
