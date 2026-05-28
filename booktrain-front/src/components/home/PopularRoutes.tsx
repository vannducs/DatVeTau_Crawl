import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import "./PopularRoutes.css"

const routes = [
  {
    from: "Sài Gòn",
    to: "Nha Trang",
    price: "219.000đ",
    originalPrice: "249.000đ",
  },
  {
    from: "Hà Nội",
    to: "Hải Phòng",
    price: "120.000đ",
    originalPrice: null,
  },
  {
    from: "Sài Gòn",
    to: "Phan Thiết",
    price: "180.000đ",
    originalPrice: null,
  },
  {
    from: "Sài Gòn",
    to: "Phan Rang",
    price: "200.000đ",
    originalPrice: null,
  },
  {
    from: "Hà Nội",
    to: "Lai Chau",
    price: "250.000đ",
    originalPrice: null,
  },
  {
    from: "Đà Nẵng",
    to: "Huế",
    price: "150.000đ",
    originalPrice: null,
  },
  {
    from: "Sài Gòn",
    to: "Vũng Tàu",
    price: "120.000đ",
    originalPrice: null,
  },
  {
    from: "Hà Nội",
    to: "Sapa",
    price: "200.000đ",
    originalPrice: null,
  },
]

export default function PopularRoutes() {
  const [startIndex, setStartIndex] = useState(0)
  const visibleCount = 4

  function handlePrev() {
    setStartIndex((prev) => Math.max(0, prev - 1))
  }

  function handleNext() {
    setStartIndex((prev) => Math.min(routes.length - visibleCount, prev + 1))
  }

  const visibleRoutes = routes.slice(startIndex, startIndex + visibleCount)
  const canPrev = startIndex > 0
  const canNext = startIndex < routes.length - visibleCount

  return (
    <section className="popular-routes">
      <div className="popular-routes-header">
        <h2>Tuyến đường phổ biến</h2>
        <div className="popular-routes-nav">
          <button
            className={`nav-btn${!canPrev ? " disabled" : ""}`}
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className={`nav-btn${!canNext ? " disabled" : ""}`}
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="popular-routes-track">
        {visibleRoutes.map((route, index) => (
          <div key={index} className="route-card">
            <div className="route-path">
              <span className="route-from">{route.from}</span>
              <span className="route-arrow">→</span>
              <span className="route-to">{route.to}</span>
            </div>
            <div className="route-price">
              <span className="price-sale">Từ {route.price}</span>
              {route.originalPrice && (
                <span className="price-original">{route.originalPrice}</span>
              )}
            </div>
            <button className="route-book-btn">Đặt vé</button>
          </div>
        ))}
      </div>
    </section>
  )
}
