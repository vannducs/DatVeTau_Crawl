package com.booktrain_crawl.dto;

import java.util.List;

public record OrderSummaryDto(
        String orderCode,
        String status,
        String tripStatus,
        long totalAmount,
        long serviceFee,
        String createdAt,
        String trainCode,
        String trainName,
        String originName,
        String destinationName,
        String departureTime,
        String arrivalTime,
        String paymentMethod,
        String transactionCode,
        String paidAt,
        String note,
        List<PassengerSummaryDto> passengers
) {}
