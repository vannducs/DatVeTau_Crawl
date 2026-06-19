import { useEffect, useState, useCallback } from "react";
import { tripAdminApi, trainAdminApi } from "../api/adminApi";
import { stationApi } from "../../api/station";
import axios from "axios";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripItem {
    id: number;
    train_id: number;
    train_code: string;
    train_name: string;
    origin_name: string;
    destination_name: string;
    departure_time: string;
    arrival_time: string;
    status: string;
    is_hidden: boolean;
    has_real_booking: boolean;
    confirmed_bookings: number;
}

interface TrainOption {
    id: number;
    train_code: string;
    train_name: string;
}

interface StationOption {
    id: number;
    name: string;
}

const STATUS_BADGE: Record<string, string> = {
    open: "badge-active",
    cancelled: "badge-cancelled",
    completed: "badge-used",
};

const STATUS_LABEL: Record<string, string> = {
    open: "Đang mở",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function TripsPage() {
    const [trips,        setTrips]        = useState<TripItem[]>([]);
    const [total,        setTotal]        = useState(0);
    const [page,         setPage]         = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [msg,          setMsg]          = useState("");
    const [busyId,       setBusyId]       = useState<number | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState("");
    const [filterTrain,  setFilterTrain]  = useState("");
    const [filterFrom,   setFilterFrom]   = useState("");
    const [filterTo,     setFilterTo]     = useState("");
    const [filterDate,   setFilterDate]   = useState("");

    const [allTrains,    setAllTrains]    = useState<TrainOption[]>([]);
    const [stations,     setStations]     = useState<StationOption[]>([]);

    const SIZE = 10;

    const fetchTrips = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const res = await tripAdminApi.list({
                page: p, size: SIZE,
                status:        filterStatus || undefined,
                trainId:       filterTrain  || undefined,
                fromStationId: filterFrom   || undefined,
                toStationId:   filterTo     || undefined,
                date:          filterDate   || undefined,
            });
            setTrips(res.data.trips ?? []);
            setTotal(res.data.total ?? 0);
        } catch (e) {
            console.error("Lỗi tải danh sách chuyến:", e);
            setTrips([]);
            setTotal(0);
        } finally { setLoading(false); }
    }, [filterStatus, filterTrain, filterFrom, filterTo, filterDate, page]);

    useEffect(() => { fetchTrips(0); setPage(0); }, [filterStatus, filterTrain, filterFrom, filterTo, filterDate]);

    useEffect(() => {
        trainAdminApi.list().then(r => setAllTrains(r.data)).catch(() => {});
        stationApi.getAll().then(r => {
            setStations(r.data.map(s => ({ id: s.id, name: s.name })));
        }).catch(() => {});
    }, []);

    // ─── Actions ───────────────────────────────────────────────────────────────

    async function handleToggleHidden(trip: TripItem) {
        setBusyId(trip.id);
        try {
            const res = await tripAdminApi.toggleHidden(trip.id);
            setMsg(res.data.message);
            await fetchTrips(page);
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusyId(null); }
    }

    async function handleDelete(trip: TripItem) {
        if (trip.has_real_booking) {
            alert("Chuyến đã có vé bán, không thể xóa");
            return;
        }
        if (!confirm(`Xóa chuyến ${trip.train_code} (${trip.origin_name} → ${trip.destination_name})? Toàn bộ toa/ghế của chuyến sẽ bị xóa.`))
            return;
        setBusyId(trip.id);
        try {
            const res = await tripAdminApi.remove(trip.id);
            setMsg(res.data.message);
            await fetchTrips(page);
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusyId(null); }
    }

    function clearFilters() {
        setFilterStatus(""); setFilterTrain(""); setFilterFrom(""); setFilterTo(""); setFilterDate("");
    }

    const totalPages = Math.ceil(total / SIZE);

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý chuyến đi</div>
                    <div className="admin-page-subtitle">
                        Chuyến crawl từ Vexere • Tổng: {total} chuyến • Chỉ xem / ẩn / xóa
                    </div>
                </div>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            {/* Filters */}
            <div className="admin-card">
                <div className="admin-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
                    <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="open">Đang mở</option>
                        <option value="hidden">Đã ẩn</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                    <select className="admin-select" value={filterTrain} onChange={e => setFilterTrain(e.target.value)}>
                        <option value="">Tất cả tàu</option>
                        {allTrains.map(t => (
                            <option key={t.id} value={t.id}>[{t.train_code}] {t.train_name}</option>
                        ))}
                    </select>
                    <select className="admin-select" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}>
                        <option value="">Ga đi (tất cả)</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="admin-select" value={filterTo} onChange={e => setFilterTo(e.target.value)}>
                        <option value="">Ga đến (tất cả)</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="date" className="admin-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                    <button className="admin-btn admin-btn-outline" onClick={clearFilters}>Xóa lọc</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Chuyến</th>
                                <th>Tuyến</th>
                                <th>Giờ khởi hành</th>
                                <th>Giờ đến</th>
                                <th>Đã đặt</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="admin-loading">Đang tải...</td></tr>
                            ) : trips.length === 0 ? (
                                <tr><td colSpan={7} className="admin-empty">Không có dữ liệu</td></tr>
                            ) : trips.map(t => (
                                <tr key={t.id} style={t.is_hidden ? { background: "#FAFAFA", opacity: 0.75 } : undefined}>
                                    <td>
                                        <div style={{ fontWeight: 700, color: "#2F6FED" }}>{t.train_code}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{t.train_name}</div>
                                    </td>
                                    <td style={{ color: "#1F2937" }}>
                                        {t.origin_name} → {t.destination_name}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {t.departure_time ? new Date(t.departure_time).toLocaleString("vi-VN") : "—"}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {t.arrival_time ? new Date(t.arrival_time).toLocaleString("vi-VN") : "—"}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{t.confirmed_bookings}</td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[t.status] ?? "badge-pending"}`}>
                                            {STATUS_LABEL[t.status] ?? t.status}
                                        </span>
                                        {t.is_hidden && (
                                            <span className="admin-badge badge-pending" style={{ marginLeft: 6 }}>Đã ẩn</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button className="admin-btn admin-btn-outline admin-btn-sm"
                                                disabled={busyId === t.id}
                                                onClick={() => handleToggleHidden(t)}>
                                                {t.is_hidden ? "Hiện" : "Ẩn"}
                                            </button>
                                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                                disabled={busyId === t.id || t.has_real_booking}
                                                title={t.has_real_booking ? "Chuyến đã có vé bán, không thể xóa" : "Xóa chuyến"}
                                                onClick={() => handleDelete(t)}>
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {trips.length} / {total} chuyến</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn"
                            disabled={page === 0}
                            onClick={() => { const p = page - 1; setPage(p); fetchTrips(p); }}>
                            Trước
                        </button>
                        <button className="admin-pagination-btn active">{page + 1} / {Math.max(totalPages, 1)}</button>
                        <button className="admin-pagination-btn"
                            disabled={page >= totalPages - 1}
                            onClick={() => { const p = page + 1; setPage(p); fetchTrips(p); }}>
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
