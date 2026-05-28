package com.bookticket.controller;

import com.bookticket.dto.SeatDTO;
import com.bookticket.dto.TripResultDTO;
import com.bookticket.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    @GetMapping("/search")
    public ResponseEntity<List<TripResultDTO>> searchTrips(
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(tripService.searchTrips(fromStationId, toStationId, date));
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResultDTO> getTripById(
            @PathVariable Integer tripId,
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId) {
        return ResponseEntity.ok(tripService.getTripById(tripId, fromStationId, toStationId));
    }

    @GetMapping("/{tripId}/seats")
    public ResponseEntity<Map<Integer, List<SeatDTO>>> getSeats(
            @PathVariable Integer tripId,
            @RequestParam Integer fromStationId,
            @RequestParam Integer toStationId) {
        return ResponseEntity.ok(tripService.getSeatsForTrip(tripId, fromStationId, toStationId));
    }
}
