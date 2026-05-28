package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.crawler.VexereCrawlerService;
import com.booktrain_crawl.entity.CrawlerConfig;
import com.booktrain_crawl.entity.CrawlerLog;
import com.booktrain_crawl.repository.CrawlerConfigRepository;
import com.booktrain_crawl.repository.CrawlerLogRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/crawler")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CrawlerController {

    private final VexereCrawlerService   crawlerService;
    private final CrawlerConfigRepository configRepo;
    private final CrawlerLogRepository   logRepo;

    /**
     * POST /api/admin/crawler/trigger
     * Crawl thủ công 1 tuyến 1 ngày (async, fire-and-forget).
     * Body: { from, to, date, vexereToken? }
     */
    @PostMapping("/trigger")
    public ResponseEntity<Map<String, Object>> trigger(@RequestBody Map<String, Object> body) {
        String from      = (String) body.get("from");
        String to        = (String) body.get("to");
        String dateStr   = (String) body.get("date");
        String token     = (String) body.get("vexereToken");

        if (from == null || to == null || dateStr == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Cần cung cấp from, to, date"));

        LocalDate date;
        try { date = LocalDate.parse(dateStr); }
        catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "date không hợp lệ (YYYY-MM-DD)"));
        }

        final LocalDate finalDate = date;
        Thread t = new Thread(() -> crawlerService.crawlAndSave(from, to, finalDate, token), "crawler-manual");
        t.setDaemon(true);
        t.start();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã kích hoạt crawl " + from + "→" + to + " ngày " + date));
    }

    /**
     * POST /api/admin/crawler/trigger-all
     * Crawl đồng bộ toàn bộ tuyến active.
     * Body: { vexereToken?, daysAhead?, specificDate? }
     * Response: { success, totalTrips, totalCarriages, totalSeats, logs[] }
     */
    @PostMapping("/trigger-all")
    public ResponseEntity<Map<String, Object>> triggerAll(
            @RequestBody(required = false) Map<String, Object> body) {

        String  vexereToken  = body != null ? (String) body.get("vexereToken") : null;
        int     daysAhead    = body != null && body.get("daysAhead") instanceof Number n ? n.intValue() : 30;
        String  specificDate = body != null ? (String) body.get("specificDate") : null;

        List<CrawlerConfig> configs = configRepo.findAllActive();
        LocalDate today = LocalDate.now();

        List<Map<String, Object>> logs  = new ArrayList<>();
        int totalTrips = 0, totalCarriages = 0, totalSeats = 0;

        for (CrawlerConfig cfg : configs) {
            String fromCode = cfg.getFromStation().getVexereCode();
            String toCode   = cfg.getToStation().getVexereCode();
            String route    = fromCode + "→" + toCode;

            List<LocalDate> dates;
            if (specificDate != null && !specificDate.isBlank()) {
                try {
                    dates = List.of(LocalDate.parse(specificDate));
                } catch (Exception e) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "specificDate không hợp lệ (YYYY-MM-DD)"));
                }
            } else {
                dates = new ArrayList<>();
                for (int d = 0; d < daysAhead; d++) dates.add(today.plusDays(d));
            }

            for (LocalDate date : dates) {
                VexereCrawlerService.CrawlResult result =
                        crawlerService.crawlAndSave(fromCode, toCode, date, vexereToken);

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("route",      route);
                entry.put("date",       date.toString());
                entry.put("tripsFound", result.tripsFound());
                entry.put("tripsSaved", result.tripsSaved());
                entry.put("status",     result.status());
                logs.add(entry);

                totalTrips     += result.tripsSaved();
                totalCarriages += result.totalCarriages();
                totalSeats     += result.totalSeats();
            }

            cfg.setLastCrawledAt(OffsetDateTime.now());
            configRepo.save(cfg);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success",        true);
        response.put("totalTrips",     totalTrips);
        response.put("totalCarriages", totalCarriages);
        response.put("totalSeats",     totalSeats);
        response.put("logs",           logs);
        return ResponseEntity.ok(response);
    }

    /** GET /api/admin/crawler/logs?page=0&size=20 */
    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> logs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<CrawlerLog> pg = logRepo.findAllByOrderByCrawledAtDesc(PageRequest.of(page, size));
        List<Map<String, Object>> items = pg.getContent().stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           l.getId());
            m.put("fromCode",     l.getFromCode());
            m.put("toCode",       l.getToCode());
            m.put("crawlDate",    l.getCrawlDate()  != null ? l.getCrawlDate().toString()  : null);
            m.put("tripsFound",   l.getTripsFound());
            m.put("tripsSaved",   l.getTripsSaved());
            m.put("status",       l.getStatus());
            m.put("errorMessage", l.getErrorMessage());
            m.put("durationMs",   l.getDurationMs());
            m.put("crawledAt",    l.getCrawledAt() != null ? l.getCrawledAt().toString() : null);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "logs",  items,
                "total", pg.getTotalElements(),
                "page",  page,
                "size",  size));
    }

    /** GET /api/admin/crawler/configs */
    @GetMapping("/configs")
    public ResponseEntity<List<Map<String, Object>>> configs() {
        List<CrawlerConfig> all = configRepo.findAllWithStations();
        List<Map<String, Object>> result = all.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",       c.getId());
            m.put("from",     c.getFromStation().getCode());
            m.put("fromName", c.getFromStation().getName());
            m.put("fromVexere", c.getFromStation().getVexereCode());
            m.put("to",       c.getToStation().getCode());
            m.put("toName",   c.getToStation().getName());
            m.put("toVexere", c.getToStation().getVexereCode());
            m.put("isActive", c.getIsActive());
            m.put("daysAhead",c.getDaysAhead());
            m.put("lastCrawledAt", c.getLastCrawledAt() != null ? c.getLastCrawledAt().toString() : null);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** PUT /api/admin/crawler/configs/{id} — bật/tắt tuyến */
    @PutMapping("/configs/{id}")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {

        return configRepo.findById(id).map(cfg -> {
            if (body.containsKey("isActive"))
                cfg.setIsActive(Boolean.TRUE.equals(body.get("isActive")));
            if (body.containsKey("daysAhead") && body.get("daysAhead") instanceof Number n)
                cfg.setDaysAhead(n.intValue());
            configRepo.save(cfg);
            return ResponseEntity.ok(Map.<String, Object>of("success", true, "message", "Đã cập nhật config"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
