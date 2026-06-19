import { useEffect, useState } from "react";
import { locationAdminApi } from "../api/adminApi";

interface Station {
    id: number;
    code: string;
    name: string;
    vexere_code: string | null;
    vexere_station_id: number | null;
    order_index: number;
    city: string | null;
}

/**
 * READ-ONLY — Quản lý ga tàu chỉ hiển thị danh sách 4 ga từ train_stations.
 * Schema mới không CRUD ga thủ công.
 */
export default function LocationsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        let mounted = true;
        locationAdminApi.list()
            .then(res => { if (mounted) setStations(res.data); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý ga tàu</div>
                    <div className="admin-page-subtitle">
                        Danh sách ga trên tuyến (chỉ xem)
                    </div>
                </div>
            </div>

            <div className="admin-card">
                {loading ? (
                    <div className="admin-loading">Đang tải...</div>
                ) : stations.length === 0 ? (
                    <div className="admin-empty" style={{ padding: 32, textAlign: "center" }}>
                        Chưa có dữ liệu ga.
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Thứ tự</th>
                                    <th>Mã ga</th>
                                    <th>Tên ga</th>
                                    <th>Thành phố</th>
                                    <th>Mã Vexere</th>
                                    <th>Vexere Station ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 700 }}>{s.order_index}</td>
                                        <td><strong style={{ color: "#2F6FED" }}>{s.code}</strong></td>
                                        <td>{s.name}</td>
                                        <td>{s.city ?? "—"}</td>
                                        <td>{s.vexere_code ?? "—"}</td>
                                        <td style={{ color: "#9CA3AF" }}>{s.vexere_station_id ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
