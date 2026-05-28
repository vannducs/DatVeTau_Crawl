import { Outlet } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import "./admin.css";

export default function AdminApp() {
    return (
        <div className="admin-layout">
            <AdminSidebar />
            <div className="admin-main">
                <AdminHeader />
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
