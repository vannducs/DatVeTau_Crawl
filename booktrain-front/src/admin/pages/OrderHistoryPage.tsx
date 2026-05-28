import { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "../api/adminApi";

interface Order {
    id: number;
    order_code: string;
    customer_name: string;
    email: string;
    total_amount: number;
    status: string;
    created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
    paid: "badge-paid", pending_payment: "badge-pending_payment",
    cancelled: "badge-cancelled", completed: "badge-active",
};

const STATUS_OPTIONS = ["", "pending_payment", "paid", "cancelled", "completed"];

export default function OrderHistoryPage() {
    const [orders,   setOrders]   = useState<Order[]>([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(0);
    const [status,   setStatus]   = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate,   setToDate]   = useState("");
    const [loading,  setLoading]  = useState(true);
    const SIZE = 20;

    const fetchOrders = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const res = await dashboardApi.orderHistory({ page: p, size: SIZE, status, fromDate, toDate });
            setOrders(res.data.orders);
            setTotal(res.data.total);
        } finally { setLoading(false); }
    }, [status, fromDate, toDate]);

    // Auto-refresh mỗi 30 giây
    useEffect(() => {
        fetchOrders(page);
        const timer = setInterval(() => fetchOrders(page), 30_000);
        return () => clearInterval(timer);
    }, [fetchOrders, page]);

    function handleFilter() { setPage(0); fetchOrders(0); }

    function handleReset() {
        setStatus(""); setFromDate(""); setToDate("");
        setPage(0);
    }

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Lịch sử đặt vé</div>
                    <div className="admin-page-subtitle">Toàn hệ thống — tự động cập nhật mỗi 30 giây</div>
                </div>
                <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => fetchOrders(page)}>
                    🔄 Làm mới
                </button>
            </div>

            <div className="admin-card">
                <div className="admin-toolbar">
                    <select className="admin-select" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUS_OPTIONS.filter(Boolean).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <input className="admin-input" type="date" value={fromDate}
                        onChange={e => setFromDate(e.target.value)} />
                    <span style={{ color: "#9CA3AF" }}>→</span>
                    <input className="admin-input" type="date" value={toDate}
                        onChange={e => setToDate(e.target.value)} />
                    <button className="admin-btn admin-btn-primary" onClick={handleFilter}>Lọc</button>
                    <button className="admin-btn admin-btn-outline" onClick={handleReset}>Xóa lọc</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Email</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày đặt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="admin-loading">Đang tải...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={6} className="admin-empty">Không có đơn hàng nào</td></tr>
                            ) : orders.map(o => (
                                <tr key={o.id}>
                                    <td><strong style={{ color: "#2F6FED" }}>{o.order_code}</strong></td>
                                    <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                                    <td style={{ fontSize: 12, color: "#9CA3AF" }}>{o.email}</td>
                                    <td style={{ fontWeight: 700 }}>
                                        {Number(o.total_amount).toLocaleString("vi-VN")}đ
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[o.status] ?? "badge-pending"}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: "#9CA3AF" }}>
                                        {new Date(o.created_at).toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {orders.length} / {total} đơn hàng</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn" disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}>← Trước</button>
                        <span style={{ padding: "6px 10px", fontSize: 13, color: "#374151" }}>
                            Trang {page + 1} / {totalPages || 1}
                        </span>
                        <button className="admin-pagination-btn" disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}>Sau →</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
