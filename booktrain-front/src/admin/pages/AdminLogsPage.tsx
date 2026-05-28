import { useEffect, useState } from "react";
import { logsAdminApi } from "../api/adminApi";

interface LogItem {
    id: number;
    action: string;
    target_type: string;
    target_id: number | null;
    detail: string;
    created_at: string;
}

interface OrderItem {
    id: number;
    order_code: string;
    status: string;
    total_amount: number;
    created_at: string;
    customer_name: string;
    customer_email: string;
    item_count: number;
}

const ORDER_STATUS_BADGE: Record<string, string> = {
    pending_payment: "badge-pending",
    paid:            "badge-active",
    cancelled:       "badge-cancelled",
    completed:       "badge-used",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
    pending_payment: "Chờ thanh toán",
    paid:            "Đã thanh toán",
    cancelled:       "Đã hủy",
    completed:       "Hoàn thành",
};

export default function AdminLogsPage() {
    const [tab, setTab] = useState<"my" | "orders">("my");

    // My logs
    const [logs,        setLogs]        = useState<LogItem[]>([]);
    const [logsTotal,   setLogsTotal]   = useState(0);
    const [logsPage,    setLogsPage]    = useState(0);
    const [logsLoading, setLogsLoading] = useState(false);
    const [filterAction,setFilterAction]= useState("");
    const [fromDate,    setFromDate]    = useState("");
    const [toDate,      setToDate]      = useState("");
    const [actions,     setActions]     = useState<string[]>([]);

    // Order history
    const [orders,      setOrders]      = useState<OrderItem[]>([]);
    const [ordersTotal, setOrdersTotal] = useState(0);
    const [ordersPage,  setOrdersPage]  = useState(0);
    const [ordLoading,  setOrdLoading]  = useState(false);
    const [ordStatus,   setOrdStatus]   = useState("");
    const [ordFrom,     setOrdFrom]     = useState("");
    const [ordTo,       setOrdTo]       = useState("");
    const [ordSearch,   setOrdSearch]   = useState("");

    const SIZE = 20;

    useEffect(() => {
        if (tab === "my") fetchLogs(0);
        else fetchOrders(0);
    }, [tab]);

    async function fetchLogs(p: number) {
        setLogsLoading(true);
        try {
            const res = await logsAdminApi.my({
                page: p, size: SIZE,
                action: filterAction || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            });
            setLogs(res.data.logs ?? []);
            setLogsTotal(res.data.total ?? 0);
            const av = (res.data.availableActions ?? []) as { action: string }[];
            setActions(av.map((a) => a.action));
        } finally { setLogsLoading(false); }
    }

    async function fetchOrders(p: number) {
        setOrdLoading(true);
        try {
            const res = await logsAdminApi.orders({
                page: p, size: SIZE,
                status: ordStatus || undefined,
                fromDate: ordFrom || undefined,
                toDate: ordTo || undefined,
                search: ordSearch || undefined,
            });
            setOrders(res.data.orders ?? []);
            setOrdersTotal(res.data.total ?? 0);
        } finally { setOrdLoading(false); }
    }

    function applyLogFilter() { setLogsPage(0); fetchLogs(0); }
    function applyOrdFilter() { setOrdersPage(0); fetchOrders(0); }

    const logsTotalPages   = Math.ceil(logsTotal / SIZE);
    const ordersTotalPages = Math.ceil(ordersTotal / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Lịch sử & Giám sát</div>
                    <div className="admin-page-subtitle">Theo dõi hoạt động admin và khách hàng</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 20 }}>
                {(["my", "orders"] as const).map(t => (
                    <button key={t}
                        onClick={() => setTab(t)}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "10px 20px", border: "none", background: "none",
                            cursor: "pointer", fontWeight: tab === t ? 700 : 500,
                            fontSize: 14, color: tab === t ? "#2F6FED" : "#6B7280",
                            borderBottom: tab === t ? "2px solid #2F6FED" : "2px solid transparent",
                            marginBottom: -2
                        }}>
                        {t === "my" ? "Lịch sử của tôi" : "Lịch sử đặt vé khách hàng"}
                    </button>
                ))}
            </div>

            {/* ── Tab: My logs ── */}
            {tab === "my" && (
                <div className="admin-card">
                    <div className="admin-toolbar">
                        <select className="admin-select"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}>
                            <option value="">Tất cả hành động</option>
                            {actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <input type="date" className="admin-input"
                            placeholder="Từ ngày"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)} />
                        <input type="date" className="admin-input"
                            placeholder="Đến ngày"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)} />
                        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyLogFilter}>
                            Lọc
                        </button>
                        <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => {
                            setFilterAction(""); setFromDate(""); setToDate("");
                            setTimeout(() => fetchLogs(0), 50);
                        }}>Xóa lọc</button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Hành động</th>
                                    <th>Đối tượng</th>
                                    <th>Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsLoading ? (
                                    <tr><td colSpan={4} className="admin-loading">Đang tải...</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={4} className="admin-empty">Chưa có lịch sử hoạt động</td></tr>
                                ) : logs.map(l => (
                                    <tr key={l.id}>
                                        <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                                            {new Date(l.created_at).toLocaleString("vi-VN")}
                                        </td>
                                        <td>
                                            <span style={{
                                                background: "#E0F2FE", color: "#0369A1",
                                                padding: "2px 8px", borderRadius: 4,
                                                fontSize: 11, fontWeight: 700
                                            }}>{l.action}</span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            {l.target_type && (
                                                <span>{l.target_type}{l.target_id ? ` #${l.target_id}` : ""}</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 12, color: "#374151" }}>{l.detail}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pagination">
                        <span>Hiển thị {logs.length} / {logsTotal}</span>
                        <div className="admin-pagination-btns">
                            <button className="admin-pagination-btn" disabled={logsPage === 0}
                                onClick={() => { const p = logsPage - 1; setLogsPage(p); fetchLogs(p); }}>Trước</button>
                            <button className="admin-pagination-btn active">{logsPage + 1} / {Math.max(logsTotalPages, 1)}</button>
                            <button className="admin-pagination-btn" disabled={logsPage >= logsTotalPages - 1}
                                onClick={() => { const p = logsPage + 1; setLogsPage(p); fetchLogs(p); }}>Sau</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Orders ── */}
            {tab === "orders" && (
                <div className="admin-card">
                    <div className="admin-toolbar">
                        <input className="admin-search"
                            placeholder="Tìm mã đơn, tên khách, email..."
                            value={ordSearch}
                            onChange={e => setOrdSearch(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && applyOrdFilter()} />
                        <select className="admin-select"
                            value={ordStatus}
                            onChange={e => setOrdStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending_payment">Chờ thanh toán</option>
                            <option value="paid">Đã thanh toán</option>
                            <option value="cancelled">Đã hủy</option>
                            <option value="completed">Hoàn thành</option>
                        </select>
                        <input type="date" className="admin-input"
                            value={ordFrom} onChange={e => setOrdFrom(e.target.value)} />
                        <input type="date" className="admin-input"
                            value={ordTo} onChange={e => setOrdTo(e.target.value)} />
                        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyOrdFilter}>
                            Lọc
                        </button>
                        <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => {
                            setOrdSearch(""); setOrdStatus(""); setOrdFrom(""); setOrdTo("");
                            setTimeout(() => fetchOrders(0), 50);
                        }}>Xóa lọc</button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Khách hàng</th>
                                    <th>Số vé</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordLoading ? (
                                    <tr><td colSpan={6} className="admin-loading">Đang tải...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={6} className="admin-empty">Không có đơn hàng</td></tr>
                                ) : orders.map(o => (
                                    <tr key={o.id}>
                                        <td>
                                            <span style={{ fontWeight: 700, color: "#2F6FED", fontSize: 12 }}>{o.order_code}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{o.customer_name}</div>
                                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{o.customer_email}</div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {o.item_count} vé
                                        </td>
                                        <td style={{ fontWeight: 700, color: "#1F2937" }}>
                                            {Number(o.total_amount).toLocaleString("vi-VN")}đ
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${ORDER_STATUS_BADGE[o.status] ?? "badge-pending"}`}>
                                                {ORDER_STATUS_LABEL[o.status] ?? o.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            {new Date(o.created_at).toLocaleString("vi-VN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pagination">
                        <span>Hiển thị {orders.length} / {ordersTotal}</span>
                        <div className="admin-pagination-btns">
                            <button className="admin-pagination-btn" disabled={ordersPage === 0}
                                onClick={() => { const p = ordersPage - 1; setOrdersPage(p); fetchOrders(p); }}>Trước</button>
                            <button className="admin-pagination-btn active">{ordersPage + 1} / {Math.max(ordersTotalPages, 1)}</button>
                            <button className="admin-pagination-btn" disabled={ordersPage >= ordersTotalPages - 1}
                                onClick={() => { const p = ordersPage + 1; setOrdersPage(p); fetchOrders(p); }}>Sau</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
