package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.entity.TrainStation;
import com.booktrain_crawl.repository.TrainStationRepository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * READ-ONLY: danh sách ga tàu cho trang admin Quản lý ga tàu.
 * Schema mới không CRUD ga thủ công — chỉ hiển thị 4 ga từ train_stations.
 */
@RestController
@RequestMapping("/api/admin/locations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class LocationAdminController {

    private final TrainStationRepository stationRepo;

    /** GET /api/admin/locations — 4 ga, sắp theo order_index */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        List<TrainStation> stations = stationRepo.findAllByOrderByOrderIndexAsc();
        List<Map<String, Object>> result = stations.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                s.getId());
            m.put("code",              s.getCode());
            m.put("name",              s.getName());
            m.put("vexere_code",       s.getVexereCode());
            m.put("vexere_station_id", s.getVexereStationId());
            m.put("order_index",       s.getOrderIndex());
            m.put("city",              s.getCity());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
