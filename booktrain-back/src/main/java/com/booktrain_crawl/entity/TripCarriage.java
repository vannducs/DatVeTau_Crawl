package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "trip_carriages",
       uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "carriage_order"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripCarriage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private TrainTrip trip;

    @Column(name = "carriage_order", nullable = false)
    private Integer carriageOrder;

    @Column(name = "carriage_model", length = 20)
    private String carriageModel; // "A64LV", "Bn42LM"

    @Column(name = "carriage_name", length = 100)
    private String carriageName; // "Ngồi mềm điều hòa"

    // seat | sleeper_3 | sleeper_2
    @Column(name = "carriage_type", nullable = false, length = 20)
    private String carriageType;

    @Column(name = "seat_group", length = 10)
    private String seatGroup; // NGM | NAC | NAM

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats = 0;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats = 0;

    @Column(name = "min_price")
    private Long minPrice;

    @Column(name = "vexere_id")
    private Long vexereId;
}
