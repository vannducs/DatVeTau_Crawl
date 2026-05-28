package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trains")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Train {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "train_code", nullable = false, length = 20, unique = true)
    private String trainCode; // SE1-SE6

    @Column(name = "train_name", length = 150)
    private String trainName;

    @Column(name = "company_code", length = 10)
    private String companyCode;

    @Column(name = "company_name", length = 100)
    private String companyName;

    @Column(nullable = false, length = 20)
    private String status; // active | inactive | maintenance

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = "active";
        createdAt = OffsetDateTime.now();
    }
}
