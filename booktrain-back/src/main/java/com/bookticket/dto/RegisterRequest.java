package com.bookticket.dto;
import lombok.*;

@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String phoneNumber;
    private String dateOfBirth;  // Nhận dạng "yyyy-MM-dd", parse sau
    private String gender;       // "male" | "female" | "other"
    private String accountType;  // "customer" | "partner"
}
