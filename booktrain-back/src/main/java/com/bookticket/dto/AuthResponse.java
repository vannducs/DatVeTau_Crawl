package com.bookticket.dto;

import lombok.*;

@Data @AllArgsConstructor @Builder @NoArgsConstructor
public class AuthResponse {
    private String token;
    private Integer id;
    private String fullName;
    private String email;
    private String accountType;
    private String phoneNumber;
    private String dateOfBirth;
    private String status;
    private String avatarUrl;
    private String message;
}
