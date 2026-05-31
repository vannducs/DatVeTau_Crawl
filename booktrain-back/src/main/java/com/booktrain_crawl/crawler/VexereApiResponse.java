package com.booktrain_crawl.crawler;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class VexereApiResponse {

    @JsonProperty("data")
    private List<TripData> data;

    @JsonProperty("booking_code")
    private String bookingCode;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TripData {
        @JsonProperty("idIndex")            private String  idIndex;       // camelCase confirmed working
        @JsonProperty("train_number")       private String  trainNumber;   // snake_case
        @JsonProperty("train_id")           private Long    trainId;
        @JsonProperty("hanh_trinh_id")      private Long    hanhTrinhId;
        @JsonProperty("session")            private String  session;
        @JsonProperty("start_point")        private String  startPoint;
        @JsonProperty("end_point")          private String  endPoint;
        @JsonProperty("departure_place")    private String  departurePlace;
        @JsonProperty("arrival_place")      private String  arrivalPlace;
        @JsonProperty("date")               private String  date;
        @JsonProperty("time")               private String  time;
        @JsonProperty("arrival_date")       private String  arrivalDate;
        @JsonProperty("arrival_time")       private String  arrivalTime;
        @JsonProperty("duration")           private Integer duration;
        @JsonProperty("min_price")          private Long    minPrice;
        @JsonProperty("max_price")          private Long    maxPrice;
        @JsonProperty("min_price_markup")   private Long    minPriceMarkup;
        @JsonProperty("max_price_markup")   private Long    maxPriceMarkup;
        @JsonProperty("seat_available")     private Integer seatAvailable;
        @JsonProperty("total_toa")          private Integer totalToa;
        @JsonProperty("distance")           private Integer distance;
        @JsonProperty("company")            private Company company;
        @JsonProperty("list_toa_xe")        private List<ToaXe> listToaXe;
        @JsonProperty("seat_group_status")  private List<SeatGroupStatus> seatGroupStatus;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Company {
        @JsonProperty("code") private String code;
        @JsonProperty("name") private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ToaXe {
        @JsonProperty("id")               private Long    id;
        @JsonProperty("toa_no")           private Integer toaNo;
        @JsonProperty("toa_so")           private String  toaSo;
        @JsonProperty("toa_xe")           private String  toaXe;          // model: "A64LV"
        @JsonProperty("toa_xe_dien_giai") private String  toaXeDienGiai;  // "Ngồi mềm điều hòa"
        @JsonProperty("nhom_cho_web")     private String  nhomChoWeb;     // NGM | NAC | NAM
        @JsonProperty("min_price")        private Long    minPrice;
        @JsonProperty("so_cho_trong")     private Integer soChoTrong;     // available seats
        @JsonProperty("so_cho_con")       private Integer soChoCon;       // total seats
        @JsonProperty("price_data")       private List<PriceData> priceData;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PriceData {
        @JsonProperty("id")           private Long   id;
        @JsonProperty("loai_cho")     private String loaiCho;
        @JsonProperty("ten_loai_cho") private String tenLoaiCho;
        @JsonProperty("nhom_cho_web") private String nhomChoWeb;
        @JsonProperty("gia_ve")       private Long   giaVe;
        @JsonProperty("tien_thu")     private Long   tienThu;
        @JsonProperty("chos")         private Object chos;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SeatGroupStatus {
        @JsonProperty("type")         private String      type;
        @JsonProperty("quantity")     private Integer     quantity;
        @JsonProperty("prices")       private List<Long>  prices;
        @JsonProperty("pricesMarkup") private List<Long>  pricesMarkup;
    }
}
