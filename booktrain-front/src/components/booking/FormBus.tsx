import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import DatePicker from "./DatePicker";
import StationSelector from "./StationSelector";
import type { ProvinceDTO } from "../../types/province";
import { locationApi } from "../../api/location";

export default function FormBus() {
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [departure, setDeparture] = useState<ProvinceDTO | null>(null);
  const [destination, setDestination] = useState<ProvinceDTO | null>(null);
  const [departureDate, setDepartureDate] = useState("");

  useEffect(() => {
    locationApi.getProvinces().then((res) => setProvinces(res.data)).catch(() => {});
  }, []);

  function handleSwap() {
    setDeparture(destination);
    setDestination(departure);
  }

  return (
    <div className="form-body form-body-vexere">
      <div className="search-card-row">
        <div className="search-col search-col-station">
          <StationSelector
            label="Nơi xuất phát"
            type="bus"
            role="origin"
            value={departure}
            onChange={(item) => setDeparture(item as ProvinceDTO)}
            items={provinces}
            iconColor="blue"
            compact
          />
        </div>
        <div className="search-col-swap">
          <button type="button" className="swap-btn-inline" onClick={handleSwap} aria-label="Đổi chiều">
            <ArrowRightLeft size={18} />
          </button>
        </div>
        <div className="search-col search-col-station">
          <StationSelector
            label="Nơi đến"
            type="bus"
            role="destination"
            value={destination}
            onChange={(item) => setDestination(item as ProvinceDTO)}
            items={provinces}
            iconColor="red"
            compact
          />
        </div>
        <div className="search-col-divider" aria-hidden />
        <div className="search-col search-col-date">
          <DatePicker value={departureDate} onChange={setDepartureDate} label="Ngày đi" compact />
        </div>
        <div className="search-col search-col-return">
          <span className="field-label-mini field-label-spacer"> </span>
          <button type="button" className="return-link-inline">
            + Thêm ngày về
          </button>
        </div>
        <div className="search-col search-col-submit">
          <span className="field-label-mini field-label-spacer"> </span>
          <button type="button" className="search-btn search-btn-row">
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
