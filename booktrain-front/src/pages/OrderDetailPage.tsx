import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/common/Header";
import TicketPrint from "../components/TicketPrint";
import type { TicketTripInfo, TicketPassenger } from "../components/TicketPrint";
import "./myorders.css";

interface Passenger {
  passengerName: string;
  carriageNumber: number;
  seatNumber: string;
  carriageType: string;
  ticketPrice: number;
  idNumber: string;
}

interface Order {
  orderCode: string;
  status: string;
  tripStatus: string;
  totalAmount: number;
  serviceFee: number;
  createdAt: string;
  trainCode: string;
  trainName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  paymentMethod: string;
  transactionCode: string;
  paidAt: string | null;
  note?: string;
  passengers: Passenger[];
}

const CARRIAGE_LABEL: Record<string, string> = {
  HARD_SEAT: "Ghế cứng",
  SOFT_SEAT: "Ghế mềm",
  HARD_SLEEPER: "Nằm cứng",
  SOFT_SLEEPER: "Nằm mềm",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  VNPAY: "VNPay",
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};

function parseVNDate(s: string): Date {
  const [time, date] = s.split(" ");
  const [hh, mm] = time.split(":");
  const [dd, mo, yyyy] = date.split("/");
  return new Date(+yyyy, +mo - 1, +dd, +hh, +mm);
}

function getBadge(order: Order) {
  if (order.status === "refunded" || order.status === "cancelled") {
    return { cls: "mo-badge--cancelled", icon: "cancel", label: "Đã hủy" };
  }
  if (order.status === "pending") {
    return { cls: "mo-badge--pending", icon: "schedule", label: "Chờ thanh toán" };
  }
  try {
    if (parseVNDate(order.departureTime) > new Date()) {
      return { cls: "mo-badge--upcoming", icon: "check_circle", label: "Sắp khởi hành" };
    }
  } catch { /* fall through */ }
  return { cls: "mo-badge--completed", icon: "done_all", label: "Đã hoàn thành" };
}

function formatCurrency(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mo-detail-section-title">{children}</div>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mo-detail-row">
      <span className="mo-detail-label">{label}</span>
      <span className="mo-detail-value">{value}</span>
    </div>
  );
}

/** Build tripInfo for TicketPrint from Order's departureTime/arrivalTime format "HH:mm dd/MM/yyyy" */
function buildTripInfo(order: Order): TicketTripInfo {
  return {
    trainCode: order.trainCode,
    trainName: order.trainName,
    originName: order.originName,
    destinationName: order.destinationName,
    departureTime: order.departureTime,
    arrivalTime: order.arrivalTime,
  };
}

/** Map Order passengers to TicketPassenger format */
function buildTicketPassengers(passengers: Passenger[]): TicketPassenger[] {
  return passengers.map(p => ({
    passengerName: p.passengerName,
    idNumber: p.idNumber,
    seatNumber: p.seatNumber,
    carriageNumber: p.carriageNumber,
    carriageType: p.carriageType,
    ticketPrice: p.ticketPrice,
  }));
}

