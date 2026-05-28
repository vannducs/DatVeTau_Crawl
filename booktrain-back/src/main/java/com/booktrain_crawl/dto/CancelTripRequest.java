package com.booktrain_crawl.dto;

public record CancelTripRequest(
    String cancelReason,
    String adminPassword
) {}
