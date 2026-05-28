package com.booktrain_crawl.dto;

public record ConfirmPaymentRequest(
        String orderCode,
        String transactionNo,
        long amount,
        String responseCode
) {}
