package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final JdbcTemplate jdbc;

    private Integer userId(UserDetails u) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Integer.class, u.getUsername());
    }

    /**
     * GET /api/notifications — lấy thông báo của user hiện tại
     * Gồm: thông báo gửi riêng cho user + thông báo broadcast (user_id IS NULL)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Integer uid = userId(userDetails);

        Long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE user_id = ? OR user_id IS NULL
                """, Long.class, uid);

        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, title, body, noti_type, is_read, created_at
                FROM notifications
                WHERE user_id = ? OR user_id IS NULL
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """, uid, size, (long) page * size);

        return ResponseEntity.ok(Map.of(
                "notifications", rows,
                "total", total != null ? total : 0L));
    }

    /**
     * GET /api/notifications/unread-count — số thông báo chưa đọc
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {

        Integer uid = userId(userDetails);
        Long count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE (user_id = ? OR user_id IS NULL) AND is_read = false
                """, Long.class, uid);

        return ResponseEntity.ok(Map.of("count", count != null ? count : 0L));
    }

    /**
     * PUT /api/notifications/{id}/read — đánh dấu đã đọc
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        jdbc.update("UPDATE notifications SET is_read = true WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * PUT /api/notifications/read-all — đánh dấu tất cả đã đọc
     */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(
            @AuthenticationPrincipal UserDetails userDetails) {

        Integer uid = userId(userDetails);
        jdbc.update("""
                UPDATE notifications SET is_read = true
                WHERE (user_id = ? OR user_id IS NULL) AND is_read = false
                """, uid);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