export default function OrderDetailPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch(`/api/orders/my-orders/${orderCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem("token"); navigate("/login"); return null; }
        if (r.status === 404) { setError("Không tìm thấy đơn hàng"); return null; }
        if (!r.ok) throw new Error("Lỗi tải chi tiết đơn hàng");
        return r.json();
      })
      .then(data => { if (data) setOrder(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderCode, navigate]);

  async function handleCancelOrder() {
    if (!cancelReason.trim()) {
      setCancelError("Vui lòng nhập lý do hủy vé");
      return;
    }
    if (!cancelPassword) {
      setCancelError("Vui lòng nhập mật khẩu");
      return;
    }
    setCancelLoading(true);
    setCancelError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${orderCode}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason, password: cancelPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.message || "Hủy vé thất bại");
        return;
      }
      setShowCancelModal(false);
      window.location.reload();
    } catch {
      setCancelError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mo-detail-page">
        <Header />
        <div className="mo-detail-container">
          {[1, 2, 3].map(i => (
            <div key={i} className="mo-skeleton">
              <div className="mo-skel-line" style={{ width: "50%", marginBottom: 12 }} />
              <div className="mo-skel-line" style={{ width: "80%" }} />
              <div className="mo-skel-line" style={{ width: "65%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mo-detail-page">
        <Header />
        <div className="mo-detail-container">
          <div className="mo-empty">
            <div className="mo-empty-icon">
              <span className="material-icons-round">error_outline</span>
            </div>
            <div className="mo-empty-title">{error || "Không tìm thấy đơn hàng"}</div>
            <div className="mo-empty-sub">Vui lòng kiểm tra lại mã đơn hàng</div>
            <button className="mo-empty-btn" onClick={() => navigate("/my-orders")}>
              <span className="material-icons-round">arrow_back</span>
              Về danh sách đơn
            </button>
          </div>
        </div>
      </div>
    );
  }

  const badge = getBadge(order);
  const depParts = order.departureTime.split(" ");
  const arrParts = order.arrivalTime.split(" ");
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  let isUpcoming = false;
  try {
    isUpcoming = parseVNDate(order.departureTime) > new Date();
  } catch { /* fall through */ }

  const tripInfo = buildTripInfo(order);
  const ticketPassengers = buildTicketPassengers(order.passengers);

  return (
    <div className="mo-detail-page">
      <Header />

      <div className="mo-detail-container">
        {/* Actions */}
        <div className="mo-detail-actions">
          <button
            className="mo-action-btn mo-action-btn--back"
            onClick={() => navigate("/my-orders")}
          >
            <span className="material-icons-round">arrow_back</span>
            Đơn hàng của tôi
          </button>
          {order.status === "paid" && (
            <>
              <button
                className="mo-action-btn mo-action-btn--primary"
                onClick={() => setShowPreview(true)}
              >
                <span className="material-icons-round">visibility</span>
                Xem vé
              </button>
              <button
                className="mo-action-btn mo-action-btn--primary"
                onClick={() => window.print()}
              >
                <span className="material-icons-round">print</span>
                In vé
              </button>
              {isUpcoming && (
                <button
                  className="mo-action-btn mo-action-btn--danger"
                  onClick={() => {
                    setCancelReason("");
                    setCancelPassword("");
                    setCancelError("");
                    setShowCancelModal(true);
                  }}
                >
                  <span className="material-icons-round">cancel</span>
                  Hủy vé
                </button>
              )}
            </>
          )}
        </div>

        {/* Order status */}
        <div className="mo-detail-section" style={{ marginTop: 16 }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Mã đơn hàng</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: 1 }}>
                {order.orderCode}
              </div>
            </div>
            <span className={`mo-badge ${badge.cls}`} style={{ fontSize: 13, padding: "6px 14px" }}>
              <span className="material-icons-round">{badge.icon}</span>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Cancel info section */}
        {isCancelled && (
          <div className="mo-detail-section">
            <SectionTitle>Thông tin hủy vé</SectionTitle>
            <Row
              label="Trạng thái"
              value={
                <span style={{ color: "#dc2626", fontWeight: 700 }}>Đã hủy</span>
              }
            />
            {order.note && (
              <Row
                label="Lý do hủy"
                value={order.note.replace("Khách hủy: ", "")}
              />
            )}
            <Row
              label="Hoàn tiền"
              value={
                order.status === "refunded"
                  ? <span style={{ color: "#16a34a", fontWeight: 600 }}>Thành công</span>
                  : <span style={{ color: "#6B7280" }}>Đang xử lý</span>
              }
            />
            {order.status === "refunded" && (
              <Row
                label="Số tiền hoàn"
                value={
                  <span style={{ fontWeight: 800, color: "#16a34a", fontSize: 16 }}>
                    {formatCurrency(order.totalAmount)}
                  </span>
                }
              />
            )}
          </div>
        )}

        {/* Trip info */}
        <div className="mo-detail-section">
          <SectionTitle>Thông tin chuyến đi</SectionTitle>
          <Row label="Tàu" value={`${order.trainCode} — ${order.trainName}`} />
          <Row label="Ga đi" value={order.originName} />
          <Row label="Ga đến" value={order.destinationName} />
          <Row
            label="Khởi hành"
            value={<><span style={{ fontWeight: 700, color: "#2F6FED" }}>{depParts[0]}</span> ngày {depParts[1]}</>}
          />
          <Row
            label="Đến nơi"
            value={<><span style={{ fontWeight: 700, color: "#2F6FED" }}>{arrParts[0]}</span> ngày {arrParts[1]}</>}
          />
        </div>

        {/* Passengers */}
        <div className="mo-detail-section">
          <SectionTitle>Hành khách ({order.passengers.length} người)</SectionTitle>
          {order.passengers.map((p, i) => (
            <div key={i} className="mo-passenger-card">
              <div className="mo-passenger-name">{p.passengerName}</div>
              <div className="mo-passenger-info">
                <span>CMND/CCCD: {p.idNumber}</span>
                <span>
                  {CARRIAGE_LABEL[p.carriageType] ?? p.carriageType} số {p.carriageNumber} — Ghế {p.seatNumber}
                </span>
              </div>
              <div className="mo-passenger-price">{formatCurrency(p.ticketPrice)}</div>
            </div>
          ))}
          <div className="mo-detail-total">
            <span className="mo-detail-total-label">
              Tổng tiền vé ({order.passengers.length} vé)
            </span>
            <span className="mo-detail-total-price">
              {formatCurrency(order.totalAmount - order.serviceFee)}
            </span>
          </div>
        </div>

        {/* Payment info */}
        <div className="mo-detail-section">
          <SectionTitle>Thông tin thanh toán</SectionTitle>
          <Row label="Tiền vé" value={formatCurrency(order.totalAmount - order.serviceFee)} />
          {order.serviceFee > 0 && (
            <Row label="Phí dịch vụ" value={formatCurrency(order.serviceFee)} />
          )}
          <Row
            label="Tổng thanh toán"
            value={
              <span style={{ fontSize: 17, fontWeight: 800, color: "#dc2626" }}>
                {formatCurrency(order.totalAmount)}
              </span>
            }
          />
          <Row
            label="Phương thức"
            value={PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod ?? "—"}
          />
          {order.transactionCode && (
            <Row label="Mã giao dịch" value={order.transactionCode} />
          )}
          {order.paidAt && (
            <Row label="Thời gian thanh toán" value={order.paidAt} />
          )}
          <Row label="Ngày đặt vé" value={order.createdAt} />
        </div>
      </div>

      {/* Vé tàu — ẩn trên màn hình, hiện khi print */}
      {order.status === "paid" && (
        <TicketPrint
          orderCode={order.orderCode}
          passengers={ticketPassengers}
          tripInfo={tripInfo}
          totalAmount={order.totalAmount}
        />
      )}

      {/* Preview modal — Xem vé */}
      {showPreview && order.status === "paid" && (
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
              orderCode={order.orderCode}
              passengers={ticketPassengers}
              tripInfo={tripInfo}
              totalAmount={order.totalAmount}
            />
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="mo-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="mo-modal" onClick={e => e.stopPropagation()}>
            <div className="mo-modal-header">
              <span className="material-icons-round" style={{ color: "#dc2626" }}>cancel</span>
              <h3>Hủy vé</h3>
            </div>

            <div className="mo-modal-warning">
              ⚠️ Sau khi hủy, tiền sẽ được hoàn lại vào tài khoản của bạn trong 1–3 ngày làm việc.
              Hành động này không thể hoàn tác.
            </div>

            <div className="mo-modal-field">
              <label>Lý do hủy vé *</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy vé..."
                rows={3}
              />
            </div>

            <div className="mo-modal-field">
              <label>Mật khẩu xác nhận *</label>
              <input
                type="password"
                value={cancelPassword}
                onChange={e => setCancelPassword(e.target.value)}
                placeholder="Nhập mật khẩu tài khoản của bạn"
              />
            </div>

            {cancelError && (
              <div className="mo-modal-error">{cancelError}</div>
            )}

            <div className="mo-modal-actions">
              <button
                className="mo-action-btn mo-action-btn--back"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                Đóng
              </button>
              <button
                className="mo-action-btn mo-action-btn--danger"
                onClick={handleCancelOrder}
                disabled={cancelLoading || !cancelReason.trim() || !cancelPassword}
              >
                {cancelLoading
                  ? <><span className="material-icons-round">hourglass_empty</span> Đang xử lý...</>
                  : <><span className="material-icons-round">cancel</span> Xác nhận hủy vé</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
