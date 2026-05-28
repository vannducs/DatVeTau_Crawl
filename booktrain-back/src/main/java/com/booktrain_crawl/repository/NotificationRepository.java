package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.booktrain_crawl.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
}
