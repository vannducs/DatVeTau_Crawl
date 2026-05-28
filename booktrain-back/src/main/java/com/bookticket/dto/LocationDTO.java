package com.bookticket.dto;

import lombok.Data;

@Data
public class LocationDTO {
    private Integer id;
    private String name;
    private String code;
    private String city;
    private Integer orderIndex;
}
