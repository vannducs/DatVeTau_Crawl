package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final JdbcTemplate jdbc;

    record StatusRequest(String status) {}

    /** GET /api/admin/users?page=0&size=20&search= */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "20")  int    size,
            @RequestParam(defaultValue = "")    String search) {

        String like = "%" + search + "%";

        long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE full_name ILIKE ? OR email ILIKE ? OR phone_number ILIKE ?",
                Long.class, like, like, like);

        String sql = """
                SELECT id, full_name, email, phone_number, account_type, status, created_at
                FROM users
                WHERE full_name ILIKE ? OR email ILIKE ? OR phone_number ILIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """;
        List<Map<String, Object>> users = jdbc.queryForList(sql, like, like, like, size, (long) page * size);

        Map<String, Object> result = new HashMap<>();
        result.put("users", users);
        result.put("total", total);
        result.put("page",  page);
        result.put("size",  size);
        return ResponseEntity.ok(result);
    }

    /** GET /api/admin/users/{id} — chi tiết + lịch sử đặt vé */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Integer id) {
        List<Map<String, Object>> users = jdbc.queryForList(
                "SELECT id, full_name, email, phone_number, date_of_birth, gender, account_type, status, created_at FROM users WHERE id = ?",
                id);
        if (users.isEmpty()) return ResponseEntity.notFound().build();

        List<Map<String, Object>> orders = jdbc.queryForList("""
                SELECT o.id, o.order_code, o.total_amount, o.status, o.created_at,
                       COUNT(oi.id) AS ticket_count
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE o.customer_id = ?
                GROUP BY o.id, o.order_code, o.total_amount, o.status, o.created_at
                ORDER BY o.created_at DESC
                """, id);

        Map<String, Object> result = new HashMap<>(users.get(0));
        result.put("orders", orders);
        return ResponseEntity.ok(result);
    }

    /** PUT /api/admin/users/{id}/status — khóa/mở tài khoản */
    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Integer id,
            @RequestBody StatusRequest req) {

        if (!List.of("active", "locked", "pending").contains(req.status())) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Trạng thái không hợp lệ"));
        }
        int rows = jdbc.update("UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?", req.status(), id);
        if (rows == 0) return ResponseEntity.notFound().build();

        String msg = "active".equals(req.status()) ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản";
        return ResponseEntity.ok(Map.of("success", true, "message", msg));
    }

    /** DELETE /api/admin/users/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        try {
            int rows = jdbc.update("DELETE FROM users WHERE id = ?", id);
            if (rows == 0) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa người dùng"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Không thể xóa: user đang có đơn hàng liên kết"));
        }
    }
}
