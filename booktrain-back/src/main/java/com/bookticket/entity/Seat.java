package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "seats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carriage_id", nullable = false)
    private Carriage carriage;

    @Column(name = "seat_number", nullable = false, length = 10)
    private String seatNumber; // "01"-"32" hoặc "01-L","01-M","01-U"

    @Column(name = "compartment_no")
    private Integer compartmentNo; // null cho toa ngồi, 1-6 cho toa nằm

    // seat | lower | middle | upper
    @Column(name = "berth_position", nullable = false, length = 10)
    private String berthPosition;
}
