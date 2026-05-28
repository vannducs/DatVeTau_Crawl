package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "crawler_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrawlerLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "from_code", length = 5)
    private String fromCode;

    @Column(name = "to_code", length = 5)
    private String toCode;

    @Column(name = "crawl_date")
    private LocalDate crawlDate;

    @Builder.Default
    @Column(name = "trips_found")
    private Integer tripsFound = 0;

    @Builder.Default
    @Column(name = "trips_saved")
    private Integer tripsSaved = 0;

    @Column(length = 20)
    private String status; // success | failed | partial

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "crawled_at")
    private OffsetDateTime crawledAt;

    @PrePersist
    protected void onCreate() {
        crawledAt = OffsetDateTime.now();
    }
}
