import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PAGE_TITLES: Record<string, string> = {
    "/admin/dashboard":     "Dashboard",
    "/admin/trains":        "Quản lý đoàn tàu",
    "/admin/trips":         "Kế hoạch khởi hành",
    "/admin/locations":     "Quản lý ga tàu",
    "/admin/users":         "Quản lý người dùng",
    "/admin/payments":      "Quản lý thanh toán",
    "/admin/notifications": "Thông báo",
    "/admin/logs":          "Lịch sử & Giám sát",
};

export default function AdminHeader() {
    const location = useLocation();
    const { user }  = useAuth();

    const pathname = location.pathname;
    const title =
        PAGE_TITLES[pathname] ??
        (pathname.startsWith("/admin/trains/") ? "Chi tiết đoàn tàu" : "Admin");

    const initials = user?.fullName
        ? user.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
        : "A";

    return (
        <header className="admin-header">
            <span className="admin-header-title">{title}</span>
            <div className="admin-header-right">
                <div className="admin-avatar">{initials}</div>
                <span className="admin-header-name">{user?.fullName ?? "Admin"}</span>
            </div>
        </header>
    );
}
