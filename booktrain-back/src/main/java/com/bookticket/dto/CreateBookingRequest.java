package com.bookticket.dto;

import java.util.List;

public record CreateBookingRequest(
        Integer tripId,
        Integer fromStationId,
        Integer toStationId,
        List<PassengerDto> passengers,
        ContactDto contact,
        Long totalPrice,
        Long serviceFee
) {
    public record PassengerDto(
            Integer seatId,
            String  seatNumber,
            String  berthPosition,
            Integer carriageOrder,
            String  carriageType,
            Long    ticketPrice,
            String  passengerName,
            String  idNumber,
            String  phoneNumber,
            String  dateOfBirth
    ) {}

    public record ContactDto(
            String name,
            String phone,
            String email
    ) {}
}
