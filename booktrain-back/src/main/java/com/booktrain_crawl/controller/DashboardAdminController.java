package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardAdminController {

    private final JdbcTemplate jdbc;

    /** GET /api/admin/dashboard/summary */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        Map<String, Object> data = new HashMap<>();

        data.put("totalUsers",   jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class));
        data.put("totalOrders",  jdbc.queryForObject("SELECT COUNT(*) FROM orders", Long.class));
        data.put("totalRevenue", jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success'", Long.class));
        data.put("totalTrips",   jdbc.queryForObject("SELECT COUNT(*) FROM train_trips", Long.class));
        data.put("ordersToday",  jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE", Long.class));
        data.put("revenueToday", jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success' AND paid_at::date = CURRENT_DATE", Long.class));
        data.put("newUsersToday", jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE", Long.class));

        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/admin/dashboard/revenue?type=day|week|month|year&from=yyyy-MM-dd&to=yyyy-MM-dd
     */
    @GetMapping("/revenue")
    public ResponseEntity<List<Map<String, Object>>> revenue(
            @RequestParam(defaultValue = "day")  String type,
            @RequestParam(defaultValue = "")     String from,
            @RequestParam(defaultValue = "")     String to) {

        String trunc = switch (type) {
            case "week"  -> "week";
            case "month" -> "month";
            case "year"  -> "year";
            default      -> "day";
        };

        String dateFilter = "";
        if (!from.isEmpty() && !to.isEmpty()) {
            dateFilter = String.format("AND paid_at >= '%s'::date AND paid_at < '%s'::date + INTERVAL '1 day'", from, to);
        }

        String sql = String.format("""
                SELECT DATE_TRUNC('%s', paid_at)::date AS period,
                       COALESCE(SUM(amount), 0)        AS revenue
                FROM payments
                WHERE status = 'success' %s
                GROUP BY period
                ORDER BY period ASC
                """, trunc, dateFilter);

        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        return ResponseEntity.ok(rows);
    }

    /** GET /api/admin/dashboard/top-customers?limit=10 */
    @GetMapping("/top-customers")
    public ResponseEntity<List<Map<String, Object>>> topCustomers(
            @RequestParam(defaultValue = "10") int limit) {

        String sql = """
                SELECT u.id          AS user_id,
                       u.full_name   AS full_name,
                       u.email       AS email,
                       COUNT(o.id)   AS total_orders,
                       COALESCE(SUM(o.total_amount), 0) AS total_spent
                FROM users u
                JOIN orders o ON o.customer_id = u.id
                WHERE o.status = 'paid'
                GROUP BY u.id, u.full_name, u.email
                ORDER BY total_spent DESC
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql, limit);
        return ResponseEntity.ok(rows);
    }

    /** GET /api/admin/dashboard/popular-routes?limit=10 */
    @GetMapping("/popular-routes")
    public ResponseEntity<List<Map<String, Object>>> popularRoutes(
            @RequestParam(defaultValue = "10") int limit) {

        String sql = """
                SELECT l1.name                          AS origin_name,
                       l2.name                          AS destination_name,
                       COUNT(oi.id)                     AS total_bookings,
                       COALESCE(SUM(oi.ticket_price), 0) AS revenue
                FROM order_items oi
                JOIN train_seats  ts ON ts.id = oi.train_seat_id
                JOIN train_trips  tt ON tt.id = ts.trip_id
                JOIN locations    l1 ON l1.id = tt.origin_id
                JOIN locations    l2 ON l2.id = tt.destination_id
                JOIN orders        o ON o.id  = oi.order_id
                WHERE o.status = 'paid'
                GROUP BY l1.name, l2.name
                ORDER BY total_bookings DESC
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql, limit);
        return ResponseEntity.ok(rows);
    }

    /** GET /api/admin/dashboard/orders/recent?limit=20 */
    @GetMapping("/orders/recent")
    public ResponseEntity<List<Map<String, Object>>> recentOrders(
            @RequestParam(defaultValue = "20") int limit) {

        String sql = """
                SELECT o.id, o.order_code, u.full_name AS customer_name,
                       o.total_amount, o.status, o.created_at
                FROM orders o
                JOIN users u ON u.id = o.customer_id
                ORDER BY o.created_at DESC
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql, limit);
        return ResponseEntity.ok(rows);
    }

    /**
     * GET /api/admin/dashboard/orders/history
     *     ?page=0&size=20&fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd&status=
     */
    @GetMapping("/orders/history")
    public ResponseEntity<Map<String, Object>> orderHistory(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size,
            @RequestParam(defaultValue = "")   String fromDate,
            @RequestParam(defaultValue = "")   String toDate,
            @RequestParam(defaultValue = "")   String status) {

        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        if (!fromDate.isEmpty()) where.append("AND o.created_at::date >= '").append(fromDate).append("'::date ");
        if (!toDate.isEmpty())   where.append("AND o.created_at::date <= '").append(toDate).append("'::date ");
        if (!status.isEmpty())   where.append("AND o.status = '").append(status).append("' ");

        String countSql = "SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.customer_id " + where;
        long total = jdbc.queryForObject(countSql, Long.class);

        String sql = String.format("""
                SELECT o.id, o.order_code, u.full_name AS customer_name, u.email,
                       o.total_amount, o.status, o.created_at
                FROM orders o
                JOIN users u ON u.id = o.customer_id
                %s
                ORDER BY o.created_at DESC
                LIMIT %d OFFSET %d
                """, where, size, (long) page * size);

        List<Map<String, Object>> rows = jdbc.queryForList(sql);

        Map<String, Object> result = new HashMap<>();
        result.put("orders", rows);
        result.put("total",  total);
        result.put("page",   page);
        result.put("size",   size);
        return ResponseEntity.ok(result);
    }

    /** GET /api/admin/dashboard/train-occupancy */
    @GetMapping("/train-occupancy")
    public ResponseEntity<List<Map<String, Object>>> trainOccupancy() {
        String sql = """
                SELECT tt.id,
                       tr.train_code,
                       tt.departure_time,
                       COUNT(ts.id)                                               AS total_seats,
                       COUNT(CASE WHEN ts.status = 'booked' THEN 1 END)           AS booked_seats,
                       ROUND(COUNT(CASE WHEN ts.status = 'booked' THEN 1 END) * 100.0
                           / NULLIF(COUNT(ts.id), 0), 1)                          AS occupancy_rate
                FROM train_trips tt
                JOIN trains      tr ON tr.id  = tt.train_id
                JOIN train_seats ts ON ts.trip_id = tt.id
                GROUP BY tt.id, tr.train_code, tt.departure_time
                ORDER BY tt.departure_time DESC
                LIMIT 30
                """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        return ResponseEntity.ok(rows);
    }
}
