import { Shield, Headphones, Gift, CreditCard } from "lucide-react"
import "./TrustBadges.css"

const badges = [
  {
    icon: Shield,
    title: "Chắc chắn có chỗ",
    desc: "Hoàn 150% nếu nhà xe không cung cấp dịch vụ vận chuyển",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    desc: "Đội ngũ tư vấn viên luôn sẵn sàng hỗ trợ mọi lúc",
  },
  {
    icon: Gift,
    title: "Nhiều ưu đãi",
    desc: "Hàng ngàn ưu đãi cực chất độc quyền tại Vexere",
  },
  {
    icon: CreditCard,
    title: "Thanh toán đa dạng",
    desc: "Thẻ, ví điện tử, tại nhà xe - tiện lợi và nhanh chóng",
  },
]

export default function TrustBadges() {
  return (
    <section className="trust-badges">
      <div className="trust-badges-container">
        {badges.map((badge, index) => {
          const Icon = badge.icon
          return (
            <div key={index} className="trust-badge-item">
              <div className="trust-badge-icon">
                <Icon size={28} />
              </div>
              <div className="trust-badge-text">
                <h3>{badge.title}</h3>
                <p>{badge.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
