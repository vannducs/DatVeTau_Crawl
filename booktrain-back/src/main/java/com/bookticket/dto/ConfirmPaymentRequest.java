package com.bookticket.dto;

public record ConfirmPaymentRequest(
        String orderCode,
        String transactionNo,
        long amount,
        String responseCode
) {}
