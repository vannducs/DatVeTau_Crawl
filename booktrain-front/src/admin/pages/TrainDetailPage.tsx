import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trainAdminApi } from "../api/adminApi";

interface SeatDetail {
    id: number;
    seat_number: string;
    berth_position: string;
    status: string;
}
interface CarriageDetail {
    id: number;
    carriage_number: number;
    carriage_type: string;
    carriage_model: string;
    carriage_name: string;
    total_seats: number;
    available_seats: number;
    seats: SeatDetail[];
}
interface TrainData {
    id: number;
    train_code: string;
    train_name: string;
    train_type: string;
    status: string;
    carriages: CarriageDetail[];
}

const TYPE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

function isSleeper(type: string) {
    return type === "sleeper_3" || type === "sleeper_2";
}

/** Nhóm ghế nằm theo khoang (prefix trước dấu "-"). */
function getCompartments(seats: SeatDetail[]): SeatDetail[][] {
    const map = new Map<string, SeatDetail[]>();
    for (const s of seats) {
        const key = s.seat_number.includes("-") ? s.seat_number.split("-")[0] : s.seat_number;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    }
    return Array.from(map.values());
}

/**
 * READ-ONLY — Trang Chi tiết tàu chỉ hiển thị toa/ghế (lấy từ chuyến gần nhất).
 * Schema mới quản lý toa/ghế tự động qua crawler Vexere → không CRUD thủ công.
 */
