package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "carriages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Carriage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "carriage_code", nullable = false, length = 20, unique = true)
    private String carriageCode;

    // seat | sleeper_3 | sleeper_2
    @Column(name = "carriage_type", nullable = false, length = 20)
    private String carriageType;

    @Column(name = "is_vip", nullable = false)
    private Boolean isVip;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    // available | in_use | maintenance
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (isVip == null) isVip = false;
        if (status == null) status = "available";
        createdAt = OffsetDateTime.now();
    }
}
