import { useState, useEffect, useRef } from "react";
import { ArrowRightLeft, ChevronDown, Armchair } from "lucide-react";
import DatePicker from "./DatePicker";
import PassengerSelector from "./PassengerSelector";
import StationSelector from "./StationSelector";
import type { FlightPassengerCount } from "../../types/passenger";
import type { LocationDTO } from "../../types/location";
import { locationApi } from "../../api/location";

const CABIN_CLASSES = [
  { id: "economy", label: "Phổ thông" },
  { id: "premium_economy", label: "Phổ thông đặc biệt" },
  { id: "business", label: "Thương gia" },
  { id: "first_class", label: "Hạng nhất" },
];

const initialPassengers: FlightPassengerCount = { adult: 1, child: 0, infant: 0 };

export default function FormFlight() {
  const [airports, setAirports] = useState<LocationDTO[]>([]);
  const [departure, setDeparture] = useState<LocationDTO | null>(null);
  const [destination, setDestination] = useState<LocationDTO | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [passengerCount, setPassengerCount] = useState<FlightPassengerCount>(initialPassengers);
  const [cabinClass, setCabinClass] = useState(CABIN_CLASSES[0]);
  const [cabinOpen, setCabinOpen] = useState(false);
  const cabinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    locationApi.getAirports().then((res) => setAirports(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cabinRef.current && !cabinRef.current.contains(e.target as Node)) {
        setCabinOpen(false);
      }
    }
    if (cabinOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cabinOpen]);

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
            type="airport"
            role="origin"
            value={departure}
            onChange={(item) => setDeparture(item as LocationDTO)}
            items={airports}
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
            type="airport"
            role="destination"
            value={destination}
            onChange={(item) => setDestination(item as LocationDTO)}
            items={airports}
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

      <div className="flight-bottom-row">
        <PassengerSelector variant="flight" count={passengerCount} onChange={setPassengerCount} />
        <div className="cabin-select-wrap" ref={cabinRef}>
          <div
            className={`field-card field-card-select cabin-select-field${cabinOpen ? " active" : ""}`}
            onClick={() => setCabinOpen((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setCabinOpen((v) => !v)}
          >
            <Armchair size={20} className="icon-blue" />
            <div className="field-content field-content-grow">
              <div className="field-title">{cabinClass.label}</div>
            </div>
            <ChevronDown size={16} className="icon-chevron" />
          </div>
          {cabinOpen && (
            <div className="cabin-class-dropdown cabin-class-dropdown-right">
              {CABIN_CLASSES.map((c) => (
                <div
                  key={c.id}
                  className={`cabin-class-item${cabinClass.id === c.id ? " selected" : ""}`}
                  onClick={() => {
                    setCabinClass(c);
                    setCabinOpen(false);
                  }}
                >
                  {c.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
