import { useEffect, useRef, useState } from "react";
import api from "../api/auth";
import axios from "axios";
import Header from "../components/common/Header";
import HomeFooter from "../components/home/HomeFooter";
import TicketPrint from "../components/TicketPrint";
import type { TicketPassenger, TicketTripInfo } from "../components/TicketPrint";
import "./ticketlookup.css";

type Method = "code" | "image" | "camera";

interface LookupPassenger {
    passengerName: string;
    idNumber: string;
    seatNumber: string;
    carriageNumber: number;
    carriageType: string;
    ticketPrice: number;
    status: string;
}

interface LookupResult {
    orderCode: string;
    status: string;
    trainCode: string;
    trainName: string;
    originName: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
    passengers: LookupPassenger[];
    totalAmount: number;
    serviceFee: number;
    paymentMethod: string | null;
    transactionCode: string | null;
    paidAt: string | null;
}

function formatDateTime(dt: string | undefined | null) {
    if (!dt) return "—";
    const d = new Date(dt);
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${min} — ${dd}/${mm}/${d.getFullYear()}`;
}

function formatMoney(n: number | null | undefined) {
    if (n == null) return "—";
    return Number(n).toLocaleString("vi-VN") + " đ";
}

function statusLabel(s: string) {
    if (s === "paid" || s === "completed") return { label: "Đã thanh toán", cls: "tl-status-paid" };
    if (s === "cancelled") return { label: "Đã hủy", cls: "tl-status-cancel" };
    return { label: "Chờ thanh toán", cls: "tl-status-pending" };
}

function paxStatusLabel(s: string) {
    if (s === "cancelled") return { label: "Đã hủy", cls: "cancelled" };
    if (s === "used") return { label: "Đã sử dụng", cls: "used" };
    return { label: "Xác nhận", cls: "confirmed" };
}

export default function TicketLookupPage() {
    const [method, setMethod] = useState<Method>("code");

    // Manual code
    const [code, setCode] = useState("");

    // Image QR
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Camera
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [camScanned, setCamScanned] = useState<string | null>(null);
    const stopScanRef = useRef<(() => void) | null>(null);

    // Shared
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<LookupResult | null>(null);

    // Ticket preview modal
    const [showPreview, setShowPreview] = useState(false);

    // Camera lifecycle
    useEffect(() => {
        if (!showCamera) {
            stopScanRef.current?.();
            stopScanRef.current = null;
            return;
        }

        let stopped = false;

        (async () => {
            try {
                const { BrowserQRCodeReader } = await import("@zxing/browser");
                const reader = new BrowserQRCodeReader();

                const controls = await reader.decodeFromVideoDevice(
                    undefined,
                    videoRef.current!,
                    (scanResult) => {
                        if (stopped) return;
                        if (scanResult) {
                            const text = scanResult.getText();
                            const orderCode = text.includes("|") ? text.split("|")[0] : text;
                            const clean = orderCode.toUpperCase().trim();
                            setCamScanned(clean);
                            setShowCamera(false);
                            doLookup(clean);
                        }
                    }
                );

                stopScanRef.current = () => {
                    stopped = true;
                    controls.stop();
                };
            } catch {
                setError("Không thể mở camera. Hãy cấp quyền truy cập camera.");
                setShowCamera(false);
            }
        })();

        return () => {
            stopped = true;
            stopScanRef.current?.();
            stopScanRef.current = null;
        };
    }, [showCamera]);

    async function doLookup(orderCode: string) {
        const clean = orderCode.toUpperCase().trim();
        if (!clean) { setError("Vui lòng nhập mã đặt vé"); return; }
        setLoading(true);
        setError(null);
        setResult(null);
        setShowPreview(false);
        try {
            const res = await api.get(`/tickets/${clean}`);
            setResult(res.data);
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                setError(`Không tìm thấy vé với mã "${clean}"`);
            } else {
                setError("Lỗi kết nối. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleImageScan() {
        if (!imageFile) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const jsQR = (await import("jsqr")).default;
            const img = new Image();
            img.src = URL.createObjectURL(imageFile);
            await new Promise(res => (img.onload = res));
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height);
            const qr = jsQR(data.data, data.width, data.height);
            if (!qr) {
                setError("Không đọc được mã QR từ ảnh. Thử ảnh rõ hơn.");
                setLoading(false);
                return;
            }
            const text = qr.data;
            const orderCode = text.includes("|") ? text.split("|")[0] : text;
            await doLookup(orderCode);
        } catch {
            setError("Lỗi xử lý ảnh. Vui lòng thử lại.");
            setLoading(false);
        }
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setResult(null);
        setError(null);
        setCamScanned(null);
    }

    function handleReset() {
        setResult(null);
        setError(null);
        setCode("");
        setImageFile(null);
        setImagePreview(null);
        setCamScanned(null);
        setShowCamera(false);
        setShowPreview(false);
    }

    function handleMethodChange(m: Method) {
        setMethod(m);
        setError(null);
        setShowCamera(false);
        setCamScanned(null);
    }

    const statusInfo = result ? statusLabel(result.status) : null;
    const isPaid = result?.status === "paid" || result?.status === "completed";

    const ticketPassengers: TicketPassenger[] = result?.passengers.map(p => ({
        passengerName: p.passengerName,
        idNumber: p.idNumber,
        seatNumber: p.seatNumber,
        carriageNumber: p.carriageNumber,
        carriageType: p.carriageType,
        ticketPrice: Number(p.ticketPrice),
    })) ?? [];

    const tripInfo: TicketTripInfo | null = result ? {
        trainCode: result.trainCode,
        trainName: result.trainName,
        originName: result.originName,
        destinationName: result.destinationName,
        departureTime: result.departureTime,
        arrivalTime: result.arrivalTime,
    } : null;

    return (
        <>
            {/* ── TicketPrint: outside .tl-page so the page can be hidden on print ── */}
            {result && isPaid && (
                <TicketPrint
                    orderCode={result.orderCode}
                    passengers={ticketPassengers}
                    tripInfo={tripInfo}
                    totalAmount={Number(result.totalAmount)}
                />
            )}

            <div className="tl-page">
                <Header />

                <div className="tl-main">

                {/* Hero */}
                <div className="tl-hero">
                    <div className="tl-hero-title">Tra cứu mã vé</div>
                    <p className="tl-hero-sub">Nhập mã đặt vé hoặc quét mã QR trên vé của bạn</p>
                </div>

                {/* Input card */}
                <div className="tl-card-wrap">
                    <div className="tl-card">
                        {/* Method tabs */}
                        <div className="tl-methods">
                            {([
                                { key: "code",   icon: "keyboard",        label: "Nhập mã vé" },
                                { key: "image",  icon: "image_search",    label: "Tải ảnh QR" },
                                { key: "camera", icon: "qr_code_scanner", label: "Quét camera" },
                            ] as { key: Method; icon: string; label: string }[]).map(m => (
                                <button
                                    key={m.key}
                                    className={`tl-method-btn ${method === m.key ? "active" : ""}`}
                                    onClick={() => handleMethodChange(m.key)}
                                >
                                    <span className="material-icons-round">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Method: code */}
                        {method === "code" && (
                            <div className="tl-input-row">
                                <input
                                    className="tl-input"
                                    placeholder="Ví dụ: DVT-20250523-0001"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && doLookup(code)}
                                />
                                <button
                                    className="tl-btn-search"
                                    onClick={() => doLookup(code)}
                                    disabled={loading}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 18 }}>search</span>
                                    Tra cứu
                                </button>
                            </div>
                        )}

                        {/* Method: image */}
                        {method === "image" && (
                            <>
                                <div className="tl-upload-area">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <span className="material-icons-round tl-upload-icon">upload_file</span>
                                    <div className="tl-upload-label">
                                        <strong>Chọn ảnh</strong> hoặc kéo thả vào đây
                                        <br />
                                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Hỗ trợ JPG, PNG, WEBP</span>
                                    </div>
                                </div>
                                {imageFile && (
                                    <div className="tl-upload-preview">
                                        {imagePreview && <img src={imagePreview} alt="QR preview" />}
                                        <span style={{ flex: 1, fontSize: 13 }}>{imageFile.name}</span>
                                        <button
                                            className="tl-btn-search"
                                            onClick={handleImageScan}
                                            disabled={loading}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: 18 }}>qr_code</span>
                                            Đọc QR
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Method: camera */}
                        {method === "camera" && (
                            <>
                                {!showCamera ? (
                                    <div style={{ textAlign: "center" }}>
                                        {camScanned && (
                                            <div className="tl-alert tl-alert-scan" style={{ marginBottom: 12, justifyContent: "center" }}>
                                                <span className="material-icons-round" style={{ fontSize: 18 }}>check_circle</span>
                                                Đã quét: <strong>{camScanned}</strong>
                                            </div>
                                        )}
                                        <button
                                            className="tl-btn-search"
                                            style={{ margin: "0 auto" }}
                                            onClick={() => { setShowCamera(true); setCamScanned(null); }}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: 18 }}>photo_camera</span>
                                            Mở camera
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="tl-camera-wrap">
                                            <video ref={videoRef} autoPlay muted playsInline />
                                            <div className="tl-camera-overlay">
                                                <div className="tl-camera-frame" />
                                            </div>
                                        </div>
                                        <p className="tl-camera-hint">Hướng camera vào mã QR trên vé</p>
                                        <button
                                            className="tl-btn-stop-cam"
                                            onClick={() => setShowCamera(false)}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: 16 }}>stop_circle</span>
                                            Dừng camera
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {/* Alerts */}
                        {loading && (
                            <div className="tl-alert tl-alert-loading">
                                <span className="material-icons-round" style={{ fontSize: 18 }}>hourglass_top</span>
                                Đang tra cứu...
                            </div>
                        )}
                        {error && (
                            <div className="tl-alert tl-alert-error">
                                <span className="material-icons-round" style={{ fontSize: 18 }}>error_outline</span>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Result */}
                {result && statusInfo && (
                    <div className="tl-result-wrap">
                        <div className="tl-result-card">
                            {/* Header */}
                            <div className="tl-result-header">
                                <div>
                                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Mã đặt vé</div>
                                    <div className="tl-result-code">{result.orderCode}</div>
                                </div>
                                <span className={`tl-result-status ${statusInfo.cls}`}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>
                                        {isPaid ? "check_circle" : result.status === "cancelled" ? "cancel" : "schedule"}
                                    </span>
                                    {statusInfo.label}
                                </span>
                            </div>

                            {/* Body */}
                            <div className="tl-result-body">
                                {/* Route */}
                                <div className="tl-route-row">
                                    <span className="material-icons-round" style={{ color: "#2F6FED", fontSize: 20 }}>train</span>
                                    <strong>{result.originName}</strong>
                                    <span className="material-icons-round tl-route-arrow">arrow_forward</span>
                                    <strong>{result.destinationName}</strong>
                                </div>

                                {/* Trip info grid */}
                                <div className="tl-info-grid">
                                    <div className="tl-info-item">
                                        <span className="tl-info-label">Tàu</span>
                                        <span className="tl-info-value">
                                            {result.trainCode}{result.trainName ? ` • ${result.trainName}` : ""}
                                        </span>
                                    </div>
                                    <div className="tl-info-item">
                                        <span className="tl-info-label">Khởi hành</span>
                                        <span className="tl-info-value">{formatDateTime(result.departureTime)}</span>
                                    </div>
                                    <div className="tl-info-item">
                                        <span className="tl-info-label">Đến nơi</span>
                                        <span className="tl-info-value">{formatDateTime(result.arrivalTime)}</span>
                                    </div>
                                    <div className="tl-info-item">
                                        <span className="tl-info-label">Thanh toán</span>
                                        <span className="tl-info-value">
                                            {result.paymentMethod ?? "—"}
                                        </span>
                                    </div>
                                    {result.transactionCode && (
                                        <div className="tl-info-item">
                                            <span className="tl-info-label">Mã giao dịch</span>
                                            <span className="tl-info-value" style={{ wordBreak: "break-all", fontSize: 12 }}>{result.transactionCode}</span>
                                        </div>
                                    )}
                                    {result.paidAt && (
                                        <div className="tl-info-item">
                                            <span className="tl-info-label">Thời gian thanh toán</span>
                                            <span className="tl-info-value">{formatDateTime(result.paidAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <hr className="tl-divider" />

                                {/* Passengers */}
                                <div className="tl-pax-title">
                                    <span className="material-icons-round" style={{ fontSize: 18, color: "#2F6FED" }}>group</span>
                                    Hành khách ({result.passengers.length} người)
                                </div>
                                <div className="tl-pax-list">
                                    {result.passengers.map((p, i) => {
                                        const ps = paxStatusLabel(p.status);
                                        return (
                                            <div key={i} className="tl-pax-item">
                                                <div>
                                                    <div className="tl-pax-name">{p.passengerName}</div>
                                                    <div className="tl-pax-id">CMND/CCCD: {p.idNumber}</div>
                                                </div>
                                                <div className="tl-pax-seat">
                                                    <div className="tl-seat-badge">Toa {p.carriageNumber} • {p.seatNumber}</div>
                                                    <div className="tl-pax-price">{formatMoney(p.ticketPrice)}</div>
                                                </div>
                                                <span className={`tl-pax-status-badge ${ps.cls}`}>{ps.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Total */}
                                <div className="tl-total-row">
                                    <span className="tl-total-label">Tổng tiền</span>
                                    <span className="tl-total-amount">{formatMoney(result.totalAmount)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="tl-actions">
                                {isPaid && (
                                    <button className="tl-btn-print" onClick={() => setShowPreview(true)}>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>visibility</span>
                                        Xem vé
                                    </button>
                                )}
                                {isPaid && (
                                    <button className="tl-btn-print" onClick={() => window.print()}>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>print</span>
                                        In vé
                                    </button>
                                )}
                                <button className="tl-btn-new" onClick={handleReset}>
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>search</span>
                                    Tra cứu vé khác
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                </div>{/* end tl-main */}

                <HomeFooter />
            </div>

            {/* Preview modal — hiện TicketPrint trong modal */}
            {showPreview && result && isPaid && (
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
                            orderCode={result.orderCode}
                            passengers={ticketPassengers}
                            tripInfo={tripInfo}
                            totalAmount={Number(result.totalAmount)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
