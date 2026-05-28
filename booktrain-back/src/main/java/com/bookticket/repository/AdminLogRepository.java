package com.bookticket.repository;

import com.bookticket.entity.AdminLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminLogRepository extends JpaRepository<AdminLog, Integer> {
}
