import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { tripApi } from "../api/trip";
import { useAuth } from "@/hooks/useAuth";
import type { TripResult } from "../types/trip";
import type { SeatDTO } from "../types/seat";
import "./passengerInfo.css";

// Loại hành khách
export type PassengerType = "adult" | "child" | "elderly" | "student" | "union";

// Tỉ lệ giảm giá theo loại
const DISCOUNT: Record<PassengerType, number> = {
    adult:   0,
    child:   0.25,
    elderly: 0.15,
    student: 0.10,
    union:   0.05,
};

// Nhãn hiển thị
const TYPE_LABEL: Record<PassengerType, string> = {
    adult:   "Người lớn",
    child:   "Trẻ em",
    elderly: "Người cao tuổi",
    student: "Sinh viên",
    union:   "Đoàn viên Công đoàn",
};

interface PassengerForm {
    tripSeatId: number;   // id của TripSeat (thay seatId cũ)
    seatNumber: string;
    carriageType: string;
    carriageOrder: number;
    basePrice: number;
    ticketPrice: number;
    passengerType: PassengerType;
    passengerName: string;
    idNumber: string;
    phoneNumber: string;
    dateOfBirth: string;
}

const CARRIAGE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

/** Từ số lượng mỗi loại → tạo mảng loại hành khách theo thứ tự ghế */
function buildPassengerTypes(
    adult: number, child: number, elderly: number, student: number, union: number
): PassengerType[] {
    const types: PassengerType[] = [];
    for (let i = 0; i < adult; i++) types.push("adult");
    for (let i = 0; i < child; i++) types.push("child");
    for (let i = 0; i < elderly; i++) types.push("elderly");
    for (let i = 0; i < student; i++) types.push("student");
    for (let i = 0; i < union; i++) types.push("union");
    return types;
}

/** Chuyển đổi ngày sinh từ nhiều định dạng backend (dd/MM/yyyy, yyyy-MM-dd, ISO) sang YYYY-MM-DD cho input[type=date] */
function normalizeDate(raw?: string): string {
    if (!raw) return "";
    // Đã đúng định dạng YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Định dạng dd/MM/yyyy
    const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
    // ISO format (2000-01-15T00:00:00...)
    if (raw.includes("T")) return raw.split("T")[0];
    return raw;
}

