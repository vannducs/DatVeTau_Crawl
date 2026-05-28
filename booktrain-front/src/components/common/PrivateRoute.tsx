import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <div>Đang tải...</div>;

    if (!isAuthenticated) {
        // Lưu URL muốn vào
        sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
        // Chuyển về login
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}