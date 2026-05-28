import { useEffect, useState } from "react";
import { userAdminApi } from "../api/adminApi";

interface User {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
    account_type: string;
    status: string;
    created_at: string;
}

interface UserDetail extends User {
    date_of_birth: string;
    gender: string;
    orders: OrderSummary[];
}

interface OrderSummary {
    id: number;
    order_code: string;
    total_amount: number;
    status: string;
    created_at: string;
    ticket_count: number;
}

const STATUS_BADGE: Record<string, string> = {
    active: "badge-active", locked: "badge-locked", pending: "badge-pending",
};

const ACCOUNT_BADGE: Record<string, string> = {
    customer: "badge-confirmed", admin: "badge-pending_payment", partner: "badge-used",
};

export default function UsersPage() {
    const [users,    setUsers]    = useState<User[]>([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(0);
    const [search,   setSearch]   = useState("");
    const [loading,  setLoading]  = useState(true);
    const [detail,   setDetail]   = useState<UserDetail | null>(null);
    const [msg,      setMsg]      = useState("");
    const SIZE = 20;

    async function fetchUsers(p = page, s = search) {
        setLoading(true);
        try {
            const res = await userAdminApi.list({ page: p, size: SIZE, search: s });
            setUsers(res.data.users);
            setTotal(res.data.total);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchUsers(0, ""); }, []);

    function handleSearch() { setPage(0); fetchUsers(0, search); }

    async function viewDetail(id: number) {
        const res = await userAdminApi.detail(id);
        setDetail(res.data);
    }

    async function toggleStatus(user: User) {
        const newStatus = user.status === "active" ? "locked" : "active";
        const confirm_msg = newStatus === "locked"
            ? `Khóa tài khoản "${user.full_name}"?`
            : `Mở khóa tài khoản "${user.full_name}"?`;
        if (!confirm(confirm_msg)) return;
        await userAdminApi.updateStatus(user.id, newStatus);
        setMsg(newStatus === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
        fetchUsers(page, search);
        if (detail?.id === user.id) setDetail(null);
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Xóa người dùng "${name}"? Hành động này không thể hoàn tác.`)) return;
        try {
            await userAdminApi.delete(id);
            setMsg("Đã xóa người dùng");
            fetchUsers(page, search);
            setDetail(null);
        } catch {
            alert("Không thể xóa: người dùng đang có đơn hàng.");
        }
    }

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý người dùng</div>
                    <div className="admin-page-subtitle">Tổng: {total} người dùng</div>
                </div>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            <div className="admin-card">
                <div className="admin-toolbar">
                    <input className="admin-search" placeholder="Tìm theo tên, email, SĐT..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()} />
                    <button className="admin-btn admin-btn-outline" onClick={handleSearch}>Tìm</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>SĐT</th>
                                <th>Loại TK</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="admin-loading">Đang tải...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={8} className="admin-empty">Không có dữ liệu</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ color: "#9CA3AF" }}>#{u.id}</td>
                                    <td>
                                        <button
                                            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#2F6FED", padding: 0 }}
                                            onClick={() => viewDetail(u.id)}
                                        >{u.full_name}</button>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{u.email}</td>
                                    <td>{u.phone_number || "—"}</td>
                                    <td>
                                        <span className={`admin-badge ${ACCOUNT_BADGE[u.account_type] ?? "badge-pending"}`}>
                                            {u.account_type}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[u.status] ?? "badge-pending"}`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: "#9CA3AF" }}>
                                        {new Date(u.created_at).toLocaleDateString("vi-VN")}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                className={`admin-btn admin-btn-sm ${u.status === "active" ? "admin-btn-warning" : "admin-btn-success"}`}
                                                onClick={() => toggleStatus(u)}
                                            >
                                                {u.status === "active" ? "Khoá" : "Mở"}
                                            </button>
                                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleDelete(u.id, u.full_name)}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {users.length} / {total} người dùng</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn" disabled={page === 0}
                            onClick={() => { setPage(p => p - 1); fetchUsers(page - 1, search); }}>← Trước</button>
                        <button className="admin-pagination-btn active">{page + 1}</button>
                        <button className="admin-pagination-btn" disabled={page >= totalPages - 1}
                            onClick={() => { setPage(p => p + 1); fetchUsers(page + 1, search); }}>Sau →</button>
                    </div>
                </div>
            </div>

            {/* Modal chi tiết user */}
            {detail && (
                <div className="admin-modal-overlay" onClick={() => setDetail(null)}>
                    <div className="admin-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Chi tiết: {detail.full_name}</span>
                            <button className="admin-modal-close" onClick={() => setDetail(null)}>×</button>
                        </div>

                        <div className="admin-grid-2" style={{ marginBottom: 16 }}>
                            <div><span style={{ fontSize: 12, color: "#9CA3AF" }}>Email</span><br /><strong>{detail.email}</strong></div>
                            <div><span style={{ fontSize: 12, color: "#9CA3AF" }}>SĐT</span><br /><strong>{detail.phone_number || "—"}</strong></div>
                            <div><span style={{ fontSize: 12, color: "#9CA3AF" }}>Loại tài khoản</span><br />
                                <span className={`admin-badge ${ACCOUNT_BADGE[detail.account_type] ?? ""}`}>{detail.account_type}</span>
                            </div>
                            <div><span style={{ fontSize: 12, color: "#9CA3AF" }}>Trạng thái</span><br />
                                <span className={`admin-badge ${STATUS_BADGE[detail.status] ?? ""}`}>{detail.status}</span>
                            </div>
                        </div>

                        <div className="admin-card-title" style={{ fontSize: 14, marginBottom: 10 }}>
                            Lịch sử đặt vé ({detail.orders?.length ?? 0} đơn)
                        </div>
                        <div className="admin-table-wrapper" style={{ maxHeight: 260, overflowY: "auto" }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Số vé</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày đặt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.orders?.length === 0 ? (
                                        <tr><td colSpan={5} className="admin-empty">Chưa có đơn nào</td></tr>
                                    ) : detail.orders?.map(o => (
                                        <tr key={o.id}>
                                            <td><strong style={{ color: "#2F6FED" }}>{o.order_code}</strong></td>
                                            <td>{o.ticket_count} vé</td>
                                            <td>{Number(o.total_amount).toLocaleString("vi-VN")}đ</td>
                                            <td><span className={`admin-badge badge-${o.status}`}>{o.status}</span></td>
                                            <td style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                onClick={() => handleDelete(detail.id, detail.full_name)}>Xóa TK</button>
                            <button
                                className={`admin-btn admin-btn-sm ${detail.status === "active" ? "admin-btn-warning" : "admin-btn-success"}`}
                                onClick={() => toggleStatus(detail as unknown as User)}
                            >
                                {detail.status === "active" ? "Khoá tài khoản" : "Mở khoá"}
                            </button>
                            <button className="admin-btn admin-btn-outline" onClick={() => setDetail(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
