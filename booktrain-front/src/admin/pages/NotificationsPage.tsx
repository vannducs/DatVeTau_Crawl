import { useEffect, useState } from "react";
import { notificationAdminApi } from "../api/adminApi";
import axios from "axios";

interface NotifItem {
    id: number;
    user_id: number | null;
    title: string;
    body: string;
    noti_type: string;
    is_read: boolean;
    created_at: string;
    user_name: string | null;
    user_email: string | null;
}

interface UserResult {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
}

export default function NotificationsPage() {
    const [tab,         setTab]         = useState<"send" | "history">("send");
    const [sending,     setSending]     = useState(false);
    const [msg,         setMsg]         = useState("");
    const [error,       setError]       = useState("");

    // Send form
    const [mode,        setMode]        = useState<"broadcast" | "single">("broadcast");
    const [userSearch,  setUserSearch]  = useState("");
    const [userResults, setUserResults] = useState<UserResult[]>([]);
    const [selUser,     setSelUser]     = useState<UserResult | null>(null);
    const [title,       setTitle]       = useState("");
    const [body,        setBody]        = useState("");

    // History
    const [notifs,  setNotifs]  = useState<NotifItem[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(0);
    const [loading, setLoading] = useState(false);
    const SIZE = 20;

    useEffect(() => {
        if (tab === "history") fetchHistory(0);
    }, [tab]);

    async function fetchHistory(p: number) {
        setLoading(true);
        try {
            const res = await notificationAdminApi.list({ page: p, size: SIZE });
            setNotifs(res.data.notifications ?? []);
            setTotal(res.data.total ?? 0);
        } finally { setLoading(false); }
    }

    async function searchUsers(q: string) {
        setUserSearch(q);
        if (q.trim().length < 2) { setUserResults([]); return; }
        const res = await notificationAdminApi.searchUsers(q);
        setUserResults(res.data);
    }

    async function handleSend() {
        setError("");
        if (!title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
        if (!body.trim())  { setError("Vui lòng nhập nội dung"); return; }
        if (mode === "single" && !selUser) { setError("Vui lòng chọn người dùng"); return; }

        setSending(true);
        try {
            await notificationAdminApi.send({
                userId: mode === "single" ? selUser!.id : null,
                title, body,
            });
            setMsg("Gửi thông báo thành công!");
            setTitle(""); setBody(""); setSelUser(null); setUserSearch(""); setUserResults([]);
        } catch (e) {
            setError(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi server") : "Lỗi");
        } finally { setSending(false); }
    }

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Thông báo</div>
                    <div className="admin-page-subtitle">Gửi và quản lý thông báo đến người dùng</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 20 }}>
                {(["send", "history"] as const).map(t => (
                    <button key={t}
                        onClick={() => { setTab(t); setMsg(""); setError(""); }}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "10px 20px", border: "none", background: "none",
                            cursor: "pointer", fontWeight: tab === t ? 700 : 500,
                            fontSize: 14, color: tab === t ? "#2F6FED" : "#6B7280",
                            borderBottom: tab === t ? "2px solid #2F6FED" : "2px solid transparent",
                            marginBottom: -2
                        }}>
                        {t === "send" ? "Gửi thông báo" : "Lịch sử đã gửi"}
                    </button>
                ))}
            </div>

            {/* ── Tab: Send ── */}
            {tab === "send" && (
                <div className="admin-card" style={{ maxWidth: 560 }}>
                    {msg && <div className="admin-alert admin-alert-success">{msg}</div>}
                    {error && <div className="admin-alert admin-alert-error">{error}</div>}

                    {/* Recipient mode */}
                    <div className="admin-form-group">
                        <label className="admin-form-label">Gửi đến</label>
                        <div style={{ display: "flex", gap: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input type="radio" name="mode"
                                    checked={mode === "broadcast"}
                                    onChange={() => { setMode("broadcast"); setSelUser(null); setUserSearch(""); setUserResults([]); }} />
                                <span style={{ fontSize: 14 }}>Tất cả người dùng (Broadcast)</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input type="radio" name="mode"
                                    checked={mode === "single"}
                                    onChange={() => setMode("single")} />
                                <span style={{ fontSize: 14 }}>Người dùng cụ thể</span>
                            </label>
                        </div>
                    </div>

                    {mode === "single" && (
                        <div className="admin-form-group" style={{ position: "relative" }}>
                            <label className="admin-form-label">Tìm người dùng</label>
                            {selUser ? (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    background: "#EFF6FF", border: "1px solid #BFDBFE",
                                    borderRadius: 8, padding: "8px 12px"
                                }}>
                                    <span className="material-icons-round" style={{ fontSize: 16, color: "#2F6FED" }}>person</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{selUser.full_name}</div>
                                        <div style={{ fontSize: 12, color: "#6B7280" }}>{selUser.email}</div>
                                    </div>
                                    <button className="admin-btn admin-btn-outline admin-btn-sm"
                                        onClick={() => { setSelUser(null); setUserSearch(""); setUserResults([]); }}>
                                        Đổi
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input className="admin-form-input"
                                        placeholder="Tìm theo tên, email, số điện thoại..."
                                        value={userSearch}
                                        onChange={e => searchUsers(e.target.value)} />
                                    {userResults.length > 0 && (
                                        <div style={{
                                            position: "absolute", top: "100%", left: 0, right: 0,
                                            background: "#fff", border: "1px solid #E5E7EB",
                                            borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                            zIndex: 10, maxHeight: 200, overflowY: "auto"
                                        }}>
                                            {userResults.map(u => (
                                                <button key={u.id}
                                                    onClick={() => { setSelUser(u); setUserResults([]); }}
                                                    style={{
                                                        display: "block", width: "100%", padding: "10px 14px",
                                                        border: "none", background: "none", cursor: "pointer",
                                                        textAlign: "left", borderBottom: "1px solid #F3F4F6"
                                                    }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</div>
                                                    <div style={{ fontSize: 12, color: "#6B7280" }}>{u.email} • {u.phone_number}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="admin-form-group">
                        <label className="admin-form-label">Tiêu đề *</label>
                        <input className="admin-form-input"
                            placeholder="VD: Thông báo bảo trì hệ thống"
                            value={title}
                            onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-form-label">Nội dung *</label>
                        <textarea className="admin-form-input" rows={5}
                            placeholder="Nhập nội dung thông báo..."
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            style={{ resize: "vertical" }} />
                    </div>

                    <button className="admin-btn admin-btn-primary" onClick={handleSend} disabled={sending}
                        style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center" }}>
                        {sending ? "Đang gửi..." : mode === "broadcast" ? "Gửi broadcast đến tất cả" : "Gửi cho người dùng"}
                    </button>
                </div>
            )}

            {/* ── Tab: History ── */}
            {tab === "history" && (
                <div className="admin-card">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Loại</th>
                                    <th>Người nhận</th>
                                    <th>Tiêu đề</th>
                                    <th>Nội dung</th>
                                    <th>Thời gian gửi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="admin-loading">Đang tải...</td></tr>
                                ) : notifs.length === 0 ? (
                                    <tr><td colSpan={5} className="admin-empty">Chưa có thông báo nào</td></tr>
                                ) : notifs.map(n => (
                                    <tr key={n.id}>
                                        <td>
                                            <span className={`admin-badge ${n.noti_type === "admin" ? "badge-pending" : n.noti_type === "cancellation" ? "badge-cancelled" : "badge-active"}`}>
                                                {n.noti_type}
                                            </span>
                                        </td>
                                        <td>
                                            {n.user_id == null ? (
                                                <span style={{ color: "#D97706", fontWeight: 600 }}>Tất cả</span>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{n.user_name}</div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{n.user_email}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600, maxWidth: 200 }}>{n.title}</td>
                                        <td style={{ fontSize: 12, color: "#6B7280", maxWidth: 280 }}>
                                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {n.body}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            {new Date(n.created_at).toLocaleString("vi-VN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pagination">
                        <span>Hiển thị {notifs.length} / {total}</span>
                        <div className="admin-pagination-btns">
                            <button className="admin-pagination-btn" disabled={page === 0}
                                onClick={() => { const p = page - 1; setPage(p); fetchHistory(p); }}>Trước</button>
                            <button className="admin-pagination-btn active">{page + 1}</button>
                            <button className="admin-pagination-btn" disabled={page >= totalPages - 1}
                                onClick={() => { const p = page + 1; setPage(p); fetchHistory(p); }}>Sau</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
