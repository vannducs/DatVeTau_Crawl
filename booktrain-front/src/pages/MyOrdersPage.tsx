import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
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

/** Parse "HH:mm dd/MM/yyyy" → Date (local time) */
function parseVNDate(s: string): Date {
  const [time, date] = s.split(" ");
  const [hh, mm] = time.split(":");
  const [dd, mo, yyyy] = date.split("/");
  return new Date(+yyyy, +mo - 1, +dd, +hh, +mm);
}

function getBadge(order: Order) {
  if (order.status === "refunded") {
    return { cls: "mo-badge--cancelled", icon: "cancel", label: "Đã hủy" };
  }
  if (order.status === "cancelled") {
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

function SkeletonCard() {
  return (
    <div className="mo-skeleton">
      <div className="mo-skel-line" style={{ width: "40%", marginBottom: 14 }} />
      <div className="mo-skel-line" style={{ width: "70%" }} />
      <div className="mo-skel-line" style={{ width: "55%" }} />
      <div className="mo-skel-line" style={{ width: "30%", marginTop: 8 }} />
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const navigate = useNavigate();
  const labels: Record<string, string> = {
    upcoming:  "chuyến tàu sắp đi",
    completed: "chuyến tàu đã đi",
    all:       "đơn hàng nào",
    cancelled: "đơn hàng nào đã hủy",
  };
  return (
    <div className="mo-empty">
      <div className="mo-empty-icon">
        <span className="material-icons-round">confirmation_number</span>
      </div>
      <div className="mo-empty-title">Chưa có {labels[tab] ?? "đơn hàng nào"}</div>
      <div className="mo-empty-sub">Hãy đặt vé để xem thông tin chuyến đi tại đây</div>
      <button className="mo-empty-btn" onClick={() => navigate("/")}>
        <span className="material-icons-round">search</span>
        Tìm chuyến tàu
      </button>
    </div>
  );
}

function OrderCard({ order, onDetail }: { order: Order; onDetail: () => void }) {
  const badge = getBadge(order);
  const depParts = order.departureTime.split(" ");
  const arrParts = order.arrivalTime.split(" ");

  return (
    <div className="mo-card">
      <div className="mo-card-header">
        <div className="mo-card-train">
          <span className="material-icons-round">train</span>
          {order.trainCode} — {order.trainName}
        </div>
        <span className={`mo-badge ${badge.cls}`}>
          <span className="material-icons-round">{badge.icon}</span>
          {badge.label}
        </span>
      </div>

      <div className="mo-card-body">
        <div className="mo-route">
          <div className="mo-station">
            <div className="mo-station-name">{order.originName}</div>
            <div className="mo-station-time">{depParts[0]}</div>
            <div className="mo-station-date">{depParts[1]}</div>
          </div>

          <div className="mo-route-mid">
            <div className="mo-route-line">
              <div className="mo-route-dot" />
              <div className="mo-route-dashes" />
              <div className="mo-route-arrow">
                <span className="material-icons-round">arrow_forward</span>
              </div>
            </div>
          </div>

          <div className="mo-station right">
            <div className="mo-station-name">{order.destinationName}</div>
            <div className="mo-station-time">{arrParts[0]}</div>
            <div className="mo-station-date">{arrParts[1]}</div>
          </div>
        </div>

        <div className="mo-card-meta">
          <div className="mo-card-meta-item">
            <span className="material-icons-round">person</span>
            {order.passengers.length} hành khách
          </div>
          <div className="mo-card-meta-item">
            <span className="material-icons-round">event_seat</span>
            {order.passengers.map(p =>
              `${CARRIAGE_LABEL[p.carriageType] ?? p.carriageType} ${p.carriageNumber} — Ghế ${p.seatNumber}`
            ).join(", ")}
          </div>
          <div className="mo-card-meta-item">
            <span className="material-icons-round">schedule</span>
            Đặt lúc {order.createdAt}
          </div>
        </div>
      </div>

      <div className="mo-card-footer">
        <div className="mo-order-code">
          Mã đơn: <span>{order.orderCode}</span>
        </div>
        <div className="mo-card-right">
          <div className="mo-total">{formatCurrency(order.totalAmount)}</div>
          <button className="mo-detail-btn" onClick={onDetail}>
            Chi tiết
            <span className="material-icons-round">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"upcoming" | "completed" | "all" | "cancelled">("upcoming");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch("/api/orders/my-orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem("token"); navigate("/login"); return null; }
        if (!r.ok) throw new Error("Lỗi tải đơn hàng");
        return r.json();
      })
      .then(data => { if (data) setOrders(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const now = new Date();

  const upcoming = orders.filter(o => {
    if (o.status === "cancelled" || o.status === "refunded") return false;
    try { return parseVNDate(o.departureTime) > now && o.status === "paid"; }
    catch { return false; }
  });

  const completed = orders.filter(o => {
    if (o.status === "cancelled" || o.status === "refunded") return false;
    try { return parseVNDate(o.departureTime) <= now && o.status !== "cancelled"; }
    catch { return false; }
  });

  const cancelled = orders.filter(o =>
    o.status === "cancelled" || o.status === "refunded"
  );

  const displayed =
    tab === "upcoming"  ? upcoming  :
    tab === "completed" ? completed :
    tab === "cancelled" ? cancelled :
    orders;

  const tabs = [
    { key: "upcoming",  label: "Sắp đi",  icon: "flight_takeoff", count: upcoming.length },
    { key: "completed", label: "Đã đi",   icon: "done_all",       count: completed.length },
    { key: "all",       label: "Tất cả",  icon: "list_alt",       count: orders.length },
    { key: "cancelled", label: "Đã hủy",  icon: "cancel",         count: cancelled.length },
  ] as const;

  return (
    <div className="mo-page">
      <Header />

      <div className="mo-container">
        <div className="mo-title">Đơn hàng của tôi</div>

        <div className="mo-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`mo-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span className="material-icons-round">{t.icon}</span>
              {t.label}
              <span className="mo-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ color: "#dc2626", padding: "16px 0", fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : displayed.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          displayed.map(order => (
            <OrderCard
              key={order.orderCode}
              order={order}
              onDetail={() => navigate(`/my-orders/${order.orderCode}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
