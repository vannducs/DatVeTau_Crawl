import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trainAdminApi } from "../api/adminApi";

interface TrainItem {
    id: number;
    train_code: string;
    train_name: string;
    train_type: string;
    carriage_count: number;
    has_active_trip: boolean;
}

/**
 * READ-ONLY — Danh mục tàu. Dữ liệu tàu lấy từ Vexere (crawler), không CRUD thủ công.
 * Chỉ xem danh sách + mở Chi tiết (read-only).
 */
export default function TrainsPage() {
    const navigate = useNavigate();
    const [trains,  setTrains]  = useState<TrainItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        trainAdminApi.list()
            .then(res => { if (mounted) setTrains(res.data); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Danh mục tàu</div>
                    <div className="admin-page-subtitle">
                        Tổng: {trains.length} đoàn tàu • Dữ liệu từ Vexere (chỉ xem)
                    </div>
                </div>
            </div>

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
                                            <span className="admin-badge badge-active">Sẵn sàng</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="admin-btn admin-btn-outline admin-btn-sm"
                                            onClick={() => navigate(`/admin/trains/${t.id}`)}
                                        >
                                            Chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
