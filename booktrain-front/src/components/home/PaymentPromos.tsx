import "./PaymentPromos.css"

const promos = [
  {
    tag: "Thẻ Tín dụng",
    title: "Giảm đến 100K",
    desc: "khi thanh toán bằng Thẻ Tín dụng HD SAISON",
    bgColor: "#fff7ed",
    accentColor: "#f97316",
  },
  {
    tag: "ShopeePay",
    title: "Giảm đến 50K",
    desc: "khi thanh toán đơn hàng bằng ví ShopeePay",
    bgColor: "#fff7ed",
    accentColor: "#f97316",
  },
  {
    tag: "ZaloPay",
    title: "Giảm đến 25K",
    desc: "khi thanh toán Vexere bằng ví Zalopay",
    bgColor: "#fff7ed",
    accentColor: "#f97316",
  },
  {
    tag: "MoMo",
    title: "Giảm 20K",
    desc: "khi thanh toán đơn hàng từ 400K bằng ví MoMo",
    bgColor: "#fff7ed",
    accentColor: "#f97316",
  },
]

const partnerPromos = [
  {
    icon: "🚗",
    title: "Grab",
    desc: "Giảm 20% khi đặt GrabBike/GrabCar cho khách hàng Vexere",
  },
  {
    icon: "🚕",
    title: "Xanh SM",
    desc: "Giảm đến 20% khi sử dụng dịch vụ Xanh SM cho khách hàng Vexere",
  },
  {
    icon: "🏮",
    title: "UMI Đà Nẵng",
    desc: "Giảm 20% khi trải nghiệm Izakaya chuẩn Nhật tại UMI Đà Nẵng",
  },
]

export default function PaymentPromos() {
  return (
    <section className="payment-promos">
      <div className="payment-promos-container">
        <h2>Ưu đãi thanh toán online</h2>
        <div className="promos-grid">
          {promos.map((promo, index) => (
            <div key={index} className="promo-card" style={{ background: promo.bgColor }}>
              <div className="promo-tag" style={{ color: promo.accentColor }}>{promo.tag}</div>
              <div className="promo-amount">{promo.title}</div>
              <div className="promo-desc">{promo.desc}</div>
            </div>
          ))}
        </div>

        <h2 className="partner-title">Ưu đãi từ đối tác</h2>
        <div className="partner-grid">
          {partnerPromos.map((promo, index) => (
            <div key={index} className="partner-card">
              <span className="partner-icon">{promo.icon}</span>
              <div className="partner-info">
                <div className="partner-name">{promo.title}</div>
                <div className="partner-desc">{promo.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
