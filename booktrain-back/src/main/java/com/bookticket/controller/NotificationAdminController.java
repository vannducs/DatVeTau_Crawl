package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final JdbcTemplate jdbc;

    private Integer adminId(UserDetails u) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Integer.class, u.getUsername());
    }

    private void logAction(Integer adminId, String action, String targetType, Integer targetId, String detail) {
        jdbc.update(
            "INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,NOW())",
            adminId, action, targetType, targetId, detail);
    }

    record SendRequest(Integer userId, String title, String body) {}

    /** POST /api/admin/notifications/send */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(
            @RequestBody SendRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (req.title() == null || req.title().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Tiêu đề không được trống"));
        if (req.body() == null || req.body().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Nội dung không được trống"));

        if (req.userId() == null) {
            // Broadcast — gửi cho tất cả customer
            List<Integer> userIds = jdbc.queryForList(
                    "SELECT id FROM users WHERE account_type = 'customer'", Integer.class);
            for (Integer uid : userIds) {
                jdbc.update("""
                        INSERT INTO notifications (user_id, title, body, noti_type, is_read, created_at)
                        VALUES (?, ?, ?, 'admin', false, NOW())
                        """, uid, req.title(), req.body());
            }
            logAction(adminId(userDetails), "SEND_NOTIFICATION", "notification", null,
                    "Broadcast (" + userIds.size() + " users): " + req.title());
        } else {
            // Single user
            boolean userExists = Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)", Boolean.class, req.userId()));
            if (!userExists)
                return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy người dùng"));

            jdbc.update("""
                    INSERT INTO notifications (user_id, title, body, noti_type, is_read, created_at)
                    VALUES (?, ?, ?, 'admin', false, NOW())
                    """, req.userId(), req.title(), req.body());
            logAction(adminId(userDetails), "SEND_NOTIFICATION", "notification", req.userId(),
                    "Gửi cho user " + req.userId() + ": " + req.title());
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Gửi thông báo thành công"));
    }

    /** GET /api/admin/notifications?page&size */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM notifications", Long.class);

        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT n.id, n.user_id, n.title, n.body, n.noti_type, n.is_read, n.created_at,
                       u.full_name AS user_name, u.email AS user_email
                FROM notifications n
                LEFT JOIN users u ON u.id = n.user_id
                ORDER BY n.created_at DESC
                LIMIT ? OFFSET ?
                """, size, (long) page * size);

        return ResponseEntity.ok(Map.of(
                "notifications", rows,
                "total", total != null ? total : 0L,
                "page", page,
                "size", size));
    }

    /** GET /api/admin/notifications/users/search?q= — find users for single-send */
    @GetMapping("/users/search")
    public ResponseEntity<List<Map<String, Object>>> searchUsers(@RequestParam(defaultValue = "") String q) {
        String like = "%" + q + "%";
        List<Map<String, Object>> users = jdbc.queryForList("""
                SELECT id, full_name, email, phone_number
                FROM users
                WHERE account_type = 'customer'
                  AND (full_name ILIKE ? OR email ILIKE ? OR phone_number ILIKE ?)
                ORDER BY full_name
                LIMIT 20
                """, like, like, like);
        return ResponseEntity.ok(users);
    }
}
