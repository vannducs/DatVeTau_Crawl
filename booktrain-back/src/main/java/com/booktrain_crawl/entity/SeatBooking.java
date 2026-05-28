package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "seat_bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_seat_id", nullable = false)
    private TripSeat tripSeat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private TrainTrip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id", nullable = false)
    private TrainStation fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id", nullable = false)
    private TrainStation toStation;

    @Column(name = "from_order_index", nullable = false)
    private Integer fromOrderIndex;

    @Column(name = "to_order_index", nullable = false)
    private Integer toOrderIndex;

    @Column(name = "ticket_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal ticketPrice;

    // confirmed | cancelled
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = "confirmed";
        createdAt = OffsetDateTime.now();
    }
}
