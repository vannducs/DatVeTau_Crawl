import "./searchSection.css"
import SearchBox from "./SearchBox"

export default function SearchSection() {
  return (
    <div className="search-section">
      <div className="overlay">
        <h1>Đặt Vé Tàu Hỏa Online</h1>
        <p>Đại lý chính thức Đường Sắt Việt Nam</p>
        <SearchBox />
      </div>
    </div>
  )
}