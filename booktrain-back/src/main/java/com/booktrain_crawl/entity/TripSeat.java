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
    private String seatNumber;      // "01".."64" (seat), "01-L1".."07-U2" (sleeper)

    @Column(name = "compartment_no")
    private Integer compartmentNo;  // null cho toa ngồi

    @Column(name = "berth_position", nullable = false, length = 10)
    @Builder.Default
    private String berthPosition = "seat";   // seat | lower | middle | upper

    // ── Fields from Vexere seat detail API (API 2) ──
    @Column(name = "grid_row")
    private Integer gridRow;        // row trong grid Vexere (1-indexed)

    @Column(name = "grid_col")
    private Integer gridCol;        // col trong grid Vexere (1-indexed); col 3 = hành lang

    @Column(name = "seat_code", length = 10)
    private String seatCode;        // "1", "HL" (aisle), "B1" (table)...

    @Column(name = "loai_cho", length = 20)
    private String loaiCho;         // "NML", "NMLV", "BnLT1M"...

    @Column(name = "price")
    private Long price;             // VND đầy đủ (GiaVe × 1000), null nếu chưa có từ API 2

    // Trạng thái từ Vexere tại thời điểm crawl; booking thực tế qua seat_bookings
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "available"; // "available" | "booked"
}
