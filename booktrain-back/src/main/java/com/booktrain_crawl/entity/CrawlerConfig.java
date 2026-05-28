package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "crawler_configs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"from_station_id", "to_station_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrawlerConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id", nullable = false)
    private TrainStation fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id", nullable = false)
    private TrainStation toStation;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "days_ahead")
    private Integer daysAhead = 30;

    @Column(name = "last_crawled_at")
    private OffsetDateTime lastCrawledAt;
}
