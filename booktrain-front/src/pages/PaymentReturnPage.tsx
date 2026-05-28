import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import TicketPrint from "../components/TicketPrint";
import type { TicketTripInfo } from "../components/TicketPrint";
import "./Payment.css";

interface PassengerForm {
    seatId: number;
    seatNumber: string;
    carriageType: string;
    carriageNumber: number;
    ticketPrice: number;
    passengerName: string;
    idNumber: string;
    phoneNumber: string;
    dateOfBirth: string;
}

interface BookingData {
    tripId: number;
    fromStationId: number;
    toStationId: number;
    passengers: PassengerForm[];
    contact: { name: string; phone: string; email: string };
    totalPrice: number;
    confirmedAt: number;
}

interface VerifyResult {
    success: boolean;
    message: string;
    orderCode?: string;
    amount?: number;
    transactionNo?: string;
    responseCode?: string;
}

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat:      "Ngồi cứng",
    soft_seat:      "Ngồi mềm",
    hard_sleeper:   "Giường khoang 6",
    soft_sleeper:   "Giường khoang 4",
    vip_ac_sleeper: "Giường VIP",
};

const RESPONSE_CODE: Record<string, string> = {
    "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
    "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.",
    "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
    "11": "Đã hết hạn chờ thanh toán.",
    "12": "Thẻ/Tài khoản bị khóa.",
    "13": "Nhập sai mật khẩu OTP.",
    "24": "Khách hàng hủy giao dịch.",
    "51": "Tài khoản không đủ số dư.",
    "65": "Tài khoản vượt quá hạn mức giao dịch trong ngày.",
    "75": "Ngân hàng thanh toán đang bảo trì.",
    "79": "Nhập sai mật khẩu thanh toán quá số lần quy định.",
    "99": "Lỗi không xác định.",
};

function formatVNPayDate(raw: string): string {
    if (!raw || raw.length < 14) return raw;
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
}

const serviceFee = 15000;

