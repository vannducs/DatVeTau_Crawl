package com.bookticket.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    @Value("${vnpay.url}")
    private String vnpayUrl;

    @Value("${vnpay.return-url}")
    private String returnUrl;

    public String createPaymentUrl(long amount, String orderCode, String orderInfo, String ipAddress) {
        // VNPay sandbox không chấp nhận IPv6 localhost
        if ("0:0:0:0:0:0:0:1".equals(ipAddress) || "::1".equals(ipAddress)) {
            ipAddress = "127.0.0.1";
        }

        String vnpVersion   = "2.1.0";
        String vnpCommand   = "pay";
        String vnpCurrCode  = "VND";
        String vnpLocale    = "vn";
        String vnpOrderType = "other";

        long vnpAmount = amount * 100;

        String vnpCreateDate = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.MINUTE, 15);
        String vnpExpireDate = new SimpleDateFormat("yyyyMMddHHmmss").format(cal.getTime());

        String txnRef = orderCode;

        Map<String, String> vnpParams = new TreeMap<>();
        vnpParams.put("vnp_Version",    vnpVersion);
        vnpParams.put("vnp_Command",    vnpCommand);
        vnpParams.put("vnp_TmnCode",    tmnCode);
        vnpParams.put("vnp_Amount",     String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode",   vnpCurrCode);
        vnpParams.put("vnp_TxnRef",     txnRef);
        vnpParams.put("vnp_OrderInfo",  orderInfo);
        vnpParams.put("vnp_OrderType",  vnpOrderType);
        vnpParams.put("vnp_Locale",     vnpLocale);
        vnpParams.put("vnp_ReturnUrl",  returnUrl);
        vnpParams.put("vnp_IpAddr",     ipAddress);
        vnpParams.put("vnp_CreateDate", vnpCreateDate);
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query    = new StringBuilder();

        for (Map.Entry<String, String> entry : vnpParams.entrySet()) {
            String key   = entry.getKey();
            String value = entry.getValue();
            if (value != null && !value.isEmpty()) {
                hashData.append(key).append("=")
                        .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
                query.append(URLEncoder.encode(key, StandardCharsets.US_ASCII))
                        .append("=")
                        .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
                hashData.append("&");
                query.append("&");
            }
        }
        if (hashData.length() > 0) hashData.setLength(hashData.length() - 1);
        if (query.length() > 0)    query.setLength(query.length() - 1);

        String secureHash = hmacSHA512(hashSecret, hashData.toString());
        query.append("&vnp_SecureHash=").append(secureHash);

        String fullUrl = vnpayUrl + "?" + query;

        // Log để debug
        System.out.println("=== VNPAY DEBUG ===");
        System.out.println("TxnRef  : " + txnRef);
        System.out.println("Amount  : " + vnpAmount);
        System.out.println("OrderInfo: " + orderInfo);
        System.out.println("URL     : " + fullUrl);
        System.out.println("===================");

        return fullUrl;
    }

    public boolean verifyReturn(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null) return false;

        Map<String, String> toHash = new TreeMap<>();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (!e.getKey().equals("vnp_SecureHash") && !e.getKey().equals("vnp_SecureHashType")) {
                toHash.put(e.getKey(), e.getValue());
            }
        }

        StringBuilder hashData = new StringBuilder();
        for (Map.Entry<String, String> entry : toHash.entrySet()) {
            hashData.append(entry.getKey()).append("=")
                    .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII))
                    .append("&");
        }
        if (hashData.length() > 0) hashData.setLength(hashData.length() - 1);

        String expectedHash = hmacSHA512(hashSecret, hashData.toString());
        return expectedHash.equalsIgnoreCase(receivedHash);
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo HMAC SHA512", e);
        }
    }
}
