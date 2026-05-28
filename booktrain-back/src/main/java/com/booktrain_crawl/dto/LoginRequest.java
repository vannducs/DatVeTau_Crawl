package com.booktrain_crawl.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String identifier;
    private String password;
}
