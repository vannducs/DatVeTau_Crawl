import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trainAdminApi } from "../api/adminApi";
import axios from "axios";

interface TrainItem {
    id: number;
    train_code: string;
    train_name: string;
    train_type: string;
    carriage_count: number;
    has_active_trip: boolean;
}

const EMPTY_FORM = { trainCode: "", trainName: "", trainType: "express" };

export default function TrainsPage() {
    const navigate = useNavigate();
    const [trains,    setTrains]    = useState<TrainItem[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form,      setForm]      = useState(EMPTY_FORM);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState("");
    const [error,     setError]     = useState("");

    async function fetchTrains() {
        setLoading(true);
        try {
            const res = await trainAdminApi.list();
            setTrains(res.data);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchTrains(); }, []);

    async function handleCreate() {
        if (!form.trainCode.trim() || !form.trainName.trim()) {
            setError("Vui lòng điền đầy đủ mã tàu và tên tàu");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await trainAdminApi.create(form);
            setMsg("Tạo tàu thành công");
            setShowModal(false);
            setForm(EMPTY_FORM);
            fetchTrains();
        } catch (e) {
            setError(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi server") : "Lỗi");
        } finally { setSaving(false); }
    }

    async function handleDelete(id: number, code: string) {
        if (!confirm(`Xóa tàu "${code}"? Chỉ xóa được nếu chưa có chuyến nào.`)) return;
        try {
            await trainAdminApi.delete(id);
            setMsg("Xóa tàu thành công");
            fetchTrains();
        } catch (e) {
            setMsg("");
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Không thể xóa") : "Lỗi");
        }
    }

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý đoàn tàu</div>
                    <div className="admin-page-subtitle">Tổng: {trains.length} đoàn tàu</div>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => { setShowModal(true); setError(""); }}>
                    Thêm tàu mới
                </button>
            </div>

            {msg && (
                <div className="admin-alert admin-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {msg}
                </div>
            )}

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã tàu</th>
                                <th>Tên tàu</th>
                                <th>Loại</th>
                                <th>Số toa</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="admin-loading">Đang tải...</td></tr>
                            ) : trains.length === 0 ? (
                                <tr><td colSpan={6} className="admin-empty">Chưa có đoàn tàu nào</td></tr>
                            ) : trains.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <span style={{ fontWeight: 700, color: "#2F6FED" }}>{t.train_code}</span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{t.train_name}</td>
                                    <td style={{ fontSize: 12, color: "#6B7280" }}>{t.train_type}</td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{t.carriage_count}</span>
                                        <span style={{ color: "#9CA3AF", fontSize: 12 }}> toa</span>
                                    </td>
                                    <td>
                                        {t.has_active_trip ? (
                                            <span className="admin-badge badge-used">Đang chạy</span>
                                        ) : (
                                            <span className="admin-badge badge-active">Có thể chỉnh sửa</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                className="admin-btn admin-btn-outline admin-btn-sm"
                                                onClick={() => navigate(`/admin/trains/${t.id}`)}
                                                disabled={t.has_active_trip}
                                                title={t.has_active_trip ? "Tàu đang chạy, không thể chỉnh sửa" : ""}
                                            >
                                                Chi tiết
                                            </button>
                                            <button
                                                className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleDelete(t.id, t.train_code)}
                                                disabled={t.has_active_trip}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal thêm tàu */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Thêm đoàn tàu mới</span>
                            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {error && <div className="admin-alert admin-alert-error">{error}</div>}

                        <div className="admin-form-group">
                            <label className="admin-form-label">Mã tàu *</label>
                            <input className="admin-form-input" placeholder="VD: SE1, SE3..."
                                value={form.trainCode}
                                onChange={e => setForm(f => ({ ...f, trainCode: e.target.value.toUpperCase() }))} />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Tên tàu *</label>
                            <input className="admin-form-input" placeholder="VD: Thống Nhất SE1"
                                value={form.trainName}
                                onChange={e => setForm(f => ({ ...f, trainName: e.target.value }))} />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Loại tàu</label>
                            <select className="admin-form-select"
                                value={form.trainType}
                                onChange={e => setForm(f => ({ ...f, trainType: e.target.value }))}>
                                <option value="express">Tàu nhanh (Express)</option>
                                <option value="local">Tàu chậm (Local)</option>
                                <option value="high_speed">Tàu cao tốc</option>
                            </select>
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="admin-btn admin-btn-primary" onClick={handleCreate} disabled={saving}>
                                {saving ? "Đang tạo..." : "Tạo tàu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
