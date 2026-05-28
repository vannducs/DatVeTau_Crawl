package com.bookticket.controller;

import com.bookticket.entity.TrainStation;
import com.bookticket.repository.TrainStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
public class StationController {

    private final TrainStationRepository stationRepo;

    @GetMapping
    public ResponseEntity<List<TrainStation>> getAll() {
        return ResponseEntity.ok(stationRepo.findAllByOrderByOrderIndexAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrainStation> getById(@PathVariable Integer id) {
        return stationRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
