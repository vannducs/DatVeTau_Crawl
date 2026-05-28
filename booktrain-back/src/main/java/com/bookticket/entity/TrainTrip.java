package com.bookticket.entity;

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

    // open | cancelled | completed
    @Column(nullable = false, length = 20)
    private String status;

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
        createdAt = OffsetDateTime.now();
    }
}
