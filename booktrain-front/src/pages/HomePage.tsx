import Header from "../components/common/Header"
import SearchSection from "../components/booking/SearchSection"
import TrustBadges from "../components/home/TrustBadges"
import PopularRoutes from "../components/home/PopularRoutes"
import PaymentPromos from "../components/home/PaymentPromos"
import PlatformStats from "../components/home/PlatformStats"
import CustomerTestimonials from "../components/home/CustomerTestimonials"
import HomeFooter from "../components/home/HomeFooter"

export default function HomePage() {
  return (
    <div className="home-page">
      <Header />
      <SearchSection />
      <TrustBadges />
      <PopularRoutes />
      <PaymentPromos />
      <PlatformStats />
      <CustomerTestimonials />
      <HomeFooter />
    </div>
  )
}
