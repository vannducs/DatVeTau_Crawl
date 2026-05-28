package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.dto.SeatDTO;
import com.booktrain_crawl.dto.TripResultDTO;
import com.booktrain_crawl.service.TripService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    /** GET /api/trips/search?fromStationId=&toStationId=&date= */
    @GetMapping("/search")
    public ResponseEntity<List<TripResultDTO>> searchTrips(
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(tripService.searchTrips(fromStationId, toStationId, date));
    }

    /** GET /api/trips/{tripId}?fromStationId=&toStationId= */
    @GetMapping("/{tripId}")
    public ResponseEntity<TripResultDTO> getTripById(
            @PathVariable Integer tripId,
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId) {
        return ResponseEntity.ok(tripService.getTripById(tripId, fromStationId, toStationId));
    }

    /** GET /api/trips/{tripId}/seats?fromStationId=&toStationId= — sơ đồ ghế (frontend dùng) */
    @GetMapping("/{tripId}/seats")
    public ResponseEntity<Map<Integer, List<SeatDTO>>> getSeats(
            @PathVariable Integer tripId,
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId) {
        return ResponseEntity.ok(tripService.getSeatsForTrip(tripId, fromStationId, toStationId));
    }

    /** GET /api/trips/{tripId}/carriages — danh sách toa của chuyến */
    @GetMapping("/{tripId}/carriages")
    public ResponseEntity<List<Map<String, Object>>> getCarriages(@PathVariable Integer tripId) {
        return ResponseEntity.ok(tripService.getTripCarriages(tripId));
    }

    /** GET /api/trips/{tripId}/carriages/{carriageId}/seats — ghế trong một toa */
    @GetMapping("/{tripId}/carriages/{carriageId}/seats")
    public ResponseEntity<List<Map<String, Object>>> getCarriageSeats(
            @PathVariable Integer tripId,
            @PathVariable Long carriageId) {
        return ResponseEntity.ok(tripService.getCarriageSeats(carriageId));
    }
}
