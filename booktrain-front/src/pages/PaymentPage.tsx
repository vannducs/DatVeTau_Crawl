import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { tripApi } from "../api/trip";
import type { TripResult } from "../types/trip";
import "./payment.css";

interface PassengerForm {
    tripSeatId: number;   // id của TripSeat
    seatNumber: string;
    carriageType: string;
    carriageOrder: number;
    basePrice: number;
    ticketPrice: number;
    passengerType: string;
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

const CARRIAGE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

const TYPE_LABEL: Record<string, string> = {
    adult:   "Người lớn",
    child:   "Trẻ em",
    elderly: "Người cao tuổi",
    student: "Sinh viên",
    union:   "Đoàn viên Công đoàn",
};

const TOTAL_SECONDS = 15 * 60;

export default function PaymentPage() {
    const navigate = useNavigate();
    const [bookingData, setBookingData] = useState<BookingData | null>(null);
    const [tripInfo, setTripInfo] = useState<TripResult | null>(null);
    const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const raw = sessionStorage.getItem("bookingData");
        if (!raw) { navigate("/"); return; }

        const parsed: BookingData = JSON.parse(raw);
        setBookingData(parsed);

        tripApi.getById(parsed.tripId, parsed.fromStationId, parsed.toStationId).then((res: { data: TripResult }) => {
            setTripInfo(res.data);
        });

        const elapsed = Math.floor((Date.now() - parsed.confirmedAt) / 1000);
        const remaining = TOTAL_SECONDS - elapsed;
        setTimeLeft(remaining > 0 ? remaining : 0);
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            sessionStorage.removeItem("bookingData");
            navigate("/trains/search");
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    async function handlePayment() {
        const token = localStorage.getItem("token");
        console.log("Sending token:", token);
        if (!token) {
            setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            return;
        }
        setError("");
        setPaying(true);
        try {
            // Bước 1: Tạo order trong DB
            const orderRes = await axios.post(
                "/api/booking/create",
                {
                    tripId:        bookingData!.tripId,
                    fromStationId: bookingData!.fromStationId,
                    toStationId:   bookingData!.toStationId,
                    passengers:       bookingData!.passengers,
                    contact:          bookingData!.contact,
                    totalPrice:       bookingData!.totalPrice,
                    serviceFee:       15000,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            const orderCode = orderRes.data.orderCode;

            // Bước 2: Tạo URL VNPay sandbox
            const paymentRes = await axios.post(
                "/api/payment/vnpay/create",
                {
                    amount:    totalWithFee,
                    orderCode: orderCode,
                    orderInfo: `Thanh toan ve tau ${orderCode}`,
                }
            );

            // Bước 3: Redirect sang VNPay sandbox
            window.location.href = paymentRes.data.paymentUrl;

        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
            if (axiosErr.response?.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }
            setError(
                axiosErr.response?.data?.message ||
                "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại."
            );
            setPaying(false);
        }
    }

    if (!bookingData) return null;

    const serviceFee = 15000;
    const totalWithFee = bookingData.totalPrice + serviceFee;
    const isUrgent = timeLeft <= 60;

    return (
        <>
            {/* Header với countdown */}
            <div className="pay-header">
                <div className="pay-header-inner">
                    <div className="pay-logo">DatVeXe</div>
                    <div className="pay-countdown">
                        <span>Thời gian thanh toán còn lại</span>
                        <span className={`pay-timer ${isUrgent ? "pay-timer--urgent" : ""}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pay-page">
                <div className="pay-body">

                    {/* Cột trái */}
                    <div className="pay-left">

                        {/* Thông tin chuyến */}
                        <div className="pay-trip-card">
                            <div className="pay-trip-badge">MỘT CHIỀU</div>

                            {tripInfo && (
                                <div className="pay-trip-route" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                    <span className="pay-trip-station">{tripInfo.fromStationName}</span>

                                    <div className="pay-trip-middle" style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center" }}>
                                        <span className="pay-trip-time">{tripInfo.boardTime}</span>
                                        <div className="pay-trip-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 12px" }}>
                                            <span className="pay-trip-duration">{tripInfo.duration}</span>
                                            {tripInfo.nextDay && (
                                                <span className="pay-next-day">+1 ngày</span>
                                            )}
                                        </div>
                                        <span className="pay-trip-time">{tripInfo.alightTime}</span>
                                    </div>

                                    <span className="pay-trip-station">{tripInfo.toStationName}</span>
                                </div>
                            )}

                            {tripInfo && (
                                <div className="pay-trip-train">
                                    <span className="material-icons-round" style={{ fontSize: 15, color: "#2F6FED", verticalAlign: "middle", marginRight: 4 }}>train</span>
                                    {tripInfo.trainCode} • {tripInfo.trainName}
                                </div>
                            )}

                            <div className="pay-trip-meta">
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>group</span>
                                    {bookingData.passengers.length} hành khách
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>confirmation_number</span>
                                    {bookingData.passengers.map(p => `Ghế ${p.seatNumber}`).join(", ")}
                                </span>
                            </div>
                        </div>

                        {/* VNPay info card */}
                        <div className="pay-methods-card">
                            <h3 className="pay-section-title">Phương thức thanh toán</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
                                <img
                                    src="/images/payment/vnpay.png"
                                    alt="VNPay"
                                    style={{ height: 44, objectFit: "contain" }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                                        Cổng thanh toán VNPay
                                    </div>
                                    <div style={{ fontSize: 13, color: "#6B7280" }}>
                                        Hỗ trợ thẻ ATM, Visa/MasterCard, Internet Banking
                                    </div>
                                </div>
                            </div>
                            {error && <div className="pay-error">{error}</div>}
                        </div>

                        {/* Nút thanh toán */}
                        <button
                            className="pay-submit-btn"
                            onClick={handlePayment}
                            disabled={paying}
                            style={{ opacity: paying ? 0.7 : 1, cursor: paying ? "not-allowed" : "pointer" }}
                        >
                            {paying ? (
                            <>
                                <span className="material-icons-round" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>hourglass_empty</span>
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <span className="material-icons-round" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>lock</span>
                                Thanh toán qua VNPay
                            </>
                        )}
                        </button>
                        <p className="pay-policy">
                            Bằng việc thanh toán, bạn đồng ý với{" "}
                            <a href="#">Chính sách bảo mật thanh toán</a> của DatVeXe
                        </p>
                    </div>

                    {/* Cột phải */}
                    <div className="pay-right">

                        {/* Chi tiết giá */}
                        <div className="pay-summary-card">
                            <div className="pay-summary-header">
                                <h3>Chi Tiết Giá</h3>
                            </div>

                            {bookingData.passengers.map((p, i) => {
                                const label = TYPE_LABEL[p.passengerType] ?? "Hành khách";
                                const sameTypeBefore = bookingData.passengers.slice(0, i).filter(x => x.passengerType === p.passengerType).length;
                                const displayIdx = sameTypeBefore + 1;
                                const hasDiscount = p.basePrice && p.basePrice > p.ticketPrice;
                                return (
                                    <div key={i} className="pay-summary-item">
                                        <div className="pay-summary-item-label">
                                            <span>{label} {displayIdx}</span>
                                            <span className="pay-summary-seat">
                                                Toa {p.carriageOrder} - Ghế {p.seatNumber}&nbsp;
                                                ({CARRIAGE_LABEL[p.carriageType] ?? p.carriageType})
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                            {hasDiscount && (
                                                <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through", whiteSpace: "nowrap" }}>
                                                    {p.basePrice!.toLocaleString("vi-VN")}đ
                                                </span>
                                            )}
                                            <span className="pay-summary-price">
                                                {p.ticketPrice.toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pay-summary-item">
                                <span>Phí dịch vụ</span>
                                <span className="pay-summary-price">
                                    {serviceFee.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                            <p className="pay-summary-note">
                                *Phí này sẽ không áp dụng hoàn trả
                            </p>

                            <div className="pay-summary-total">
                                <span>Tổng cộng cho {bookingData.passengers.length} người:</span>
                                <span className="pay-summary-total-price">
                                    {totalWithFee.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        </div>

                        {/* Mã giảm giá */}
                        <div className="pay-voucher-card">
                            <div className="pay-voucher-header">
                                <span>Mã giảm giá</span>
                                <button className="pay-voucher-link">Chọn hoặc nhập mã</button>
                            </div>
                            <div className="pay-voucher-placeholder">
                                🎫 Chức năng mã giảm giá sẽ sớm ra mắt!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