export default function TrainDetailPage() {
    const { trainId } = useParams<{ trainId: string }>();
    const navigate = useNavigate();
    const [train,   setTrain]   = useState<TrainData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selIdx,  setSelIdx]  = useState(0);

    useEffect(() => {
        let mounted = true;
        trainAdminApi.detail(Number(trainId))
            .then(res => { if (mounted) setTrain(res.data); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [trainId]);

    if (loading) return <div className="admin-loading">Đang tải thông tin đoàn tàu...</div>;
    if (!train)  return <div className="admin-empty">Không tìm thấy đoàn tàu</div>;

    const carriage = train.carriages[selIdx] ?? null;
    const sleeperCarriage = carriage ? isSleeper(carriage.carriage_type) : false;
    const compartments = (carriage && sleeperCarriage) ? getCompartments(carriage.seats) : [];

    const seatColor = (s: SeatDetail) => s.status === "booked"
        ? { bg: "#F3F4F6", border: "#E5E7EB", text: "#9CA3AF" }
        : { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF" };

    const seatCell = (seat: SeatDetail) => {
        const c = seatColor(seat);
        return (
            <div key={seat.id} style={{
                width: 44, height: 50, borderRadius: 10,
                border: `1.5px solid ${c.border}`, background: c.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: c.text, flexShrink: 0,
            }}>{seat.status === "booked" ? "✕" : seat.seat_number}</div>
        );
    };

    return (
        <div>
            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={() => navigate("/admin/trains")}>
                            Danh sách tàu
                        </button>
                        <div className="admin-page-title">{train.train_code} — {train.train_name}</div>
                    </div>
                    <div className="admin-page-subtitle">
                        {train.carriages.length} toa • {train.train_type}
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#9CA3AF" }}>(chỉ xem)</span>
                    </div>
                </div>
            </div>

            <div className="admin-alert" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" }}>
                Toa/ghế được lấy tự động từ dữ liệu chuyến gần nhất (crawl Vexere). Trang này chỉ để xem.
            </div>

            {train.carriages.length === 0 ? (
                <div className="admin-card">
                    <div className="admin-empty" style={{ padding: 32, textAlign: "center" }}>
                        Tàu này chưa có dữ liệu toa/ghế (chưa có chuyến được crawl).
                    </div>
                </div>
            ) : (
                <>
                    {/* Sơ đồ đoàn tàu */}
                    <div className="admin-card" style={{ overflow: "auto" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: "max-content", padding: "4px 0" }}>
                            <div style={{
                                width: 60, height: 40, borderRadius: "8px 4px 4px 8px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, background: "#F1F5F9", border: "1.5px solid #E5E7EB", overflow: "hidden",
                            }}>
                                <img src="/images/train.jpg" alt="Đầu tàu"
                                    style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                            </div>

                            {train.carriages.map((c, idx) => (
                                <button key={c.id}
                                    onClick={() => setSelIdx(idx)}
                                    style={{
                                        width: 84, height: 56,
                                        border: selIdx === idx ? "2.5px solid #2F6FED" : "1.5px solid #E5E7EB",
                                        borderRadius: 6,
                                        background: selIdx === idx ? "#EFF6FF" : "#fff",
                                        cursor: "pointer", display: "flex", flexDirection: "column",
                                        alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0, padding: 0,
                                    }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: selIdx === idx ? "#2F6FED" : "#374151" }}>
                                        Toa {c.carriage_number}
                                    </span>
                                    <span style={{ fontSize: 9, color: "#6B7280" }}>{TYPE_LABEL[c.carriage_type] ?? c.carriage_type}</span>
                                    <span style={{ fontSize: 9, color: "#9CA3AF" }}>{c.available_seats}/{c.total_seats} trống</span>
                                </button>
                            ))}

                            <div style={{ width: 40, height: 56, background: "#374151", borderRadius: "4px 8px 8px 4px", flexShrink: 0 }} />
                        </div>
                    </div>

                    {/* Chi tiết toa đang chọn */}
                    {carriage && (
                        <div className="admin-card">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, fontSize: 16 }}>
                                    Toa {carriage.carriage_number} — {TYPE_LABEL[carriage.carriage_type] ?? carriage.carriage_type}
                                </span>
                                {carriage.carriage_model && (
                                    <span style={{ fontSize: 12, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 4 }}>
                                        {carriage.carriage_model}
                                    </span>
                                )}
                                <span style={{ fontSize: 12, color: "#6B7280" }}>
                                    {carriage.available_seats}/{carriage.total_seats} chỗ trống
                                </span>
                            </div>

                            {!sleeperCarriage ? (
                                <div>
                                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                                        Sơ đồ ghế ngồi ({carriage.seats.length} ghế)
                                    </div>
                                    <div style={{ overflowX: "auto" }}>
                                        <div style={{
                                            display: "inline-flex", flexDirection: "column",
                                            border: "3px solid #BFDBFE", borderRadius: 10,
                                            padding: "14px 18px", background: "#fff",
                                        }}>
                                            <div style={{ display: "flex", gap: 5, paddingBottom: 8 }}>
                                                {carriage.seats.length === 0
                                                    ? <span style={{ fontSize: 13, color: "#9CA3AF", lineHeight: "50px" }}>Chưa có ghế</span>
                                                    : carriage.seats.slice(0, Math.ceil(carriage.seats.length / 2)).map(seatCell)}
                                            </div>
                                            <div style={{
                                                textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: 2, color: "#374151",
                                                borderTop: "1px dashed #CBD5E1", borderBottom: "1px dashed #CBD5E1",
                                                padding: "5px 0", margin: "0 0 8px",
                                            }}>
                                                H À N H &nbsp; L A N G
                                            </div>
                                            <div style={{ display: "flex", gap: 5 }}>
                                                {carriage.seats.slice(Math.ceil(carriage.seats.length / 2)).map(seatCell)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                                        Sơ đồ khoang nằm — {TYPE_LABEL[carriage.carriage_type]} • {compartments.length} khoang
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {compartments.map((comp, idx) => (
                                            <div key={idx} style={{
                                                border: "1.5px solid #D1D5DB", borderRadius: 8,
                                                padding: "8px 10px", minWidth: 76, background: "#F9FAFB", flexShrink: 0,
                                            }}>
                                                <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                                                    Khoang {idx + 1}
                                                </div>
                                                {comp.map(seat => {
                                                    const c = seatColor(seat);
                                                    return (
                                                        <div key={seat.id} style={{
                                                            height: 28, background: c.bg, border: `1px solid ${c.border}`,
                                                            borderRadius: 4, marginBottom: 4,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: 11, fontWeight: 600, color: c.text,
                                                        }}>
                                                            {seat.status === "booked" ? "✕" : seat.seat_number}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
