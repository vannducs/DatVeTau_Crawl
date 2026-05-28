package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "trip_seats",
       uniqueConstraints = @UniqueConstraint(columnNames = {"trip_carriage_id", "seat_number"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_carriage_id", nullable = false)
    private TripCarriage tripCarriage;

    @Column(name = "seat_number", nullable = false, length = 5)
    private String seatNumber; // "01".."32" (seat) hoặc "01-L","01-M","01-U" (sleeper)

    @Column(name = "compartment_no")
    private Integer compartmentNo; // null cho toa ngồi

    // seat | lower | middle | upper
    @Column(name = "berth_position", nullable = false, length = 10)
    private String berthPosition;
}
