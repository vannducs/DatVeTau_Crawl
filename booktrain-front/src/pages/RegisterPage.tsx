import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Phone, Train, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "./auth.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", dateOfBirth: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ ...form, phoneNumber: form.phone });
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Train size={32} className="auth-logo-icon" />
          <span>DatVeXe</span>
        </div>
        <h2 className="auth-title">Tạo tài khoản</h2>
        <p className="auth-subtitle">Đăng ký để đặt vé dễ dàng hơn!</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <div className="input-wrap">
              <User size={18} className="input-icon" />
              <input
                name="fullName"
                type="text"
                placeholder="Nhập họ và tên"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <div className="input-wrap">
              <Mail size={18} className="input-icon" />
              <input
                name="email"
                type="email"
                placeholder="Nhập email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <div className="input-wrap">
              <Phone size={18} className="input-icon" />
              <input
                name="phone"
                type="tel"
                placeholder="Nhập số điện thoại"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

          <div className="form-group">
            <label>Ngày sinh</label>
            <div className="input-wrap">
              <Calendar size={18} className="input-icon" />
              <input
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
              />
            </div>
          </div>
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <div className="input-wrap">
              <Lock size={18} className="input-icon" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
}
