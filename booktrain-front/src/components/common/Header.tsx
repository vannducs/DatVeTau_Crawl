import "./header.css"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Phone, Languages, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate("/")
  }

  return (
    <header className="header">
      <div className="header-banner">
        <p>Cam kết hoàn 100% nếu nhà ga không cung cấp dịch vụ vận chuyển (*)</p>
      </div>

      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">DatVeTau</Link>
        </div>

        <nav className="header-nav">
          <Link to="/">Trang chính</Link>
          <Link to="/my-orders">Đơn hàng của tôi</Link>
          <Link to="/ticket-lookup">Tra cứu mã vé</Link>
          <a href="#">Liên hệ và hỗ trợ</a>
        </nav>

        <div className="header-right">
          {isAuthenticated && <NotificationBell />}
          <button className="btn-icon" aria-label="Ngôn ngữ">
            <Languages className="icon" />
          </button>
          <button className="btn-hotline">
            <Phone className="icon-phone" />
            <span className="btn-text">Hotline 24/7</span>
          </button>
          {isAuthenticated ? (
            <div className="user-menu" ref={wrapRef}>
              <button
                type="button"
                className="btn-user"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <User className="icon" />
                <span>{user?.fullName}</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu">
                  <Link
                    to="/account"
                    role="menuitem"
                    className="user-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Thông tin tài khoản
                  </Link>
                  <Link
                    to="/my-orders"
                    role="menuitem"
                    className="user-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Đơn hàng của tôi
                  </Link>
                  <a href="#" role="menuitem" className="user-dropdown-item" onClick={(e) => e.preventDefault()}>
                    Trung tâm Hỗ trợ
                  </a>
                  <button type="button" role="menuitem" className="user-dropdown-item user-dropdown-item--btn" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-login">Đăng nhập</Link>
              <Link to="/register" className="btn-register">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
