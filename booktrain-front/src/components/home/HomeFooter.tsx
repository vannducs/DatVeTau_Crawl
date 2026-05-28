import "./HomeFooter.css"

const footerLinks = {
  "Về DatVeTau": [
    "Giới thiệu trang web DatVeTau",
    "Tin tức",
    "Tuyển dụng",
  ],
  "Hỗ trợ": [
    "Trung tâm hỗ trợ",
    "Liên hệ",
    "Câu hỏi thường gặp",
    "Chính sách bảo mật",
  ],
  "Thông tin liên hệ": [
    "Hotline: 0123444999",
    "Email: datvetau@gmail.com",
  ],
  "Nhà ga": [
    "Ga Hà Nội",
    "Ga Vinh",
    "Ga Đà Nẵng",
    "Ga Sài Gòn",
  ],
}

const socialLinks = [
  { name: "Facebook",  materialIcon: "people" },
  { name: "YouTube",   materialIcon: "play_circle" },
  { name: "Instagram", materialIcon: "photo_camera" },
]

export default function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">DatVeTau</div>
            <p className="footer-brand-desc">
              Nền tảng đặt vé tàu hỏa hàng đầu Việt Nam. Kết nối hơn 1000 hành khách trên toàn quốc.
            </p>
            <div className="footer-social">
              {socialLinks.map((s) => (
                <button key={s.name} className="social-btn" aria-label={s.name}>
                  <span className="material-icons-round" style={{ fontSize: 20 }}>{s.materialIcon}</span>
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-links">
              <h3>{category}</h3>
              <ul>
                {links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© 2026 DatVeTau. Tất cả quyền được bảo lưu.</p>
          <p>Địa chỉ: Đại học Vinh, Lê Duẩn, Trường Vinh, Nghệ An</p>
          <p>Hotline: 0362369188 | Email: nguyenvanducqlfptshop@gmail.com</p>
        </div>
      </div>
    </footer>
  )
}
