package com.booktrain_crawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_stations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 10, unique = true)
    private String code; // HN / VI / DN / SG

    @Column(name = "vexere_code", length = 5, unique = true)
    private String vexereCode; // HNO / VIN / DNA / SGO

    @Column(length = 100)
    private String city;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex; // 1=HN, 2=Vinh, 3=DN, 4=SG
}
