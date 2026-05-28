package com.bookticket.dto;

public record CancelTripRequest(
    String cancelReason,
    String adminPassword
) {}
