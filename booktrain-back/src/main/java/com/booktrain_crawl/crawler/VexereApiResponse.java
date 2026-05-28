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

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TripData {
        @JsonProperty("idIndex")       private String idIndex;
        @JsonProperty("trainNumber")   private String trainNumber;
        @JsonProperty("trainId")       private Long   trainId;
        @JsonProperty("hanhTrinhId")   private Long   hanhTrinhId;
        @JsonProperty("session")       private String session;
        @JsonProperty("startPoint")    private String startPoint;
        @JsonProperty("endPoint")      private String endPoint;
        @JsonProperty("departurePlace")private String departurePlace;
        @JsonProperty("arrivalPlace")  private String arrivalPlace;
        @JsonProperty("date")          private String date;
        @JsonProperty("time")          private String time;
        @JsonProperty("arrivalDate")   private String arrivalDate;
        @JsonProperty("arrivalTime")   private String arrivalTime;
        @JsonProperty("duration")      private Integer duration;
        @JsonProperty("minPrice")      private Long minPrice;
        @JsonProperty("maxPrice")      private Long maxPrice;
        @JsonProperty("minPriceMarkup")private Long minPriceMarkup;
        @JsonProperty("maxPriceMarkup")private Long maxPriceMarkup;
        @JsonProperty("seatAvailable") private Integer seatAvailable;
        @JsonProperty("totalToa")      private Integer totalToa;
        @JsonProperty("distance")      private Integer distance;
        @JsonProperty("company")       private Company company;
        @JsonProperty("listToaXe")     private List<ToaXe> listToaXe;
        @JsonProperty("seatGroupStatus") private List<SeatGroupStatus> seatGroupStatus;
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
        @JsonProperty("id")             private Long    id;
        @JsonProperty("toaNo")          private Integer toaNo;
        @JsonProperty("toaSo")          private String  toaSo;
        @JsonProperty("toaXe")          private String  toaXe;          // model: "A64LV"
        @JsonProperty("toaXeDienGiai")  private String  toaXeDienGiai;  // "Ngồi mềm điều hòa"
        @JsonProperty("nhomChoWeb")     private String  nhomChoWeb;     // NGM | NAC | NAM
        @JsonProperty("minPrice")       private Long    minPrice;
        @JsonProperty("soChoTrong")     private Integer soChoTrong;     // available seats
        @JsonProperty("soChoCon")       private Integer soChoCon;       // total seats
        @JsonProperty("priceData")      private List<PriceData> priceData;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PriceData {
        @JsonProperty("id")         private Long   id;
        @JsonProperty("loaiCho")    private String loaiCho;
        @JsonProperty("tenLoaiCho") private String tenLoaiCho;
        @JsonProperty("nhomChoWeb") private String nhomChoWeb;
        @JsonProperty("giaVe")      private Long   giaVe;
        @JsonProperty("tienThu")    private Long   tienThu;
        @JsonProperty("chos")       private Object chos;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SeatGroupStatus {
        @JsonProperty("type")         private String      type;     // NGM | NAC | NAM
        @JsonProperty("quantity")     private Integer     quantity;
        @JsonProperty("prices")       private List<Long>  prices;
        @JsonProperty("pricesMarkup") private List<Long>  pricesMarkup;
    }
}
