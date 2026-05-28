package com.bookticket.dto;

public record PassengerSummaryDto(
        String passengerName,
        int carriageNumber,
        String seatNumber,
        String carriageType,
        long ticketPrice,
        String idNumber
) {}
