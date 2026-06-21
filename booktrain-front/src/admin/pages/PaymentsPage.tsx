import { useEffect, useState } from "react";
import axios from "axios";
import { paymentAdminApi } from "../api/adminApi";

interface Payment {
    id: number;
    order_code: string;
    customer_name: string;
    payment_method: string;
    amount: number;
    status: string;
    transaction_code: string;
    paid_at: string;
    created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
    success: "badge-success", pending: "badge-pending",
    failed: "badge-failed", refunded: "badge-refunded",
};

export default function PaymentsPage() {
    const [payments,     setPayments]     = useState<Payment[]>([]);
    const [total,        setTotal]        = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [page,         setPage]         = useState(0);
    const [status,       setStatus]       = useState("");
    const [fromDate,     setFromDate]     = useState("");
    const [toDate,       setToDate]       = useState("");
    const [loading,      setLoading]      = useState(true);
    const [msg,          setMsg]          = useState("");
    const SIZE = 20;

    // Modal hoàn tiền
    const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
    const [refundReason, setRefundReason] = useState("");
    const [refundError,  setRefundError]  = useState("");
    const [refunding,    setRefunding]    = useState(false);

    async function fetchPayments(p = page) {
        setLoading(true);
        try {
            const res = await paymentAdminApi.list({ page: p, size: SIZE, status, fromDate, toDate });
            setPayments(res.data.payments);
            setTotal(res.data.total);
            setTotalRevenue(Number(res.data.totalRevenue));
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchPayments(0); }, []);

    function handleFilter() { setPage(0); fetchPayments(0); }

    function openRefund(p: Payment) {
        setRefundTarget(p);
        setRefundReason("");
        setRefundError("");
    }

    async function handleRefundConfirm() {
        if (!refundTarget) return;
        if (!refundReason.trim()) {
            setRefundError("Vui lòng nhập lý do hoàn tiền");
            return;
        }
        setRefunding(true);
        setRefundError("");
        try {
            await paymentAdminApi.refund(refundTarget.id, refundReason.trim());
            setRefundTarget(null);
            setMsg("Đã hoàn tiền thành công và gửi thông báo cho khách hàng");
            fetchPayments(page);
        } catch (e) {
            setRefundError(
                axios.isAxiosError(e)
                    ? (e.response?.data?.message ?? "Không thể hoàn tiền")
                    : "Không thể hoàn tiền"
            );
        } finally { setRefunding(false); }
    }

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý thanh toán</div>
                    <div className="admin-page-subtitle">
                        {total} giao dịch —&nbsp;
                        <strong style={{ color: "#16A34A" }}>
                            Doanh thu: {totalRevenue.toLocaleString("vi-VN")}đ
                        </strong>
                    </div>
                </div>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            <div className="admin-card">
                <div className="admin-toolbar">
                    <select className="admin-select" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="success">Success</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    <input className="admin-input" type="date" value={fromDate}
                        onChange={e => setFromDate(e.target.value)} />
                    <span style={{ color: "#9CA3AF" }}>→</span>
                    <input className="admin-input" type="date" value={toDate}
                        onChange={e => setToDate(e.target.value)} />
                    <button className="admin-btn admin-btn-primary" onClick={handleFilter}>Lọc</button>
                    <button className="admin-btn admin-btn-outline"
                        onClick={() => { setStatus(""); setFromDate(""); setToDate(""); setPage(0); }}>
                        Xóa lọc
                    </button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Phương thức</th>
                                <th>Số tiền</th>
                                <th>Trạng thái</th>
                                <th>Mã GD VNPay</th>
                                <th>Ngày TT</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="admin-loading">Đang tải...</td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={9} className="admin-empty">Không có dữ liệu</td></tr>
                            ) : payments.map(p => (
                                <tr key={p.id}>
                                    <td style={{ color: "#9CA3AF" }}>#{p.id}</td>
                                    <td><strong style={{ color: "#2F6FED" }}>{p.order_code}</strong></td>
                                    <td>{p.customer_name}</td>
                                    <td>{p.payment_method}</td>
                                    <td style={{ fontWeight: 700 }}>
                                        {Number(p.amount).toLocaleString("vi-VN")}đ
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[p.status] ?? "badge-pending"}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, fontFamily: "monospace", color: "#6B7280" }}>
                                        {p.transaction_code || "—"}
                                    </td>
                                    <td style={{ fontSize: 12, color: "#9CA3AF" }}>
                                        {p.paid_at ? new Date(p.paid_at).toLocaleString("vi-VN") : "—"}
                                    </td>
                                    <td>
                                        {p.status === "success" && (
                                            <button className="admin-btn admin-btn-warning admin-btn-sm"
                                                onClick={() => openRefund(p)}>
                                                Hoàn tiền
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {payments.length} / {total} giao dịch</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn" disabled={page === 0}
                            onClick={() => { setPage(p => p - 1); fetchPayments(page - 1); }}>← Trước</button>
                        <button className="admin-pagination-btn active">{page + 1}</button>
                        <button className="admin-pagination-btn" disabled={page >= totalPages - 1}
                            onClick={() => { setPage(p => p + 1); fetchPayments(page + 1); }}>Sau →</button>
                    </div>
                </div>
            </div>

            {/* ── Modal hoàn tiền ── */}
            {refundTarget && (
                <div className="admin-modal-overlay" onClick={() => !refunding && setRefundTarget(null)}>
                    <div className="admin-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">
                                Hoàn tiền cho đơn {refundTarget.order_code}
                            </span>
                            <button className="admin-modal-close"
                                onClick={() => !refunding && setRefundTarget(null)}>✕</button>
                        </div>

                        <div className="admin-alert" style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412", marginBottom: 12 }}>
                            Đơn hàng sẽ bị huỷ và gửi thông báo hoàn tiền đến khách hàng.
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 6, fontSize: 14, marginBottom: 16 }}>
                            <span style={{ color: "#6B7280" }}>Khách hàng:</span>
                            <span style={{ fontWeight: 600 }}>{refundTarget.customer_name}</span>
                            <span style={{ color: "#6B7280" }}>Số tiền:</span>
                            <span style={{ fontWeight: 700, color: "#DC2626" }}>
                                {Number(refundTarget.amount).toLocaleString("vi-VN")}đ
                            </span>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-form-label">Lý do hoàn tiền *</label>
                            <textarea className="admin-form-input" rows={3}
                                placeholder="Nhập lý do hoàn tiền (sẽ gửi đến khách hàng)..."
                                value={refundReason}
                                onChange={e => { setRefundReason(e.target.value); if (refundError) setRefundError(""); }}
                                style={{ resize: "vertical" }} />
                        </div>

                        {refundError && <div className="admin-alert admin-alert-error">{refundError}</div>}

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline"
                                onClick={() => setRefundTarget(null)} disabled={refunding}>
                                Hủy
                            </button>
                            <button className="admin-btn admin-btn-warning"
                                onClick={handleRefundConfirm}
                                disabled={refunding || !refundReason.trim()}>
                                {refunding ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
