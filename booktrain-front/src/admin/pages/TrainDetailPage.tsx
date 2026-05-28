import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trainAdminApi } from "../api/adminApi";
import axios from "axios";

interface SeatDetail { id: number; seat_number: string; berth_position: string; }
interface CarriageDetail {
    id: number;
    carriage_number: number;
    carriage_type: string;
    is_vip: boolean;
    amenities: string;
    seats_per_compartment: number;
    seats: SeatDetail[];
}
interface TrainData {
    id: number;
    train_code: string;
    train_name: string;
    train_type: string;
    carriages: CarriageDetail[];
}

interface TripStatus {
    hasActiveTrip: boolean;
    earliestNewTripDate: string;
    latestAllowedDate: string;
}

const TYPE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

function isSleeper(type: string) {
    return type === "sleeper_3" || type === "sleeper_2";
}

function berthsForType(type: string): 2 | 3 {
    return type === "sleeper_2" ? 2 : 3;
}

function getCompartments(seats: SeatDetail[]): SeatDetail[][] {
    const map = new Map<string, SeatDetail[]>();
    for (const s of seats) {
        const key = s.seat_number.includes("-") ? s.seat_number.split("-")[0] : s.seat_number;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    }
    return Array.from(map.values());
}

export default function TrainDetailPage() {
    const { trainId } = useParams<{ trainId: string }>();
    const navigate = useNavigate();
    const [train,      setTrain]      = useState<TrainData | null>(null);
    const [tripStatus, setTripStatus] = useState<TripStatus | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [selIdx,     setSelIdx]     = useState(0);
    const [msg,        setMsg]        = useState("");
    const [errors,     setErrors]     = useState<string[]>([]);
    const [busy,       setBusy]       = useState(false);

    const [carriageEdits, setCarriageEdits] = useState<Record<number, { isVip: boolean; amenities: string }>>({});
    const [typeConfirm, setTypeConfirm] = useState<{ carriageId: number; newType: string } | null>(null);

    async function fetchTrain() {
        try {
            const [trainRes, statusRes] = await Promise.all([
                trainAdminApi.detail(Number(trainId)),
                trainAdminApi.tripStatus(Number(trainId)),
            ]);
            setTrain(trainRes.data);
            setTripStatus(statusRes.data);
            const edits: Record<number, { isVip: boolean; amenities: string }> = {};
            for (const c of trainRes.data.carriages) {
                edits[c.id] = { isVip: !!c.is_vip, amenities: c.amenities ?? "" };
            }
            setCarriageEdits(edits);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchTrain(); }, [trainId]);

    const carriage = train?.carriages[selIdx] ?? null;
    const locked = tripStatus?.hasActiveTrip === true;

    // ─── Carriage actions ────────────────────────────────────────────────────────

    async function addCarriage() {
        if (!train || locked) return;
        if (train.carriages.length >= 8) { alert("Tàu đã có tối đa 8 toa"); return; }
        setBusy(true);
        try {
            await trainAdminApi.addCarriage(train.id, { carriageType: "seat" });
            await fetchTrain();
            setSelIdx(train.carriages.length);
            setMsg("Đã thêm toa mới");
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function deleteCarriage(carriageId: number, num: number) {
        if (locked) return;
        if (!confirm(`Xóa Toa ${num}? Toàn bộ ghế trong toa sẽ bị xóa.`)) return;
        setBusy(true);
        try {
            await trainAdminApi.deleteCarriage(carriageId);
            await fetchTrain();
            setSelIdx(0);
            setMsg("Đã xóa toa");
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function saveCarriageProps(carriageId: number) {
        if (locked) return;
        const edit = carriageEdits[carriageId];
        if (!edit) return;
        setBusy(true);
        try {
            await trainAdminApi.updateCarriage(carriageId, {
                isVip: edit.isVip,
                amenities: edit.amenities,
            });
            setMsg("Đã lưu thuộc tính toa");
            await fetchTrain();
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function changeCarriageType(carriageId: number, newType: string) {
        if (locked) return;
        setBusy(true);
        try {
            await trainAdminApi.updateCarriage(carriageId, { carriageType: newType });
            setMsg(`Đã đổi sang "${TYPE_LABEL[newType] ?? newType}", ghế cũ đã bị xóa`);
            await fetchTrain();
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally {
            setBusy(false);
            setTypeConfirm(null);
        }
    }

    // ─── Seat actions ────────────────────────────────────────────────────────────

    async function addSeat() {
        if (!carriage || locked) return;
        const sleeperType = isSleeper(carriage.carriage_type);

        if (sleeperType) {
            const compartments = getCompartments(carriage.seats);
            if (compartments.length >= 6) { alert("Toa nằm tối đa 6 khoang"); return; }
            const khoangLabel = (compartments.length + 1).toString().padStart(2, "0");
            const berths = berthsForType(carriage.carriage_type);
            const tierLabels = berths === 2
                ? [{ pos: "lower", label: `${khoangLabel}-L` }, { pos: "upper", label: `${khoangLabel}-U` }]
                : [{ pos: "lower", label: `${khoangLabel}-L` }, { pos: "middle", label: `${khoangLabel}-M` }, { pos: "upper", label: `${khoangLabel}-U` }];
            setBusy(true);
            try {
                for (const t of tierLabels) {
                    await trainAdminApi.addSeat(carriage.id, { seatNumber: t.label, berthPosition: t.pos });
                }
                setMsg(`Đã thêm khoang ${compartments.length + 1} (${berths} giường)`);
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        } else {
            if (carriage.seats.length >= 32) { alert("Toa ngồi tối đa 32 ghế"); return; }
            const nextNum = (carriage.seats.length + 1).toString().padStart(2, "0");
            setBusy(true);
            try {
                await trainAdminApi.addSeat(carriage.id, { seatNumber: nextNum, berthPosition: "seat" });
                setMsg("Đã thêm ghế");
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        }
    }

    async function deleteLastSeat() {
        if (!carriage || locked) return;
        const sleeperType = isSleeper(carriage.carriage_type);

        if (sleeperType) {
            const compartments = getCompartments(carriage.seats);
            if (compartments.length === 0) return;
            const lastKhoang = compartments[compartments.length - 1];
            if (!confirm(`Xóa khoang cuối (${lastKhoang.length} giường)?`)) return;
            setBusy(true);
            try {
                for (const s of lastKhoang) {
                    await trainAdminApi.deleteSeat(s.id);
                }
                setMsg("Đã xóa khoang");
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        } else {
            if (carriage.seats.length === 0) return;
            if (!confirm("Xóa ghế cuối?")) return;
            setBusy(true);
            try {
                await trainAdminApi.deleteSeat(carriage.seats[carriage.seats.length - 1].id);
                setMsg("Đã xóa ghế");
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        }
    }

    // ─── Validate ────────────────────────────────────────────────────────────────

    async function handleValidate() {
        if (!train) return;
        const res = await trainAdminApi.validate(train.id);
        setErrors(res.data.errors);
        if (res.data.valid) setMsg("Tàu hợp lệ — có thể lên kế hoạch chuyến");
    }

    // ─── Render ──────────────────────────────────────────────────────────────────

    if (loading) return <div className="admin-loading">Đang tải thông tin đoàn tàu...</div>;
    if (!train)  return <div className="admin-empty">Không tìm thấy đoàn tàu</div>;

    const sleeperCarriage = carriage ? isSleeper(carriage.carriage_type) : false;
    const compartments = (carriage && sleeperCarriage) ? getCompartments(carriage.seats) : [];

    const seatCell = (seat: SeatDetail) => (
        <div key={seat.id} style={{
            width: 44, height: 50, borderRadius: 10,
            border: "1.5px solid #93C5FD", background: "#DBEAFE",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#1E40AF", flexShrink: 0,
        }}>{seat.seat_number}</div>
    );

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
                    <div className="admin-page-subtitle">{train.carriages.length} toa • {train.train_type}</div>
                </div>
                <button className="admin-btn admin-btn-outline" onClick={handleValidate}>
                    Kiểm tra hợp lệ
                </button>
            </div>

            {/* Banner tàu đang chạy */}
            {locked && (
                <div style={{
                    background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8,
                    padding: "12px 16px", marginBottom: 16,
                    display: "flex", alignItems: "center", gap: 10
                }}>
                    <span style={{ fontWeight: 600, color: "#92400E" }}>
                        Tàu đang có kế hoạch khởi hành. Không thể chỉnh sửa toa tàu và ghế.
                    </span>
                </div>
            )}

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}
            {errors.length > 0 && (
                <div className="admin-alert admin-alert-error">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Tàu chưa hợp lệ:</div>
                    {errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
            )}

            {/* Sơ đồ đoàn tàu */}
            <div className="admin-card" style={{ overflow: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: "max-content", padding: "4px 0" }}>
                    <div style={{
                        width: 60, height: 40, borderRadius: "8px 4px 4px 8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, background: "#F1F5F9", border: "1.5px solid #E5E7EB",
                        overflow: "hidden",
                    }}>
                        <img src="/images/train.jpg" alt="Đầu tàu"
                            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                    </div>

                    {train.carriages.map((c, idx) => (
                        <button key={c.id}
                            onClick={() => setSelIdx(idx)}
                            style={{
                                width: 72, height: 56,
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
                            {c.is_vip && (
                                <span style={{ fontSize: 9, background: "#FFC107", color: "#7B4F00", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>VIP</span>
                            )}
                        </button>
                    ))}

                    <div style={{
                        width: 40, height: 56, background: "#374151", borderRadius: "4px 8px 8px 4px", flexShrink: 0
                    }} />

                    {train.carriages.length < 8 && (
                        <button className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={addCarriage}
                            disabled={busy || locked}
                            style={{ marginLeft: 12, flexShrink: 0 }}>
                            Thêm toa
                        </button>
                    )}
                </div>
            </div>

            {/* Chi tiết toa đang chọn */}
            {carriage && (
                <div className="admin-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>
                                Toa {carriage.carriage_number} — {TYPE_LABEL[carriage.carriage_type] ?? carriage.carriage_type}
                            </span>
                            <span style={{ fontSize: 12, color: "#6B7280" }}>{carriage.seats.length} ghế</span>
                        </div>
                        <button className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => deleteCarriage(carriage.id, carriage.carriage_number)}
                            disabled={busy || locked}>
                            Xóa toa
                        </button>
                    </div>

                    {/* Loại toa + VIP */}
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-form-label">Loại toa</label>
                            <select className="admin-form-select"
                                value={carriage.carriage_type}
                                disabled={locked}
                                onChange={e => {
                                    if (!locked && e.target.value !== carriage.carriage_type) {
                                        setTypeConfirm({ carriageId: carriage.id, newType: e.target.value });
                                    }
                                }}>
                                <option value="seat">Ghế ngồi (32 ghế)</option>
                                <option value="sleeper_3">Nằm khoang 6 — 3 giường/khoang</option>
                                <option value="sleeper_2">Nằm khoang 4 — 2 giường/khoang</option>
                            </select>
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: locked ? "not-allowed" : "pointer", marginBottom: 2 }}>
                            <input type="checkbox"
                                disabled={locked}
                                checked={carriageEdits[carriage.id]?.isVip ?? false}
                                onChange={e => !locked && setCarriageEdits(prev => ({
                                    ...prev,
                                    [carriage.id]: { ...prev[carriage.id], isVip: e.target.checked }
                                }))} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>Toa VIP</span>
                        </label>

                        {carriageEdits[carriage.id]?.isVip && (
                            <div className="admin-form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                                <label className="admin-form-label">Tiện ích</label>
                                <input className="admin-form-input"
                                    placeholder="VD: Điều hòa, TV, ổ cắm điện..."
                                    readOnly={locked}
                                    value={carriageEdits[carriage.id]?.amenities ?? ""}
                                    onChange={e => !locked && setCarriageEdits(prev => ({
                                        ...prev,
                                        [carriage.id]: { ...prev[carriage.id], amenities: e.target.value }
                                    }))} />
                            </div>
                        )}

                        <button className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => saveCarriageProps(carriage.id)}
                            disabled={busy || locked}>
                            Lưu toa
                        </button>
                    </div>

                    {/* ── Sơ đồ ghế ngồi ── */}
                    {!sleeperCarriage ? (
                        <div>
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                                Sơ đồ ghế ngồi (tối đa 32 ghế)
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
                                        textAlign: "center", fontSize: 11, fontWeight: 600,
                                        letterSpacing: 2, color: "#374151",
                                        borderTop: "1px dashed #CBD5E1",
                                        borderBottom: "1px dashed #CBD5E1",
                                        padding: "5px 0", margin: "0 0 8px",
                                    }}>
                                        H À N H &nbsp; L A N G
                                    </div>
                                    <div style={{ display: "flex", gap: 5 }}>
                                        {carriage.seats.slice(Math.ceil(carriage.seats.length / 2)).map(seatCell)}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={addSeat} disabled={busy || locked || carriage.seats.length >= 32}>
                                    Thêm ghế
                                </button>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={deleteLastSeat} disabled={busy || locked || carriage.seats.length === 0}>
                                    Xóa ghế cuối
                                </button>
                            </div>
                        </div>
                    ) : (
                    /* ── Sơ đồ giường nằm ── */
                        <div>
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                                Sơ đồ khoang nằm — {TYPE_LABEL[carriage.carriage_type]} • {compartments.length}/6 khoang
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {compartments.length === 0 && (
                                    <div style={{ color: "#9CA3AF", fontSize: 13 }}>
                                        Chưa có khoang. Bấm "Thêm khoang" để bắt đầu.
                                    </div>
                                )}
                                {compartments.map((comp, idx) => (
                                    <div key={idx} style={{
                                        border: "1.5px solid #D1D5DB", borderRadius: 8,
                                        padding: "8px 10px", minWidth: 76, background: "#F9FAFB", flexShrink: 0,
                                    }}>
                                        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                                            Khoang {idx + 1}
                                        </div>
                                        {comp.map(seat => (
                                            <div key={seat.id} style={{
                                                height: 28, background: "#E0F2FE",
                                                border: "1px solid #7DD3FC", borderRadius: 4, marginBottom: 4,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 11, fontWeight: 600, color: "#0369A1",
                                            }}>
                                                {seat.seat_number}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={addSeat} disabled={busy || locked || compartments.length >= 6}>
                                    Thêm khoang
                                </button>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={deleteLastSeat} disabled={busy || locked || compartments.length === 0}>
                                    Xóa khoang cuối
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm đổi loại toa */}
            {typeConfirm && (
                <div className="admin-modal-overlay" onClick={() => setTypeConfirm(null)}>
                    <div className="admin-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Đổi loại toa</span>
                            <button className="admin-modal-close" onClick={() => setTypeConfirm(null)}>✕</button>
                        </div>
                        <div className="admin-alert admin-alert-error" style={{ margin: "0 0 16px" }}>
                            Đổi sang <strong>{TYPE_LABEL[typeConfirm.newType]}</strong> sẽ{" "}
                            <strong>XÓA TOÀN BỘ ghế</strong> hiện tại và tự động sinh ghế mới theo loại toa.
                        </div>
                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setTypeConfirm(null)}>Hủy</button>
                            <button className="admin-btn admin-btn-danger"
                                onClick={() => changeCarriageType(typeConfirm.carriageId, typeConfirm.newType)}
                                disabled={busy}>
                                Xác nhận đổi loại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