export default function PaymentReturnPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading,     setLoading]     = useState(true);
    const [result,      setResult]      = useState<VerifyResult | null>(null);
    const [bookingData, setBookingData] = useState<BookingData | null>(null);
    const [tripInfo,    setTripInfo]    = useState<TicketTripInfo | null>(null);
    const [copied,      setCopied]      = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const bankCode = searchParams.get("vnp_BankCode") ?? "";
    const cardType = searchParams.get("vnp_CardType")  ?? "";
    const payDate  = searchParams.get("vnp_PayDate")   ?? "";

    useEffect(() => {
        // Save bookingData to state before sessionStorage gets cleared
        const raw = sessionStorage.getItem("bookingData");
        let parsed: BookingData | null = null;
        if (raw) {
            parsed = JSON.parse(raw);
            setBookingData(parsed);
        }

        const params = Object.fromEntries(searchParams.entries());

        axios.get("/api/payment/vnpay/verify", { params })
            .then(async res => {
                const data: VerifyResult = res.data;
                setResult(data);

                if (data.success) {
                    try {
                        await axios.post("/api/booking/confirm", {
                            orderCode:     data.orderCode,
                            transactionNo: data.transactionNo,
                            amount:        data.amount,
                            responseCode:  data.responseCode,
                        });
                    } catch (e) {
                        console.error("Confirm booking failed:", e);
                    }
                    sessionStorage.removeItem("bookingData");

                    // Fetch trip info for ticket printing
                    if (parsed?.tripId && parsed?.fromStationId && parsed?.toStationId) {
                        try {
                            const tripRes = await axios.get(`/api/trips/${parsed.tripId}`, {
                                params: {
                                    fromStationId: parsed.fromStationId,
                                    toStationId: parsed.toStationId,
                                },
                            });
                            const d = tripRes.data;
                            // Map TripResultDTO → TicketTripInfo
                            setTripInfo({
                                trainCode:       d.trainCode ?? "",
                                trainName:       d.trainName ?? "",
                                originName:      d.fromStationName ?? "",
                                destinationName: d.toStationName ?? "",
                                departureTime:   d.boardDate && d.boardTime
                                    ? `${d.boardDate.split('/').reverse().join('-')}T${d.boardTime}:00`
                                    : "",
                                arrivalTime:     d.alightDate && d.alightTime
                                    ? `${d.alightDate.split('/').reverse().join('-')}T${d.alightTime}:00`
                                    : "",
                            });
                        } catch {
                            // Non-critical: ticket still renders without trip info
                        }
                    }
                }
            })
            .catch(() => {
                setResult({ success: false, message: "Không thể xác nhận giao dịch. Vui lòng liên hệ hỗ trợ." });
            })
            .finally(() => setLoading(false));
    }, []);

    function copyOrderCode() {
        if (!result?.orderCode) return;
        navigator.clipboard.writeText(result.orderCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <>
            {/* ── Trang header ── */}
            <div className="pay-header no-print">
                <div className="pay-header-inner">
                    <div className="pay-logo">DatVeXe</div>
                </div>
            </div>

            {/* ── Main content (ẩn khi in) ── */}
            <div className="pay-page no-print">
                <div className="pay-body" style={{ justifyContent: "center" }}>
                    <div className="pay-left" style={{ maxWidth: 640 }}>

                        {/* Đang xác nhận */}
                        {loading && (
                            <div className="pay-trip-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                                <div style={{ marginBottom: 16 }}>
                                    <span className="material-icons-round" style={{ fontSize: 52, color: "#F59E0B" }}>hourglass_empty</span>
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                                    Đang xác nhận giao dịch...
                                </h3>
                                <p style={{ color: "#6b7280", fontSize: 14 }}>
                                    Vui lòng không đóng trang này
                                </p>
                            </div>
                        )}

                        {/* ── Thành công ── */}
                        {!loading && result?.success && (
                            <>
                                {/* Card 1: Trạng thái */}
                                <div className="pay-trip-card" style={{ textAlign: "center", padding: "36px 24px" }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <span className="material-icons-round" style={{ fontSize: 60, color: "#16a34a" }}>check_circle</span>
                                    </div>
                                    <div className="pay-trip-badge"
                                        style={{ background: "#dcfce7", color: "#16a34a", marginBottom: 12 }}>
                                        ĐÃ THANH TOÁN
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginBottom: 16 }}>
                                        Đặt vé thành công!
                                    </h2>

                                    <div style={{
                                        display: "inline-flex", alignItems: "center", gap: 10,
                                        background: "#EFF6FF", borderRadius: 8,
                                        padding: "10px 18px", marginBottom: 4,
                                    }}>
                                        <span style={{ color: "#6b7280", fontSize: 13 }}>Mã đơn hàng:</span>
                                        <strong style={{ color: "#2F6FED", fontSize: 18, letterSpacing: 1 }}>
                                            {result.orderCode}
                                        </strong>
                                        <button onClick={copyOrderCode} style={{
                                            border: "1px solid #2F6FED", borderRadius: 6,
                                            background: "white", color: "#2F6FED",
                                            fontSize: 12, padding: "3px 10px", cursor: "pointer",
                                            display: "inline-flex", alignItems: "center", gap: 4,
                                        }}>
                                            {copied ? (
                                                <>
                                                    <span className="material-icons-round" style={{ fontSize: 13 }}>check</span>
                                                    Đã copy
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons-round" style={{ fontSize: 13 }}>content_copy</span>
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Card 2: Thông tin chuyến */}
                                {bookingData && (
                                    <div className="pay-trip-card">
                                        <div className="pay-trip-badge">THÔNG TIN CHUYẾN</div>
                                        <div className="pay-trip-meta" style={{ marginTop: 12, gap: 10 }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <span className="material-icons-round" style={{ fontSize: 16 }}>group</span>
                                                {bookingData.passengers.length} Hành khách
                                            </span>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <span className="material-icons-round" style={{ fontSize: 16 }}>confirmation_number</span>
                                                {bookingData.passengers.map(p => `Ghế ${p.seatNumber}`).join(", ")}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Card 3: Hành khách */}
                                {bookingData && bookingData.passengers.length > 0 && (
                                    <div className="pay-summary-card">
                                        <div className="pay-summary-header">
                                            <h3>Thông tin hành khách</h3>
                                        </div>
                                        {bookingData.passengers.map((p, i) => (
                                            <div key={i} style={{
                                                padding: "12px 0",
                                                borderBottom: i < bookingData.passengers.length - 1
                                                    ? "1px solid #F3F4F6" : "none",
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                    {i + 1}. {p.passengerName}
                                                </div>
                                                <div style={{ fontSize: 13, color: "#6b7280", display: "flex", gap: 16, flexWrap: "wrap" }}>
                                                    <span>Toa {p.carriageNumber} - Ghế {p.seatNumber} ({CARRIAGE_LABEL[p.carriageType] ?? p.carriageType})</span>
                                                    <span style={{ color: "#2F6FED", fontWeight: 600 }}>
                                                        {p.ticketPrice.toLocaleString("vi-VN")}đ
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Card 4: Thanh toán */}
                                <div className="pay-summary-card">
                                    <div className="pay-summary-header"><h3>Thông tin thanh toán</h3></div>

                                    {bookingData && (
                                        <>
                                            <div className="pay-summary-item">
                                                <span>Tổng tiền vé</span>
                                                <span className="pay-summary-price">
                                                    {bookingData.totalPrice.toLocaleString("vi-VN")}đ
                                                </span>
                                            </div>
                                            <div className="pay-summary-item">
                                                <span>Phí dịch vụ</span>
                                                <span className="pay-summary-price">
                                                    {serviceFee.toLocaleString("vi-VN")}đ
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div className="pay-summary-total">
                                        <span>Tổng thanh toán</span>
                                        <span className="pay-summary-total-price">
                                            {result.amount?.toLocaleString("vi-VN")}đ
                                        </span>
                                    </div>

                                    <div className="pay-summary-item" style={{ marginTop: 8 }}>
                                        <span>Phương thức</span>
                                        <span>VNPay{bankCode ? ` - ${bankCode}` : ""}{cardType ? ` (${cardType})` : ""}</span>
                                    </div>
                                    <div className="pay-summary-item">
                                        <span>Mã GD VNPay</span>
                                        <span style={{ fontSize: 13, color: "#6b7280" }}>{result.transactionNo}</span>
                                    </div>
                                    {payDate && (
                                        <div className="pay-summary-item">
                                            <span>Thời gian</span>
                                            <span style={{ fontSize: 13 }}>{formatVNPayDate(payDate)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Nút hành động */}
                                <div className="pay-confirm-actions" style={{ marginTop: 0, flexWrap: "wrap", gap: 10 }}>
                                    <button
                                        className="pay-confirm-btn pay-confirm-btn--ok"
                                        onClick={() => setShowPreview(true)}
                                        style={{ background: "#2F6FED" }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>visibility</span>
                                        Xem trước vé
                                    </button>
                                    <button
                                        className="pay-confirm-btn pay-confirm-btn--ok"
                                        onClick={() => window.print()}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>print</span>
                                        In vé / Boarding Pass
                                    </button>
                                    <button className="pay-confirm-btn pay-confirm-btn--back"
                                        onClick={() => navigate("/my-orders")}>
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>list_alt</span>
                                        Lịch sử đặt vé
                                    </button>
                                    <button className="pay-confirm-btn pay-confirm-btn--back"
                                        onClick={() => navigate("/")}>
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>home</span>
                                        Về trang chủ
                                    </button>
                                </div>

                                <p className="pay-policy">
                                    Cảm ơn bạn đã sử dụng dịch vụ của <strong>DatVeXe</strong> 🎉
                                </p>
                            </>
                        )}

                        {/* ── Thất bại ── */}
                        {!loading && result && !result.success && (
                            <>
                                <div className="pay-trip-card" style={{ textAlign: "center", padding: "36px 24px" }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <span className="material-icons-round" style={{ fontSize: 60, color: "#dc2626" }}>cancel</span>
                                    </div>
                                    <div className="pay-trip-badge"
                                        style={{ background: "#fee2e2", color: "#dc2626", marginBottom: 16 }}>
                                        THANH TOÁN THẤT BẠI
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                                        Giao dịch không thành công
                                    </h2>
                                    <p style={{ color: "#6b7280", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
                                        {result.responseCode
                                            ? (RESPONSE_CODE[result.responseCode] ?? result.message)
                                            : result.message}
                                    </p>
                                </div>

                                <div className="pay-methods-card">
                                    <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, marginBottom: 4 }}>
                                            <span className="material-icons-round" style={{ fontSize: 16, color: "#F59E0B" }}>lightbulb</span>
                                            Một số lý do thường gặp:
                                        </span><br />
                                        • Thẻ không đủ số dư<br />
                                        • Giao dịch bị huỷ bởi người dùng<br />
                                        • Hết thời gian thanh toán (15 phút)<br />
                                        • Thông tin thẻ không chính xác
                                    </p>
                                </div>

                                <div className="pay-confirm-actions" style={{ marginTop: 0 }}>
                                    <button className="pay-confirm-btn pay-confirm-btn--back"
                                        onClick={() => navigate("/")}>
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>home</span>
                                        Về trang chủ
                                    </button>
                                    <button className="pay-confirm-btn pay-confirm-btn--ok"
                                        onClick={() => navigate(-1)}>
                                        <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>refresh</span>
                                        Thử lại
                                    </button>
                                </div>

                                <p className="pay-policy">
                                    Cần hỗ trợ? Liên hệ <a href="#">hotline 1900 6067</a>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Vé tàu — ẩn trên màn hình, hiện khi print ── */}
            {result?.success && bookingData && (
                <TicketPrint
                    orderCode={result.orderCode ?? ""}
                    passengers={bookingData.passengers.map(p => ({
                        passengerName:  p.passengerName,
                        idNumber:       p.idNumber,
                        seatNumber:     p.seatNumber,
                        carriageNumber: p.carriageNumber,
                        carriageType:   p.carriageType,
                        ticketPrice:    p.ticketPrice,
                    }))}
                    tripInfo={tripInfo}
                    totalAmount={result.amount ?? 0}
                />
            )}

            {/* ── Preview modal ── */}
            {showPreview && result?.success && bookingData && (
                <div className="ticket-preview-modal" onClick={() => setShowPreview(false)}>
                    <div className="ticket-preview-content" onClick={e => e.stopPropagation()}>
                        <div className="ticket-preview-header">
                            <span className="ticket-preview-title">Xem trước vé / Preview</span>
                            <div className="ticket-preview-actions">
                                <button
                                    className="ticket-preview-btn ticket-preview-btn--close"
                                    onClick={() => setShowPreview(false)}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                    Đóng
                                </button>
                                <button
                                    className="ticket-preview-btn ticket-preview-btn--print"
                                    onClick={() => { setShowPreview(false); setTimeout(() => window.print(), 100); }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>print</span>
                                    In vé
                                </button>
                            </div>
                        </div>
                        <TicketPrint
                            orderCode={result.orderCode ?? ""}
                            passengers={bookingData.passengers.map(p => ({
                                passengerName:  p.passengerName,
                                idNumber:       p.idNumber,
                                seatNumber:     p.seatNumber,
                                carriageNumber: p.carriageNumber,
                                carriageType:   p.carriageType,
                                ticketPrice:    p.ticketPrice,
                            }))}
                            tripInfo={tripInfo}
                            totalAmount={result.amount ?? 0}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
