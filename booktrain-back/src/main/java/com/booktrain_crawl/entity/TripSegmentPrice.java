package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "trip_segment_prices",
       uniqueConstraints = @UniqueConstraint(
           columnNames = {"trip_id","from_station_id","to_station_id","carriage_type","berth_position"}
       ))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripSegmentPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private TrainTrip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id", nullable = false)
    private TrainStation fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id", nullable = false)
    private TrainStation toStation;

    // seat | sleeper_3 | sleeper_2
    @Column(name = "carriage_type", nullable = false, length = 20)
    private String carriageType;

    // seat | lower | middle | upper
    @Column(name = "berth_position", nullable = false, length = 10)
    private String berthPosition;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;
}
