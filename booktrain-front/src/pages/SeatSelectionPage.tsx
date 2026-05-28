import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/common/Header";
import { tripApi } from "../api/trip";
import type { SeatDTO } from "../types/seat";
import "./SeatSelection.css";

interface CarriageGroup {
    carriageNumber: number;
    carriageType: string;
    carriageId: number;
    isVip: boolean;
    seats: SeatDTO[];
}

const CARRIAGE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

export default function SeatSelectionPage() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromStationId = Number(searchParams.get("fromStationId"));
    const toStationId   = Number(searchParams.get("toStationId"));
    const adult   = Number(searchParams.get("adult")  || 1);
    const child   = Number(searchParams.get("child")  || 0);
    const elderly = Number(searchParams.get("elderly")|| 0);
    const student = Number(searchParams.get("student")|| 0);
    const union   = Number(searchParams.get("union")  || 0);
    const totalPassengers = adult + child + elderly + student + union;

    const [carriages, setCarriages] = useState<CarriageGroup[]>([]);
    const [selectedCarriage, setSelectedCarriage] = useState<CarriageGroup | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<SeatDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId || !fromStationId || !toStationId) return;
        tripApi.getSeats(Number(tripId), fromStationId, toStationId)
            .then(res => {
                const data: Record<string, SeatDTO[]> = res.data;
                const groups: CarriageGroup[] = Object.entries(data).map(([num, seats]) => ({
                    carriageNumber: Number(num),
                    carriageType: seats[0]?.carriageType || "",
                    carriageId: seats[0]?.carriageId || 0,
                    isVip: seats[0]?.isVip ?? false,
                    seats,
                }));
                groups.sort((a, b) => a.carriageNumber - b.carriageNumber);
                setCarriages(groups);
                setSelectedCarriage(groups[0] || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [tripId]);

    function handleSelectSeat(seat: SeatDTO) {
        if (seat.status === "booked") return;
        setSelectedSeats(prev => {
            const exists = prev.find(s => s.id === seat.id);
            if (exists) return prev.filter(s => s.id !== seat.id);
            return [...prev, seat];
        });
    }

    function isSeatSelected(seat: SeatDTO) {
        return selectedSeats.some(s => s.id === seat.id);
    }

    const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

    function getSeatClass(seat: SeatDTO) {
        if (seat.status === "booked") return "ss-seat ss-seat--booked";
        if (isSeatSelected(seat)) return "ss-seat ss-seat--selected";
        return "ss-seat ss-seat--available";
    }

    function renderSeatCarriage(seats: SeatDTO[]) {
        const display = seats.slice(0, 32);
        const half = Math.ceil(display.length / 2);
        const topRow = display.slice(0, half);
        const bottomRow = display.slice(half);

        return (
            <div className="ss-seat-map-wrap">
                <div className="ss-seat-map">
                    <div className="ss-seat-row">
                        {topRow.map(seat => (
                            <div key={seat.id} className={getSeatClass(seat)}
                                onClick={() => handleSelectSeat(seat)}>
                                <div className="ss-seat-icon">
                                    {seat.status === "booked"
                                        ? <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
                                        : seat.seatNumber}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="ss-aisle"><span>H À N H &nbsp; L A N G</span></div>
                    <div className="ss-seat-row">
                        {bottomRow.map(seat => (
                            <div key={seat.id} className={getSeatClass(seat)}
                                onClick={() => handleSelectSeat(seat)}>
                                <div className="ss-seat-icon">
                                    {seat.status === "booked"
                                        ? <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
                                        : seat.seatNumber}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    function renderSleeperCarriage(seats: SeatDTO[]) {
        // Group by khoang prefix (e.g., "01" from "01-L"). Fall back to index-based
        // grouping for legacy data that lacks the "-X" suffix format.
        const hasPrefixFormat = seats.filter(s => s.seatNumber.includes("-")).length > seats.length / 2;

        let compartments: SeatDTO[][];
        if (hasPrefixFormat) {
            const map = new Map<string, SeatDTO[]>();
            for (const s of seats) {
                const key = s.seatNumber.split("-")[0];
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(s);
            }
            compartments = Array.from(map.values()).slice(0, 6);
        } else {
            const displaySeats = seats.slice(0, 18);
            compartments = [];
            for (let i = 0; i < displaySeats.length; i += 3) {
                compartments.push(displaySeats.slice(i, i + 3));
            }
        }

        const maxBerths = compartments.reduce((m, c) => Math.max(m, c.length), 2);
        const tierLabels = ["Tầng 1", "Tầng 2", "Tầng 3"].slice(0, maxBerths);

        return (
            <div className="ss-sleeper-wrap">
                <div className="ss-sleeper-aisle-label">H À N H &nbsp; L A N G</div>
                <div className="ss-sleeper-grid">
                    <div className="ss-tier-labels">
                        {tierLabels.map(label => (
                            <div key={label} className="ss-tier-label">{label}</div>
                        ))}
                    </div>
                    <div className="ss-compartments">
                        {compartments.map((comp, idx) => (
                            <div key={idx} className="ss-compartment">
                                {Array.from({ length: maxBerths }).map((_, row) => {
                                    const seat = comp[row];
                                    if (!seat) return <div key={row} className="ss-berth ss-berth--empty" />;
                                    return (
                                        <div key={row}
                                            className={`ss-berth ${seat.status === "booked" ? "ss-berth--booked" : isSeatSelected(seat) ? "ss-berth--selected" : "ss-berth--available"}`}
                                            onClick={() => handleSelectSeat(seat)}>
                                            <span className="ss-berth-num">
                                                {seat.status === "booked"
                                                    ? <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
                                                    : seat.seatNumber}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="ss-compartment-footer">
                    <div className="ss-tier-label-spacer" />
                    <div className="ss-compartment-nums">
                        {compartments.map((_, idx) => (
                            <div key={idx} className="ss-compartment-num">{idx + 1}</div>
                        ))}
                    </div>
                </div>
                <div className="ss-khoang-row">
                    <div className="ss-tier-label-spacer" />
                    <span className="ss-khoang-text">KHOANG</span>
                </div>
            </div>
        );
    }

    if (loading) return (
        <>
            <Header />
            <div className="ss-loading" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span className="material-icons-round" style={{ fontSize: 24, color: "#2F6FED" }}>event_seat</span>
                Đang tải sơ đồ ghế...
            </div>
        </>
    );

    const isSleeper = (type: string) => type === "sleeper_3" || type === "sleeper_2";

    return (
        <>
            <Header />
            <div className="ss-page">
                {/* Chọn toa */}
                <div className="ss-carriage-bar">
                    <div className="ss-carriage-bar-inner">
                        {/* Đầu tàu */}
                        <div className="ss-locomotive">
                            <img src="/images/train.jpg" alt="Đầu tàu"
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                        </div>

                        {carriages.map(c => {
                            const avail = c.seats.filter(s => s.status === "available").length;
                            const isActive = selectedCarriage?.carriageNumber === c.carriageNumber;
                            return (
                                <button key={c.carriageNumber}
                                    className={`ss-cbtn ${isActive ? "ss-cbtn--active" : ""} ${avail === 0 ? "ss-cbtn--full" : ""}`}
                                    onClick={() => avail > 0 && setSelectedCarriage(c)}>
                                    <span className="ss-cbtn-num">Toa {c.carriageNumber}</span>
                                    <span className="ss-cbtn-type">
                                        {CARRIAGE_LABEL[c.carriageType] ?? c.carriageType}
                                        {c.isVip && " ★ VIP"}
                                    </span>
                                    <span className="ss-cbtn-info">
                                        {avail > 0 ? `${avail} chỗ trống` : "Hết chỗ"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sơ đồ ghế */}
                {selectedCarriage && (
                    <div className="ss-map-section">
                        <div className="ss-map-header">
                            <div className="ss-map-left">
                                <h3 className="ss-map-title">
                                    Toa {selectedCarriage.carriageNumber} —{" "}
                                    {CARRIAGE_LABEL[selectedCarriage.carriageType] ?? selectedCarriage.carriageType}
                                    {selectedCarriage.isVip && (
                                        <span style={{
                                            marginLeft: 8, background: "#FFC107", color: "#7B4F00",
                                            padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700
                                        }}>VIP</span>
                                    )}
                                    <span style={{ fontWeight: 400, fontSize: 14, color: "#6B7280", marginLeft: 8 }}>
                                        ({selectedCarriage.seats.filter(s => s.status === "available").length} chỗ trống
                                        / {selectedCarriage.seats.length} chỗ)
                                    </span>
                                </h3>
                            </div>
                            <div className="ss-legend">
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--available" />
                                    Chỗ trống
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--selected" />
                                    Đang chọn
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--booked" />
                                    Đã bán
                                </span>
                            </div>
                        </div>

                        <div className="ss-map-content">
                            {isSleeper(selectedCarriage.carriageType)
                                ? renderSleeperCarriage(selectedCarriage.seats)
                                : renderSeatCarriage(selectedCarriage.seats)
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Footer cố định */}
            <div className="ss-footer">
                <div className="ss-footer-inner">
                    <div className="ss-footer-seats-wrap">
                        {selectedSeats.length === 0 ? (
                            <span className="ss-footer-placeholder">Bấm để chọn chỗ</span>
                        ) : (
                            selectedSeats.map(s => (
                                <span key={s.id} className="ss-footer-tag">
                                    Ghế {s.seatNumber}
                                    <button className="ss-footer-tag-remove"
                                        onClick={() => handleSelectSeat(s)}>
                                        <span className="material-icons-round" style={{ fontSize: 12 }}>close</span>
                                    </button>
                                </span>
                            ))
                        )}
                    </div>
                    <div className="ss-footer-total">
                        <span className="ss-footer-total-label">
                            Tổng cộng cho {Math.max(selectedSeats.length, 1)} người:
                        </span>
                        <span className="ss-footer-total-price">
                            {totalPrice.toLocaleString("vi-VN")}đ
                        </span>
                    </div>
                    <button className="ss-footer-continue"
                        disabled={selectedSeats.length === 0 || selectedSeats.length !== totalPassengers}
                        onClick={() => {
                            const seatIds = selectedSeats.map(s => s.id).join(",");
                            navigate(
                                `/trains/passenger-info?tripId=${tripId}&seatIds=${seatIds}&fromStationId=${fromStationId}&toStationId=${toStationId}` +
                                `&adult=${adult}&child=${child}&elderly=${elderly}&student=${student}&union=${union}`
                            );
                        }}>
                        {selectedSeats.length === totalPassengers
                            ? "Tiếp tục"
                            : `Chọn thêm ${totalPassengers - selectedSeats.length} ghế`}
                    </button>
                </div>
            </div>
        </>
    );
}
