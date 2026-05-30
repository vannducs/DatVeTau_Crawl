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

/** Format giá ngắn gọn: 758000→"758K", 1322000→"1.3M" */
function formatPrice(price: number): string {
    if (!price || price <= 0) return "";
    if (price >= 1_000_000) {
        const v = price / 1_000_000;
        return (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".0", "")) + "M";
    }
    if (price >= 1_000) return Math.round(price / 1_000) + "K";
    return price.toString();
}

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
                    carriageType:   seats[0]?.carriageType || "",
                    carriageId:     seats[0]?.carriageId   || 0,
                    isVip:          seats[0]?.isVip ?? false,
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

    const totalPrice = selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0);

    function getSeatClass(seat: SeatDTO) {
        if (seat.status === "booked") return "ss-seat ss-seat--booked";
        if (isSeatSelected(seat))     return "ss-seat ss-seat--selected";
        return "ss-seat ss-seat--available";
    }

    // ── Toa ngồi: 4 hàng × N cột, chia BÀN dọc ở giữa ─────────────────────────

    function SeatBox({ seat }: { seat: SeatDTO | undefined }) {
        if (!seat) return <div className="ss-seat ss-seat--empty" />;
        return (
            <div className={getSeatClass(seat)} onClick={() => handleSelectSeat(seat)}>
                {seat.status === "booked" ? (
                    <div className="ss-seat-booked-mark">✕</div>
                ) : (
                    <>
                        <div className="ss-seat-icon">{seat.seatNumber}</div>
                        {seat.price > 0 && (
                            <div className="ss-seat-price">{formatPrice(seat.price)}</div>
                        )}
                    </>
                )}
            </div>
        );
    }

    function renderSeatCarriage(seats: SeatDTO[]) {
        const totalCols = Math.ceil(seats.length / 4);  // 16 cho 64 ghế
        const halfCols  = Math.ceil(totalCols / 2);     // 8

        // Tra ghế theo số thứ tự thực: col*4 + rowInCol + 1
        function getSeatAt(col: number, rowInCol: number): SeatDTO | undefined {
            const n = col * 4 + rowInCol + 1;
            return seats.find(s => parseInt(s.seatNumber) === n);
        }

        // rowInCol → vị trí hàng trong UI (giống Vexere, cửa sổ xa hành lang)
        // 3 → hàng 1 (xa hành lang, trên)
        // 1 → hàng 2 (gần hành lang, trên)
        //       HÀNH LANG
        // 2 → hàng 3 (gần hành lang, dưới)
        // 0 → hàng 4 (xa hành lang, dưới)
        function renderRow(rowInCol: number) {
            const rightCols = totalCols - halfCols;
            return (
                <div className="ss-seat-row">
                    <div className="ss-seat-half">
                        {Array.from({ length: halfCols }, (_, col) => (
                            <SeatBox key={col} seat={getSeatAt(col, rowInCol)} />
                        ))}
                    </div>
                    <div className="ss-seat-divider">BÀN</div>
                    <div className="ss-seat-half">
                        {Array.from({ length: rightCols }, (_, col) => (
                            <SeatBox key={col} seat={getSeatAt(col + halfCols, rowInCol)} />
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="ss-seat-map-wrap">
                <div className="ss-seat-map">
                    {renderRow(3)}
                    {renderRow(1)}
                    <div className="ss-aisle"><span>H À N H &nbsp; L A N G</span></div>
                    {renderRow(2)}
                    {renderRow(0)}
                </div>
            </div>
        );
    }

    // ── Toa nằm: N khoang × T tầng × 2 bên ─────────────────────────────────────

    function BerthBox({ seat }: { seat: SeatDTO }) {
        let cls = "ss-berth";
        if (seat.status === "booked")  cls += " ss-berth--booked";
        else if (isSeatSelected(seat)) cls += " ss-berth--selected";
        else                           cls += " ss-berth--available";

        // Hiển thị tên ngắn: "01-L1" → "1-L1"
        const shortNum = seat.seatNumber.replace(/^0+(\d)/, "$1");

        return (
            <div className={cls} onClick={() => handleSelectSeat(seat)}>
                {seat.status === "booked" ? (
                    <div className="ss-berth-booked-mark">✕</div>
                ) : (
                    <>
                        <div className="ss-berth-num">{shortNum}</div>
                        {seat.price > 0 && (
                            <div className="ss-berth-price">{formatPrice(seat.price)}</div>
                        )}
                    </>
                )}
            </div>
        );
    }

    function renderSleeperCarriage(seats: SeatDTO[], carriageType: string) {
        // Group by compartmentNo
        const byKhoang = new Map<number, SeatDTO[]>();
        for (const s of seats) {
            const k = s.compartmentNo ?? Number(s.seatNumber.split("-")[0]) ?? 0;
            if (!byKhoang.has(k)) byKhoang.set(k, []);
            byKhoang.get(k)!.push(s);
        }
        const khoangList = Array.from(byKhoang.entries()).sort((a, b) => a[0] - b[0]);

        // Tầng từ cao xuống thấp
        const tiers = carriageType === "sleeper_3"
            ? [{ pos: "upper", label: "Tầng 3" }, { pos: "middle", label: "Tầng 2" }, { pos: "lower", label: "Tầng 1" }]
            : [{ pos: "upper", label: "Tầng 2" }, { pos: "lower", label: "Tầng 1" }];

        return (
            <div className="ss-sleeper-wrap">
                <div className="ss-sleeper-aisle-label">H À N H &nbsp; L A N G</div>
                <div className="ss-sleeper-grid2">
                    {/* Tier labels - cột trái */}
                    <div className="ss-tier-labels">
                        {tiers.map(t => (
                            <div key={t.pos} className="ss-tier-label">{t.label}</div>
                        ))}
                    </div>
                    {/* Mỗi khoang = 1 cột */}
                    {khoangList.map(([kNo, kSeats]) => (
                        <div key={kNo} className="ss-compartment2">
                            {tiers.map(t => {
                                const tierSeats = kSeats.filter(s => s.berthPosition === t.pos);
                                return (
                                    <div key={t.pos} className="ss-berth-pair">
                                        {tierSeats.length > 0
                                            ? tierSeats.map(s => <BerthBox key={s.id} seat={s} />)
                                            : <div className="ss-berth ss-berth--empty" />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                {/* Số khoang ở đáy */}
                <div className="ss-compartment-footer">
                    <div className="ss-tier-label-spacer" />
                    <div className="ss-compartment-nums">
                        {khoangList.map(([kNo]) => (
                            <div key={kNo} className="ss-compartment-num">{kNo}</div>
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
            <div className="ss-loading">
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
                        <div className="ss-locomotive">
                            <img src="/images/train.jpg" alt="Đầu tàu"
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                        </div>
                        {carriages.map(c => {
                            const avail    = c.seats.filter(s => s.status === "available").length;
                            const isActive = selectedCarriage?.carriageNumber === c.carriageNumber;
                            const minP     = c.seats.filter(s => s.status === "available" && s.price > 0)
                                               .reduce((m, s) => Math.min(m, s.price), Infinity);
                            return (
                                <button key={c.carriageNumber}
                                    className={`ss-cbtn ${isActive ? "ss-cbtn--active" : ""} ${avail === 0 ? "ss-cbtn--full" : ""}`}
                                    onClick={() => avail > 0 && setSelectedCarriage(c)}>
                                    <span className="ss-cbtn-num">Toa {c.carriageNumber}</span>
                                    <span className="ss-cbtn-type">
                                        {CARRIAGE_LABEL[c.carriageType] ?? c.carriageType}
                                    </span>
                                    <span className="ss-cbtn-info">
                                        {avail > 0
                                            ? `${avail} chỗ${isFinite(minP) ? " • Từ " + formatPrice(minP) : ""}`
                                            : "Hết chỗ"}
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
                                    <span style={{ fontWeight: 400, fontSize: 14, color: "#6B7280", marginLeft: 8 }}>
                                        ({selectedCarriage.seats.filter(s => s.status === "available").length} chỗ trống
                                        / {selectedCarriage.seats.length} chỗ)
                                    </span>
                                </h3>
                                <p className="ss-map-hint">Giá hiển thị trên ghế là giá vé cho 1 người lớn.</p>
                            </div>
                            <div className="ss-legend">
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--available" />Chỗ trống
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--selected" />Đang chọn
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--booked" />Đã bán
                                </span>
                            </div>
                        </div>

                        <div className="ss-map-content">
                            {isSleeper(selectedCarriage.carriageType)
                                ? renderSleeperCarriage(selectedCarriage.seats, selectedCarriage.carriageType)
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
                                    <button className="ss-footer-tag-remove" onClick={() => handleSelectSeat(s)}>
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
                                `/trains/passenger-info?tripId=${tripId}&seatIds=${seatIds}` +
                                `&fromStationId=${fromStationId}&toStationId=${toStationId}` +
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
