package com.booktrain_crawl.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeatDTO {
    private Integer id;
    private String seatNumber;
    private Integer compartmentNo;
    private String berthPosition;
    private Integer carriageId;
    private Integer carriageOrder;
    private String carriageType;
    private Boolean isVip;
    private String status;    // "available" | "booked"
    private Long price;       // từ trip_segment_prices
}
