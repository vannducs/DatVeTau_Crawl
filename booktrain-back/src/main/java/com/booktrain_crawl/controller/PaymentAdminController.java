package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
public class PaymentAdminController {

    private final JdbcTemplate jdbc;

    /**
     * GET /api/admin/payments
     *     ?page=0&size=20&status=&fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "20")  int    size,
            @RequestParam(defaultValue = "")    String status,
            @RequestParam(defaultValue = "")    String fromDate,
            @RequestParam(defaultValue = "")    String toDate) {

        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        if (!status.isEmpty())   where.append("AND p.status = '").append(status).append("' ");
        if (!fromDate.isEmpty()) where.append("AND p.created_at::date >= '").append(fromDate).append("'::date ");
        if (!toDate.isEmpty())   where.append("AND p.created_at::date <= '").append(toDate).append("'::date ");

        long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM payments p " + where, Long.class);

        String totalRevenueSql = "SELECT COALESCE(SUM(p.amount), 0) FROM payments p " + where + " AND p.status = 'success'";
        Object totalRevenue = jdbc.queryForObject(totalRevenueSql, Object.class);

        String sql = String.format("""
                SELECT p.id, o.order_code, u.full_name AS customer_name,
                       p.payment_method, p.amount, p.status,
                       p.transaction_code, p.paid_at, p.created_at
                FROM payments p
                JOIN orders o ON o.id  = p.order_id
                JOIN users  u ON u.id  = o.customer_id
                %s
                ORDER BY p.created_at DESC
                LIMIT %d OFFSET %d
                """, where, size, (long) page * size);
        List<Map<String, Object>> payments = jdbc.queryForList(sql);

        Map<String, Object> result = new HashMap<>();
        result.put("payments",     payments);
        result.put("total",        total);
        result.put("totalRevenue", totalRevenue);
        result.put("page",         page);
        result.put("size",         size);
        return ResponseEntity.ok(result);
    }

    /** GET /api/admin/payments/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Integer id) {
        String sql = """
                SELECT p.id, o.order_code, u.full_name AS customer_name, u.email,
                       p.payment_method, p.amount, p.status,
                       p.transaction_code, p.paid_at, p.created_at
                FROM payments p
                JOIN orders o ON o.id = p.order_id
                JOIN users  u ON u.id = o.customer_id
                WHERE p.id = ?
                """;
        List<Map<String, Object>> rows = jdbc.queryForList(sql, id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(rows.get(0));
    }

    /** PUT /api/admin/payments/{id}/refund */
    @PutMapping("/{id}/refund")
    public ResponseEntity<Map<String, Object>> refund(@PathVariable Integer id) {
        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT status, order_id FROM payments WHERE id = ?", id);
        if (payments.isEmpty()) return ResponseEntity.notFound().build();

        String currentStatus = (String) payments.get(0).get("status");
        if (!"success".equals(currentStatus)) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Chỉ hoàn tiền được giao dịch thành công"));
        }

        Object orderId = payments.get(0).get("order_id");
        jdbc.update("UPDATE payments SET status = 'refunded' WHERE id = ?", id);
        jdbc.update("UPDATE orders   SET status = 'cancelled', updated_at = NOW() WHERE id = ?", orderId);

        return ResponseEntity.ok(Map.of("success", true, "message", "Đã hoàn tiền và huỷ đơn hàng"));
    }
}
