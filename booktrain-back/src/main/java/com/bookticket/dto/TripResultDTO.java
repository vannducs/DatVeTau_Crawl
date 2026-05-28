package com.bookticket.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class TripResultDTO {
    private Integer tripId;
    private String trainCode;
    private String trainName;
    private String fromStationName;
    private String toStationName;
    private String fromStationCode;
    private String toStationCode;
    private String boardTime;   // HH:mm
    private String alightTime;  // HH:mm
    private String boardDate;   // dd/MM/yyyy
    private String alightDate;
    private String duration;    // "Xh Yp"
    private boolean nextDay;
    private List<CarriageSummaryDTO> carriageSummary;

    @Data
    @Builder
    public static class CarriageSummaryDTO {
        private Integer carriageOrder;
        private String carriageType;
        private Boolean isVip;
        private String amenities;
        private Integer availableSeats;
        private Integer totalSeats;
        private Long minPrice;
    }
}
