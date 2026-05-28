package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_segments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id", nullable = false)
    private TrainStation fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id", nullable = false)
    private TrainStation toStation;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "distance_km")
    private Integer distanceKm;
}
