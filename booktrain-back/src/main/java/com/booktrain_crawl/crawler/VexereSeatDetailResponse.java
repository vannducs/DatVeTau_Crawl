package com.booktrain_crawl.crawler;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Response của POST /v2/train/seatByTrainCar.
 * Cấu trúc: { data: { coach_seat_template: [ { seats: [...] } ] } }
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class VexereSeatDetailResponse {

    @JsonProperty("data")
    private Data data;

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Data {
        @JsonProperty("coach_seat_template")
        private List<CoachSeatTemplate> coachSeatTemplate;
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CoachSeatTemplate {
        @JsonProperty("coach_num")
        private Integer coachNum;   

        @JsonProperty("seats")
        private List<Seat> seats;
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Seat {
        @JsonProperty("row")          private Integer row;
        @JsonProperty("col")          private Integer col;
        @JsonProperty("name")         private String  name;
        @JsonProperty("seat_code")    private String  seatCode;
        @JsonProperty("is_available") private Boolean isAvailable;
        @JsonProperty("train_data")   private TrainData trainData;
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TrainData {
        @JsonProperty("ChoSo")   private Integer choSo;    
        @JsonProperty("LoaiCho") private String  loaiCho;  
        @JsonProperty("GiaVe")   private Long    giaVe;    
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SeatStatus {
        @JsonProperty("Status") private Integer status; 
    }
}
