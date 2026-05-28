import "./PlatformStats.css"

const stats = [
  {
    value: "2000+",
    label: "Nhà xe chất lượng cao",
  },
  {
    value: "5000+",
    label: "Tuyến đường trên toàn quốc, chủ động và đa dạng lựa chọn",
  },
  {
    value: "60s",
    label: "Đặt vé chỉ với 60 giây. Chọn xe yêu thích cực nhanh và thuận tiện",
  },
  {
    value: "150%",
    label: "Hoàn ngay 150% nếu nhà xe không cung cấp dịch vụ vận chuyển",
  },
]

export default function PlatformStats() {
  return (
    <section className="platform-stats">
      <div className="platform-stats-container">
        <h2>Nền tảng kết nối người dùng và nhà xe</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
