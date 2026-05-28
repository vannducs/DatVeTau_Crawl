import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    User, Star, ShoppingBag, Tag, Gift,
    CreditCard, MessageSquare, HelpCircle,
    Lightbulb, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/auth";
import "./AccountPage.css";
import Header from "../components/common/Header"

/** Chuyển đổi ngày sinh từ nhiều định dạng backend sang YYYY-MM-DD cho input[type=date] */
function normalizeDate(raw?: string): string {
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
    if (raw.includes("T")) return raw.split("T")[0];
    return raw;
}

export default function AccountPage() {
    const { user, logout } = useAuth();
    const [form, setForm] = useState({
        fullName: "",
        phoneNumber: "",
        dateOfBirth: "",
        gender: "male",
    });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Khi user data load xong từ API → sync vào form
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                fullName: user.fullName || prev.fullName,
                phoneNumber: user.phoneNumber || prev.phoneNumber,
                dateOfBirth: normalizeDate(user.dateOfBirth) || prev.dateOfBirth,
            }));
        }
    }, [user]);

    const set = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => setForm({ ...form, [field]: e.target.value });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMsg(null);
        try {
            const res = await authApi.updateProfile({
                fullName: form.fullName,
                phoneNumber: form.phoneNumber,
                dateOfBirth: form.dateOfBirth,
                gender: form.gender,
            });
            setSaveMsg({ type: "success", text: res.data.message || "Cập nhật thành công!" });
            // Re-fetch user để sync AuthContext
            const meRes = await authApi.getMe();
            if (meRes.data.id) {
                // Force reload AuthContext user bằng cách trigger lại
                window.location.reload();
            }
        } catch (err: any) {
            setSaveMsg({
                type: "error",
                text: err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!",
            });
        } finally {
            setSaving(false);
        }
    };

    const menuItems: { icon: React.ReactNode; label: string; to: string; active?: boolean; badge?: string | number }[] = [
        { icon: <User size={18} />, label: "Thông tin tài khoản", to: "/account", active: true },
        { icon: <Star size={18} />, label: "Điểm thưởng của tôi", to: "#" },
        { icon: <ShoppingBag size={18} />, label: "Đơn hàng của tôi", to: "/my-orders" },
        { icon: <Tag size={18} />, label: "Ưu đãi", to: "#" },
        { icon: <Gift size={18} />, label: "Giới thiệu nhận quà", to: "#"},
        { icon: <CreditCard size={18} />, label: "Quản lý thẻ", to: "#" },
        { icon: <MessageSquare size={18} />, label: "Đánh giá chuyến đi", to: "#" },
        { icon: <HelpCircle size={18} />, label: "Trung tâm Hỗ trợ", to: "#"},
        { icon: <Lightbulb size={18} />, label: "Góp ý", to: "#" },
    ];

    return (
      <>
      <Header/>
        <div className="account-page">
            {/* Breadcrumb */}
            <div className="account-breadcrumb">
                <Link to="/">Trang chủ</Link>
                <span> &gt; </span>
                <span>Thông tin tài khoản</span>
            </div>

            <div className="account-layout">
                {/* Sidebar */}
                <aside className="account-sidebar">
                    {menuItems.map((item, i) => (
                        <Link
                            key={i}
                            to={item.to}
                            className={`sidebar-item ${item.active ? "sidebar-item--active" : ""}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-label">{item.label}</span>
                            {item.badge && (
                                <span className="sidebar-badge">{item.badge}</span>
                            )}
                        </Link>
                    ))}

                    {/* Đăng xuất */}
                    <button className="sidebar-item sidebar-item--logout" onClick={logout}>
                        <span className="sidebar-icon"><LogOut size={18} /></span>
                        <span className="sidebar-label">Đăng xuất</span>
                    </button>
                </aside>

                {/* Form content */}
                <main className="account-main">
                    <form className="account-form" onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Họ và tên <span className="required">*</span></label>
                            <input
                                type="text"
                                value={form.fullName}
                                onChange={set("fullName")}
                                placeholder="Nhập họ và tên"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                                type="tel"
                                value={form.phoneNumber}
                                onChange={set("phoneNumber")}
                                placeholder="Nhập số điện thoại"
                            />
                        </div>

                        <div className="form-group">
                            <label>Ngày sinh</label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={set("dateOfBirth")}
                            />
                        </div>

                        <div className="form-group">
                            <label>Giới tính</label>
                            <div className="gender-group">
                                {[
                                    { value: "male", label: "Nam" },
                                    { value: "female", label: "Nữ" },
                                    { value: "other", label: "Khác" },
                                ].map((g) => (
                                    <button
                                        key={g.value}
                                        type="button"
                                        className={`gender-btn ${form.gender === g.value ? "gender-btn--active" : ""}`}
                                        onClick={() => setForm({ ...form, gender: g.value })}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-divider" />

                        {saveMsg && (
                            <div style={{
                                padding: "10px 14px",
                                borderRadius: 8,
                                marginBottom: 12,
                                fontSize: 14,
                                fontWeight: 500,
                                background: saveMsg.type === "success" ? "#dcfce7" : "#fee2e2",
                                color: saveMsg.type === "success" ? "#16a34a" : "#dc2626",
                            }}>
                                {saveMsg.text}
                            </div>
                        )}

                        <button type="submit" className="btn-save" disabled={saving}>
                            {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                    </form>
                </main>
            </div>
        </div>
        </>
    );
}