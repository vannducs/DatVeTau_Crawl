package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_booking_id")
    private SeatBooking seatBooking;

    @Column(name = "passenger_name", length = 100)
    private String passengerName;

    @Column(name = "id_number", length = 20)
    private String idNumber;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "date_of_birth", length = 20)
    private String dateOfBirth;

    @Column(name = "ticket_price", precision = 15, scale = 2)
    private BigDecimal ticketPrice;

    @Column(nullable = false, length = 20)
    private String status; // confirmed | cancelled | used
}
