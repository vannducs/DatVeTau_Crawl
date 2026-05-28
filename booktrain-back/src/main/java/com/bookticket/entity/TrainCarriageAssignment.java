package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "train_carriage_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainCarriageAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id", nullable = false)
    private Train train;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carriage_id", nullable = false)
    private Carriage carriage;

    @Column(name = "carriage_order", nullable = false)
    private Integer carriageOrder;

    @Column(name = "assigned_at", updatable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "unassigned_at")
    private OffsetDateTime unassignedAt; // NULL = đang gắn vào tàu

    @PrePersist
    protected void onCreate() {
        assignedAt = OffsetDateTime.now();
    }
}