export default function PassengerInfoPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Chuẩn hóa ngày sinh từ user
    const userDob = useMemo(() => normalizeDate(user?.dateOfBirth), [user?.dateOfBirth]);

    const tripId        = Number(searchParams.get("tripId"));
    const seatIds       = searchParams.get("seatIds")?.split(",").map(Number) || [];
    const fromStationId = Number(searchParams.get("fromStationId"));
    const toStationId   = Number(searchParams.get("toStationId"));

    // Thông tin loại hành khách từ URL
    const adult   = Number(searchParams.get("adult")   || 1);
    const child   = Number(searchParams.get("child")   || 0);
    const elderly = Number(searchParams.get("elderly") || 0);
    const student = Number(searchParams.get("student") || 0);
    const union   = Number(searchParams.get("union")   || 0);

    const passengerTypes = buildPassengerTypes(adult, child, elderly, student, union);

    const [trip, setTrip] = useState<TripResult | null>(null);
    const [forms, setForms] = useState<PassengerForm[]>([]);
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showConfirm, setShowConfirm] = useState(false);

    // Tự điền thông tin liên hệ từ user đang đăng nhập
    useEffect(() => {
        if (user) {
            setContactName(user.fullName?.toUpperCase() || "");
            setContactPhone(user.phoneNumber || "");
            setContactEmail(user.email || "");
        }
    }, [user]);

    // Load thông tin chuyến + ghế
    useEffect(() => {
        if (!tripId || seatIds.length === 0) return;

        Promise.all([
            tripApi.getById(tripId, fromStationId, toStationId),
            tripApi.getSeats(tripId, fromStationId, toStationId),
        ]).then(([tripRes, seatsRes]) => {
            setTrip(tripRes.data);

            const allSeats: SeatDTO[] = Object.values(seatsRes.data).flat() as SeatDTO[];
            const chosen = allSeats.filter(s => seatIds.includes(s.id));

            setForms(chosen.map((s, index) => {
                const pType: PassengerType = passengerTypes[index] ?? "adult";
                const discount = DISCOUNT[pType];
                const basePrice = s.price;
                const finalPrice = Math.round(basePrice * (1 - discount));
                return {
                    tripSeatId: s.id,
                    seatNumber: s.seatNumber,
                    carriageType: s.carriageType,
                    carriageOrder: s.carriageOrder,
                    basePrice,
                    ticketPrice: finalPrice,
                    passengerType: pType,
                    // Hành khách đầu tiên tự điền từ user đang đăng nhập
                    passengerName: index === 0 ? (user?.fullName?.toUpperCase() || "") : "",
                    idNumber: "",
                    phoneNumber: index === 0 ? (user?.phoneNumber || "") : "",
                    dateOfBirth: index === 0 ? userDob : "",
                };
            }));
        }).finally(() => setLoading(false));
    }, [tripId, user]);

    function updateForm(index: number, field: keyof PassengerForm, value: string) {
        setForms(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
    }

    const totalPrice = forms.reduce((sum, f) => sum + f.ticketPrice, 0);

    function validate() {
        const errs: Record<string, string> = {};
        forms.forEach((f, i) => {
            if (!f.passengerName.trim()) errs[`name_${i}`] = "Vui lòng nhập họ tên";
            // Trẻ em không cần CCCD
            if (f.passengerType !== "child" && !f.idNumber.trim()) {
                errs[`id_${i}`] = "Vui lòng nhập CMND/CCCD";
            }
        });
        if (!contactName.trim()) errs["contact_name"] = "Vui lòng nhập họ tên liên hệ";
        if (!contactPhone.trim()) errs["contact_phone"] = "Vui lòng nhập số điện thoại";
        if (!contactEmail.trim()) errs["contact_email"] = "Vui lòng nhập email";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleValidate() {
        if (!validate()) return;
        setShowConfirm(true);
    }

    function handleConfirm() {
        setSubmitting(true);
        const now = Date.now();
        const bookingData = {
            tripId,
            fromStationId,
            toStationId,
            passengers: forms,
            contact: { name: contactName, phone: contactPhone, email: contactEmail },
            totalPrice,
            confirmedAt: now,
        };
        sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
        navigate("/trains/payment");
        setSubmitting(false);
    }

    if (loading) return (
        <>
            <Header />
            <div className="pi-loading" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span className="material-icons-round" style={{ fontSize: 24, color: "#2F6FED" }}>manage_search</span>
                Đang tải thông tin...
            </div>
        </>
    );

    return (
        <>
            <Header />

            {/* Breadcrumb steps */}
            <div className="pi-steps">
                <div className="pi-steps-inner">
                    <span className="pi-step pi-step--done">
                        <span className="material-icons-round" style={{ fontSize: 14, verticalAlign: "middle" }}>check</span> Chọn ghế
                    </span>
                    <span className="pi-step-arrow">──────</span>
                    <span className="pi-step pi-step--active">2 Nhập thông tin</span>
                    <span className="pi-step-arrow">──────</span>
                    <span className="pi-step">3 Thanh toán</span>
                </div>
            </div>

            <div className="pi-page">
                <div className="pi-body">

                    {/* Cột trái */}
                    <div className="pi-left">

                        {/* Thông tin chuyến */}
                        {trip && (
                            <div className="pi-trip-info">
                                <div className="pi-trip-badge">MỘT CHIỀU</div>
                                <div className="pi-trip-route">
                                    <span className="pi-trip-station">{trip.fromStationName}</span>
                                    <div className="pi-trip-time-wrap">
                                        <span className="pi-trip-time">{trip.boardTime}</span>
                                        <span className="pi-trip-duration">{trip.duration}</span>
                                        <span className="pi-trip-time">{trip.alightTime}</span>
                                    </div>
                                    <span className="pi-trip-station">{trip.toStationName}</span>
                                </div>
                                <div className="pi-trip-train">
                                    <span className="material-icons-round" style={{ fontSize: 15, color: "#2F6FED", verticalAlign: "middle", marginRight: 4 }}>train</span>
                                    {trip.trainCode} • {trip.trainName}
                                </div>
                            </div>
                        )}

                        {/* Form thông tin từng hành khách */}
                        <div className="pi-section">
                            <h3 className="pi-section-title">Thông tin hành khách</h3>

                            {forms.map((form, index) => {
                                const typeLabel = TYPE_LABEL[form.passengerType];
                                const discount = DISCOUNT[form.passengerType];
                                const isChild = form.passengerType === "child";
                                // Đếm số thứ tự trong cùng loại
                                const sameTypeBefore = forms.slice(0, index).filter(f => f.passengerType === form.passengerType).length;
                                const displayIndex = sameTypeBefore + 1;

                                return (
                                    <div key={form.tripSeatId} className="pi-passenger-card">
                                        <div className="pi-passenger-header">
                                            <span className="pi-passenger-label">
                                                {typeLabel} {displayIndex}
                                                {discount > 0 && (
                                                    <span className="pi-discount-badge">
                                                        GIẢM {Math.round(discount * 100)}%
                                                    </span>
                                                )}
                                            </span>
                                            <span className="pi-passenger-seat">
                                                Toa {form.carriageOrder} • Ghế {form.seatNumber}&nbsp;
                                                ({CARRIAGE_LABEL[form.carriageType] ?? form.carriageType})
                                            </span>
                                        </div>

                                        <div className="pi-form-grid">
                                            <div className="pi-form-group pi-form-group--full">
                                                <label>
                                                    Họ và tên <span className="pi-required">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: NGUYEN VAN A"
                                                    value={form.passengerName}
                                                    onChange={e => updateForm(index, "passengerName", e.target.value.toUpperCase())}
                                                    className={errors[`name_${index}`] ? "pi-input-error" : ""}
                                                />
                                                {errors[`name_${index}`] && (
                                                    <span className="pi-error-msg">
                                                        {errors[`name_${index}`]}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Ẩn CCCD nếu là trẻ em */}
                                            {!isChild && (
                                                <div className="pi-form-group">
                                                    <label>
                                                        Số CMND/CCCD/Hộ chiếu <span className="pi-required">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập số CMND/CCCD"
                                                        value={form.idNumber}
                                                        onChange={e => updateForm(index, "idNumber", e.target.value)}
                                                        className={errors[`id_${index}`] ? "pi-input-error" : ""}
                                                    />
                                                    {errors[`id_${index}`] && (
                                                        <span className="pi-error-msg">
                                                            {errors[`id_${index}`]}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pi-form-group">
                                                <label>Ngày sinh{isChild && <span className="pi-required"> *</span>}</label>
                                                <input
                                                    type="date"
                                                    value={form.dateOfBirth}
                                                    onChange={e => updateForm(index, "dateOfBirth", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Thông tin liên hệ */}
                        <div className="pi-section">
                            <h3 className="pi-section-title">Thông tin liên hệ</h3>
                            <p className="pi-section-hint">
                                Hệ thống sẽ xác nhận đặt chỗ, hoàn tiền hoặc đổi lịch qua thông tin này
                            </p>

                            <div className="pi-form-grid">
                                <div className="pi-form-group pi-form-group--full">
                                    <label>
                                        Họ và tên <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="VD: NGUYEN VAN A"
                                        value={contactName}
                                        onChange={e => setContactName(e.target.value.toUpperCase())}
                                        className={errors["contact_name"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_name"] && (
                                        <span className="pi-error-msg">{errors["contact_name"]}</span>
                                    )}
                                </div>

                                <div className="pi-form-group">
                                    <label>
                                        Số điện thoại <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="VD: 0912345678"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className={errors["contact_phone"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_phone"] && (
                                        <span className="pi-error-msg">{errors["contact_phone"]}</span>
                                    )}
                                </div>

                                <div className="pi-form-group">
                                    <label>
                                        Email <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="VD: example@gmail.com"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        className={errors["contact_email"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_email"] && (
                                        <span className="pi-error-msg">{errors["contact_email"]}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nút tiếp tục */}
                        <button
                            className="pi-submit-btn"
                            onClick={handleValidate}
                            disabled={submitting}
                        >
                            {submitting ? "Đang xử lý..." : "Tiếp tục"}
                        </button>
                    </div>

                    {/* Cột phải - Tóm tắt */}
                    <div className="pi-right">
                        <div className="pi-summary-card">
                            <h3 className="pi-summary-title">Chi tiết giá</h3>

                            {forms.map((form, index) => {
                                const typeLabel = TYPE_LABEL[form.passengerType];
                                const discount = DISCOUNT[form.passengerType];
                                const sameTypeBefore = forms.slice(0, index).filter(f => f.passengerType === form.passengerType).length;
                                const displayIndex = sameTypeBefore + 1;

                                return (
                                    <div key={form.tripSeatId} className="pi-summary-item">
                                        <div className="pi-summary-item-label">
                                            {typeLabel} {displayIndex}
                                            {discount > 0 && (
                                                <span className="pi-summary-discount-badge">
                                                    -{Math.round(discount * 100)}%
                                                </span>
                                            )}
                                            <span className="pi-summary-seat">
                                                Toa {form.carriageOrder} • Ghế {form.seatNumber}
                                            </span>
                                        </div>
                                        <div className="pi-summary-price-col">
                                            {discount > 0 && (
                                                <span className="pi-summary-base-price">
                                                    {form.basePrice.toLocaleString("vi-VN")}đ
                                                </span>
                                            )}
                                            <span className="pi-summary-price">
                                                {form.ticketPrice.toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pi-summary-divider" />

                            <div className="pi-summary-total">
                                <span>Tổng cộng cho {forms.length} người:</span>
                                <span className="pi-summary-total-price">
                                    {totalPrice.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popup xác nhận */}
            {showConfirm && (
                <div className="pi-confirm-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="pi-confirm-box" onClick={e => e.stopPropagation()}>
                        <h3>Xác nhận thông tin</h3>
                        <p>Bạn có chắc chắn thông tin hành khách đã chính xác?</p>

                        <div className="pi-confirm-summary">
                            {forms.map((f, i) => (
                                <div key={i} className="pi-confirm-row">
                                    <span>{TYPE_LABEL[f.passengerType]} {i + 1}:</span>
                                    <span>{f.passengerName || "Chưa nhập"}</span>
                                </div>
                            ))}
                            <div className="pi-confirm-row pi-confirm-row--total">
                                <span>Tổng tiền:</span>
                                <span>{totalPrice.toLocaleString("vi-VN")}đ</span>
                            </div>
                        </div>

                        <div className="pi-confirm-actions">
                            <button
                                className="pi-confirm-btn pi-confirm-btn--back"
                                onClick={() => setShowConfirm(false)}
                            >
                                Quay lại
                            </button>
                            <button
                                className="pi-confirm-btn pi-confirm-btn--ok"
                                onClick={handleConfirm}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}