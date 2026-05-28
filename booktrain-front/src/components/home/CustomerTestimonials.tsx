import { useState } from "react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import "./CustomerTestimonials.css"

const testimonials = [
  {
    quote:
      "Lần trước tôi có việc gấp phải đi công tác, lên mạng tìm đặt vé xe thì tình cờ tìm thấy Vexere. Sau khi tham khảo, tôi quyết định đặt vé và thanh toán. Công nhận rất tiện và nhanh chóng. Chỉ một lúc sau, nhà xe liên hệ xác nhận vé ngay và thông báo thời gian xe dự kiến đón để tôi chuẩn bị. Tôi khá bất ngờ vì nhà xe có thông tin của mình nhanh đến vậy. Chuyến đi hôm đó rất tuyệt. Tôi nhất định sẽ tiếp tục ủng hộ Vexere.",
    author: "CEO",
    company: "Saigon Books",
  },
  {
    quote:
      "Các đối tác của DatVeTau đều là những hãng xe lớn, có uy tín nên tôi hoàn toàn yên tâm khi lựa chọn đặt vé cho bản thân và gia đình. Nhờ hiển thị rõ nhà xe và vị trí chỗ trống trên xe, tôi rất dễ dàng tìm chuyến mình muốn và chỗ mình muốn ngồi. Còn hình thức thanh toán có cả thẻ, ví, tại nhà xe và tốc độ thanh toán thì siêu nhanh, tiết kiệm cho tôi rất nhiều thời gian.",
    author: "Giám đốc",
    company: "BSSC",
  },
]

export default function CustomerTestimonials() {
  const [current, setCurrent] = useState(0)

  function handlePrev() {
    setCurrent((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))
  }

  function handleNext() {
    setCurrent((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
  }

  const t = testimonials[current]

  return (
    <section className="customer-testimonials">
      <div className="testimonials-container">
        <h2>Khách hàng nói gì về DatVeTau</h2>

        <div className="testimonial-card">
          <div className="testimonial-quote-icon">
            <Quote size={32} />
          </div>
          <p className="testimonial-text">{t.quote}</p>
          <div className="testimonial-author">
            <div className="author-avatar">
              {t.author.charAt(0)}
            </div>
            <div className="author-info">
              <div className="author-name">{t.author}</div>
              <div className="author-company">{t.company}</div>
            </div>
          </div>
        </div>

        <div className="testimonial-nav">
          <button className="testimonial-nav-btn" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft size={20} />
          </button>
          <div className="testimonial-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot${current === index ? " active" : ""}`}
                onClick={() => setCurrent(index)}
                aria-label={`Review ${index + 1}`}
              />
            ))}
          </div>
          <button className="testimonial-nav-btn" onClick={handleNext} aria-label="Next">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  )
}
