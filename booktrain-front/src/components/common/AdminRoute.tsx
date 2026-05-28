import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    // Đang lấy thông tin user → chờ, chưa làm gì cả
    if (isLoading) {
        return (
            <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "100vh",
                fontSize: "16px",
                color: "#6b7280"
            }}>
                Đang tải...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.accountType !== "admin") {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}  