package com.bookticket.controller;

import com.bookticket.entity.Carriage;
import com.bookticket.repository.CarriageRepository;
import com.bookticket.repository.SeatRepository;
import com.bookticket.repository.TrainCarriageAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Manages the standalone carriage pool (/api/admin/carriages).
 * Train-specific carriage assignment lives in TrainAdminController.
 */
@RestController
@RequestMapping("/api/admin/carriages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CarriageAdminController {

    private final CarriageRepository carriageRepo;
    private final SeatRepository seatRepo;
    private final TrainCarriageAssignmentRepository assignmentRepo;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listCarriages(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        List<Carriage> carriages;
        if (status != null)      carriages = carriageRepo.findByStatus(status);
        else if (type != null)   carriages = carriageRepo.findByCarriageType(type);
        else                     carriages = carriageRepo.findAll();

        List<Map<String, Object>> result = carriages.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           c.getId());
            m.put("carriageCode", c.getCarriageCode());
            m.put("carriageType", c.getCarriageType());
            m.put("isVip",        c.getIsVip());
            m.put("amenities",    c.getAmenities());
            m.put("status",       c.getStatus());
            m.put("seatCount",    seatRepo.countByCarriageId(c.getId()));
            assignmentRepo.findByCarriageIdAndUnassignedAtIsNull(c.getId()).ifPresent(a -> {
                m.put("assignedTrainId",   a.getTrain().getId());
                m.put("assignedTrainCode", a.getTrain().getTrainCode());
                m.put("carriageOrder",     a.getCarriageOrder());
            });
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCarriage(@PathVariable Integer id) {
        return carriageRepo.findById(id).map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           c.getId());
            m.put("carriageCode", c.getCarriageCode());
            m.put("carriageType", c.getCarriageType());
            m.put("isVip",        c.getIsVip());
            m.put("amenities",    c.getAmenities());
            m.put("status",       c.getStatus());
            m.put("seats", seatRepo.findByCarriageIdOrderBySeatNumberAsc(c.getId()).stream().map(s -> {
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("id",            s.getId());
                sm.put("seatNumber",    s.getSeatNumber());
                sm.put("compartmentNo", s.getCompartmentNo());
                sm.put("berthPosition", s.getBerthPosition());
                return sm;
            }).toList());
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCarriage(@RequestBody Map<String, Object> body) {
        String carriageType = (String) body.get("carriageType");
        Boolean isVip       = Boolean.TRUE.equals(body.get("isVip"));
        String amenities    = (String) body.getOrDefault("amenities", "");

        if (!Set.of("seat", "sleeper_3", "sleeper_2").contains(carriageType))
            return ResponseEntity.badRequest().body(Map.of("message", "Loại toa không hợp lệ (seat/sleeper_3/sleeper_2)"));

        long count = carriageRepo.count() + 1;
        String code = "C" + String.format("%03d", count);
        while (carriageRepo.existsByCarriageCode(code)) {
            count++;
            code = "C" + String.format("%03d", count);
        }

        Carriage carriage = Carriage.builder()
                .carriageCode(code)
                .carriageType(carriageType)
                .isVip(isVip)
                .amenities(amenities)
                .status("available")
                .build();
        carriage = carriageRepo.save(carriage);

        return ResponseEntity.ok(Map.of(
                "id",           carriage.getId(),
                "carriageCode", carriage.getCarriageCode(),
                "carriageType", carriage.getCarriageType(),
                "message",      "Đã tạo toa " + code));
    }
}
