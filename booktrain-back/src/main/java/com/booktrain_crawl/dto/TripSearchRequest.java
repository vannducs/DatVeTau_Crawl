package com.booktrain_crawl.dto;

import lombok.Data;

@Data
public class TripSearchRequest {
    private Integer originId;
    private Integer destinationId;
    private String departureDate; // "yyyy-MM-dd"
}