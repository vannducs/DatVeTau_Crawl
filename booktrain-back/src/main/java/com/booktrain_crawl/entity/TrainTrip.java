package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "train_trips")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id", nullable = false)
    private Train train;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id", nullable = false)
    private TrainStation fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id", nullable = false)
    private TrainStation toStation;

    @Column(name = "departure_datetime", nullable = false)
    private OffsetDateTime departureDatetime;

    @Column(name = "arrival_datetime", nullable = false)
    private OffsetDateTime arrivalDatetime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "min_price")
    private Long minPrice;

    @Column(name = "max_price")
    private Long maxPrice;

    @Column(name = "total_seats")
    private Integer totalSeats = 0;

    @Column(name = "available_seats")
    private Integer availableSeats = 0;

    @Column(name = "vexere_id_index", unique = true, length = 60)
    private String vexereIdIndex;

    @Column(name = "vexere_train_id")
    private Long vexereTrainId;

    @Column(name = "vexere_session", length = 20)
    private String vexereSession;

    @Column(name = "crawled_at")
    private OffsetDateTime crawledAt;

    // open | cancelled | completed
    @Column(nullable = false, length = 20)
    private String status;

    // Admin ẩn chuyến khỏi search công khai (crawl lại KHÔNG ghi đè)
    // KHÔNG để nullable=false: tránh Hibernate ddl-auto=update fail khi ADD COLUMN
    // trên bảng đã có dữ liệu (NOT NULL không default → PostgreSQL từ chối).
    @Column(name = "is_hidden")
    @Builder.Default
    private Boolean isHidden = false;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "cancelled_by")
    private Integer cancelledBy;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = "open";
        if (isHidden == null) isHidden = false;
        createdAt = OffsetDateTime.now();
    }
}
