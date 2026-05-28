package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
public class AdminLogsController {

    private final JdbcTemplate jdbc;

    private Integer adminId(UserDetails u) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Integer.class, u.getUsername());
    }

    /** GET /api/admin/logs/my?page&size&action&fromDate&toDate */
    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> myLogs(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size,
            @RequestParam(defaultValue = "")   String action,
            @RequestParam(required = false)    String fromDate,
            @RequestParam(required = false)    String toDate,
            @AuthenticationPrincipal UserDetails userDetails) {

        Integer currentAdminId = adminId(userDetails);

        StringBuilder where = new StringBuilder("WHERE al.admin_id = ? ");
        List<Object> params = new ArrayList<>();
        params.add(currentAdminId);

        if (!action.isEmpty()) {
            where.append("AND al.action = ? ");
            params.add(action);
        }
        if (fromDate != null && !fromDate.isEmpty()) {
            where.append("AND al.created_at >= ?::timestamptz ");
            params.add(fromDate + "T00:00:00+07:00");
        }
        if (toDate != null && !toDate.isEmpty()) {
            where.append("AND al.created_at < ?::timestamptz ");
            params.add(toDate + "T23:59:59+07:00");
        }

        String baseFrom = "FROM admin_logs al " + where;

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + baseFrom, Long.class, params.toArray());

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add((long) page * size);

        List<Map<String, Object>> logs = jdbc.queryForList(
                "SELECT al.id, al.action, al.target_type, al.target_id, al.detail, al.created_at "
                + baseFrom + "ORDER BY al.created_at DESC LIMIT ? OFFSET ?",
                pageParams.toArray());

        List<Map<String, Object>> actions = jdbc.queryForList(
                "SELECT DISTINCT action FROM admin_logs WHERE admin_id = ? ORDER BY action",
                currentAdminId);

        return ResponseEntity.ok(Map.of(
                "logs", logs,
                "total", total != null ? total : 0L,
                "page", page,
                "size", size,
                "availableActions", actions));
    }

    /** GET /api/admin/logs/orders?page&size&status&fromDate&toDate&search */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> orderHistory(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size,
            @RequestParam(defaultValue = "")   String status,
            @RequestParam(required = false)    String fromDate,
            @RequestParam(required = false)    String toDate,
            @RequestParam(defaultValue = "")   String search) {

        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (!status.isEmpty()) {
            where.append("AND o.status = ? ");
            params.add(status);
        }
        if (fromDate != null && !fromDate.isEmpty()) {
            where.append("AND o.created_at >= ?::timestamptz ");
            params.add(fromDate + "T00:00:00+07:00");
        }
        if (toDate != null && !toDate.isEmpty()) {
            where.append("AND o.created_at < ?::timestamptz ");
            params.add(toDate + "T23:59:59+07:00");
        }
        if (!search.isEmpty()) {
            where.append("AND (o.order_code ILIKE ? OR u.full_name ILIKE ? OR u.email ILIKE ?) ");
            String like = "%" + search + "%";
            params.add(like); params.add(like); params.add(like);
        }

        String baseFrom = """
                FROM orders o
                JOIN users u ON u.id = o.customer_id
                """ + where;

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + baseFrom, Long.class, params.toArray());

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add((long) page * size);

        List<Map<String, Object>> orders = jdbc.queryForList("""
                SELECT o.id, o.order_code, o.status, o.total_amount, o.created_at,
                       u.full_name AS customer_name, u.email AS customer_email,
                       (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
                """ + baseFrom + "ORDER BY o.created_at DESC LIMIT ? OFFSET ?",
                pageParams.toArray());

        return ResponseEntity.ok(Map.of(
                "orders", orders,
                "total", total != null ? total : 0L,
                "page", page,
                "size", size));
    }
}
