import { useEffect, useState, useCallback } from "react";
import {
    MdPeople, MdReceiptLong, MdPayments, MdTrain, MdTrendingUp,
    MdEmojiEvents, MdListAlt, MdRefresh,
} from "react-icons/md";
import { dashboardApi } from "../api/adminApi";
import StatCard from "../components/StatCard";
import RevenueChart from "../components/RevenueChart";
import OccupancyChart from "../components/OccupancyChart";

interface Summary {
    totalUsers:    number;
    totalOrders:   number;
    totalRevenue:  number;
    totalTrips:    number;
    ordersToday:   number;
    revenueToday:  number;
    newUsersToday: number;
}

interface RevenuePoint { period: string; revenue: number; }
interface RecentOrder  { id: number; order_code: string; customer_name: string; total_amount: number; status: string; created_at: string; }
interface TopCustomer  { user_id: number; full_name: string; email: string; total_orders: number; total_spent: number; }

const STATUS_COLOR: Record<string, string> = {
    paid: "badge-paid", pending_payment: "badge-pending_payment",
    cancelled: "badge-cancelled", completed: "badge-active",
};

export default function DashboardPage() {
    const [summary,    setSummary]    = useState<Summary | null>(null);
    const [revenue,    setRevenue]    = useState<RevenuePoint[]>([]);
    const [recent,     setRecent]     = useState<RecentOrder[]>([]);
    const [customers,  setCustomers]  = useState<TopCustomer[]>([]);
    const [occupancy,  setOccupancy]  = useState<object[]>([]);
    const [revType,    setRevType]    = useState("day");
    const [loading,    setLoading]    = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const [s, rv, rc, c, o] = await Promise.all([
                dashboardApi.summary(),
                dashboardApi.revenue({ type: revType }),
                dashboardApi.recentOrders(15),
                dashboardApi.topCustomers(5),
                dashboardApi.trainOccupancy(),
            ]);
            setSummary(s.data);
            setRevenue(rv.data);
            setRecent(rc.data);
            setCustomers(c.data);
            setOccupancy(o.data);
        } catch (e) {
            console.error("Dashboard load error", e);
        } finally {
            setLoading(false);
        }
    }, [revType]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh mỗi 30 giây
    useEffect(() => {
        const timer = setInterval(fetchAll, 30_000);
        return () => clearInterval(timer);
    }, [fetchAll]);

    if (loading || !summary) return <div className="admin-loading">Đang tải dữ liệu...</div>;

    const fmt = (n: number) => n?.toLocaleString("vi-VN") ?? "0";

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Dashboard</div>
                    <div className="admin-page-subtitle">Tổng quan hệ thống — tự động cập nhật mỗi 30 giây</div>
                </div>
                <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={fetchAll}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MdRefresh size={18} />
                    Làm mới
                </button>
            </div>

            {/* Row 1: Stat Cards */}
            <div className="admin-stats-grid">
                <StatCard label="Tổng người dùng"  value={fmt(summary!.totalUsers)}   icon={<MdPeople size={28} color="#2F6FED" />}      color="#2F6FED" sub={`+${summary!.newUsersToday} hôm nay`} />
                <StatCard label="Tổng đơn hàng"    value={fmt(summary!.totalOrders)}  icon={<MdReceiptLong size={28} color="#16A34A" />} color="#16A34A" sub={`+${summary!.ordersToday} hôm nay`} />
                <StatCard label="Doanh thu (tổng)"  value={fmt(summary!.totalRevenue) + "đ"} icon={<MdPayments size={28} color="#FFC107" />} color="#FFC107" sub={`${fmt(summary!.revenueToday)}đ hôm nay`} />
                <StatCard label="Chuyến tàu"        value={fmt(summary!.totalTrips)}   icon={<MdTrain size={28} color="#8B5CF6" />}       color="#8B5CF6" />
            </div>

            {/* Row 2: Revenue Chart */}
            <div className="admin-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span className="admin-card-title" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <MdTrendingUp size={20} color="#16A34A" />
                        Doanh thu
                    </span>
                    <select
                        className="admin-select"
                        value={revType}
                        onChange={e => setRevType(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: 13 }}
                    >
                        <option value="day">Theo ngày</option>
                        <option value="week">Theo tuần</option>
                        <option value="month">Theo tháng</option>
                        <option value="year">Theo năm</option>
                    </select>
                </div>
                <RevenueChart data={revenue} />
            </div>

            {/* Row 3: Top customers + Popular routes */}
            <div className="admin-grid-2">
                {/* Top 5 khách hàng */}
                <div className="admin-card">
                    <div className="admin-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MdEmojiEvents size={20} color="#FFC107" />
                        Top 5 khách hàng
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Khách hàng</th>
                                <th>Đơn</th>
                                <th>Chi tiêu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => (
                                <tr key={c.user_id}>
                                    <td>
                                        {i < 3 ? (
                                            <MdEmojiEvents
                                                size={20}
                                                style={{ verticalAlign: "middle" }}
                                                color={i === 0 ? "#FFC107" : i === 1 ? "#9CA3AF" : "#B45309"}
                                            />
                                        ) : (
                                            <span style={{ fontWeight: 700, color: "#6B7280" }}>#{i + 1}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{c.email}</div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{c.total_orders}</td>
                                    <td style={{ fontWeight: 700, color: "#2F6FED" }}>
                                        {fmt(Number(c.total_spent))}đ
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Biểu đồ lấp đầy */}
                <div className="admin-card">
                    <div className="admin-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MdTrain size={20} color="#8B5CF6" />
                        Tỉ lệ lấp đầy chuyến tàu
                    </div>
                    <OccupancyChart data={occupancy as Parameters<typeof OccupancyChart>[0]["data"]} />
                </div>
            </div>

            {/* Row 4: Recent orders */}
            <div className="admin-card">
                <div className="admin-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MdListAlt size={20} color="#2F6FED" />
                    Đơn hàng mới nhất
                </div>
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Thời gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map(o => (
                                <tr key={o.id}>
                                    <td><strong style={{ color: "#2F6FED" }}>{o.order_code}</strong></td>
                                    <td>{o.customer_name}</td>
                                    <td style={{ fontWeight: 700 }}>{fmt(Number(o.total_amount))}đ</td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_COLOR[o.status] ?? "badge-pending"}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td style={{ color: "#9CA3AF", fontSize: 12 }}>
                                        {new Date(o.created_at).toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
