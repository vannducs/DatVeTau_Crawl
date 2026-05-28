import { QRCodeSVG } from "qrcode.react";
import "./TicketPrint.css";

export interface TicketPassenger {
    passengerName: string;
    idNumber: string;
    seatNumber: string;
    carriageNumber: number;
    carriageType: string;
    ticketPrice: number;
}

export interface TicketTripInfo {
    trainCode: string;
    trainName: string;
    originName: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
}

export interface TicketPrintProps {
    orderCode: string;
    passengers: TicketPassenger[];
    tripInfo: TicketTripInfo | null;
    totalAmount: number;
}

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat:      "Ghế ngồi cứng / Hard Seat",
    soft_seat:      "Ghế ngồi mềm / Soft Seat",
    hard_sleeper:   "Giường nằm cứng / Hard Sleeper",
    soft_sleeper:   "Giường nằm mềm / Soft Sleeper",
    vip_ac_sleeper: "Giường VIP điều hòa / VIP AC Sleeper",
};

function getCarriageLabel(type: string): string {
    return CARRIAGE_LABEL[type.toLowerCase()] ?? type;
}

function formatDate(t: string | undefined): string {
    if (!t) return "—";
    if (t.includes("T")) {
        const d = new Date(t);
        const dd = d.getDate().toString().padStart(2, "0");
        const mo = (d.getMonth() + 1).toString().padStart(2, "0");
        return `${dd}/${mo}/${d.getFullYear()}`;
    }
    return t.split(" ")[1] ?? "—";
}

function formatTime(t: string | undefined): string {
    if (!t) return "—";
    if (t.includes("T")) {
        const d = new Date(t);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    return t.split(" ")[0] ?? t;
}

interface SingleTicketProps {
    orderCode: string;
    passenger: TicketPassenger;
    tripInfo: TicketTripInfo | null;
    isLast: boolean;
}

function SingleTicket({ orderCode, passenger, tripInfo, isLast }: SingleTicketProps) {
    const ticketCode = `${orderCode}-${passenger.seatNumber}`;
    const qrValue    = `${orderCode}|${passenger.passengerName}|${passenger.seatNumber}`;

    return (
        <div className={`ticket-single${isLast ? "" : " ticket-page-break"}`}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="ticket-header">
                <div className="ticket-logo">
                    <div className="ticket-logo-circle">VNR</div>
                    <div className="ticket-logo-text">ĐƯỜNG SẮT<br />VIỆT NAM</div>
                </div>
                <div className="ticket-title">
                    <div className="ticket-title-main">THẺ LÊN TÀU HỎA</div>
                    <div className="ticket-title-sub">BOARDING PASS</div>
                </div>
            </div>

            {/* ── Intro ──────────────────────────────────────────── */}
            <div className="ticket-intro">
                <p>Kính gửi quý khách hàng,</p>
                <p>
                    Xin trân trọng cảm ơn quý khách đã lựa chọn sử dụng dịch vụ vận tải
                    hành khách của <strong>DatVeTau</strong>. Quý khách đã thực hiện mua vé thành công
                    với thông tin như sau:
                </p>
            </div>

            {/* ── Body: 2 columns ────────────────────────────────── */}
            <div className="ticket-body">

                {/* Left: trip + passenger */}
                <div className="ticket-left">

                    <div className="ticket-section-title">Thông tin hành trình</div>

                    <div className="ticket-row">
                        <span className="ticket-label">Ga đi - Ga đến / From - To:</span>
                        <span className="ticket-value">
                            {tripInfo ? `${tripInfo.originName} – ${tripInfo.destinationName}` : "—"}
                        </span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Tàu / Train:</span>
                        <span className="ticket-value">
                            {tripInfo
                                ? `${tripInfo.trainCode}${tripInfo.trainName ? ` • ${tripInfo.trainName}` : ""}`
                                : "—"}
                        </span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Ngày đi / Date:</span>
                        <span className="ticket-value">{formatDate(tripInfo?.departureTime)}</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Giờ đi / Time:</span>
                        <span className="ticket-value">{formatTime(tripInfo?.departureTime)}</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Toa / Coach:</span>
                        <span className="ticket-value">{passenger.carriageNumber}</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Chỗ / Seat:</span>
                        <span className="ticket-value">
                            {passenger.seatNumber}&nbsp;({getCarriageLabel(passenger.carriageType)})
                        </span>
                    </div>

                    <hr className="ticket-divider" />

                    <div className="ticket-section-title">Thông tin hành khách</div>

                    <div className="ticket-row">
                        <span className="ticket-label">Họ tên / Full Name:</span>
                        <span className="ticket-value">{passenger.passengerName}</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Giấy tờ / ID:</span>
                        <span className="ticket-value">{passenger.idNumber}</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Loại vé / Ticket:</span>
                        <span className="ticket-value">Toàn vé</span>
                    </div>
                    <div className="ticket-row">
                        <span className="ticket-label">Giá vé / Price:</span>
                        <span className="ticket-value ticket-value--price">
                            {passenger.ticketPrice.toLocaleString("vi-VN")} VNĐ
                        </span>
                    </div>

                    <div className="ticket-note">
                        (Giá vé trên đã bao gồm phí dịch vụ và thuế GTGT)
                    </div>
                </div>

                {/* Right: QR + codes */}
                <div className="ticket-right">
                    <div className="ticket-qr">
                        <QRCodeSVG
                            value={qrValue}
                            size={118}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                        />
                    </div>

                    <div className="ticket-codes">
                        <div className="ticket-code-row">
                            <span className="ticket-code-label">Mã đặt chỗ:</span>
                            <span className="ticket-code-value">{orderCode}</span>
                        </div>
                        <div className="ticket-code-row">
                            <span className="ticket-code-label">Mã vé:</span>
                            <span className="ticket-code-value">{ticketCode}</span>
                        </div>
                        <div className="ticket-brand">DatVeTau</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TicketPrint({ orderCode, passengers, tripInfo, totalAmount: _ }: TicketPrintProps) {
    return (
        <div className="ticket-print-wrapper">
            <div className="ticket-screen-label ticket-no-print">
                ── Vé tàu / Boarding Pass ──
            </div>
            {passengers.map((p, i) => (
                <SingleTicket
                    key={i}
                    orderCode={orderCode}
                    passenger={p}
                    tripInfo={tripInfo}
                    isLast={i === passengers.length - 1}
                />
            ))}
        </div>
    );
}
