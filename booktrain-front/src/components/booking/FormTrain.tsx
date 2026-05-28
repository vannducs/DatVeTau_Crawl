import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from "lucide-react";
import DatePicker from "./DatePicker";
import PassengerSelector from "./PassengerSelector";
import StationSelector from "./StationSelector";
import type { TrainPassengerCount } from "../../types/passenger";
import type { LocationDTO } from "../../types/location";
import { stationApi } from "../../api/station";

const initialPassengers: TrainPassengerCount = {
  adult: 1,
  child: 0,
  elderly: 0,
  student: 0,
  union: 0,
};

// 👈 Thêm interface props
interface FormTrainProps {
  initialDeparture?: LocationDTO | null;
  initialDestination?: LocationDTO | null;
  initialDate?: string;
}

export default function FormTrain({ 
  initialDeparture,    // 👈 nhận props
  initialDestination,
  initialDate,
}: FormTrainProps) {
  const navigate = useNavigate();
  const [trainStations, setTrainStations] = useState<LocationDTO[]>([]);
  const [departure, setDeparture] = useState<LocationDTO | null>(initialDeparture || null);       // 👈 dùng props
  const [destination, setDestination] = useState<LocationDTO | null>(initialDestination || null); // 👈 dùng props
  const [departureDate, setDepartureDate] = useState(initialDate || "");                          // 👈 dùng props
  const [passengerCount, setPassengerCount] = useState<TrainPassengerCount>(initialPassengers);

  useEffect(() => {
    stationApi.getAll().then(res => {
      const mapped: LocationDTO[] = res.data.map(s => ({
        id: s.id,
        name: s.name,
        locationType: "train_station",
        provinceName: s.city,
        provinceId: null,
        address: null,
        iataCode: null,
      }));
      setTrainStations(mapped);
    }).catch(() => {});
  }, []);

  // Cập nhật khi props thay đổi (khi SearchResultPage load xong dữ liệu)
  useEffect(() => {
    if (initialDeparture) setDeparture(initialDeparture);
  }, [initialDeparture]);

  useEffect(() => {
    if (initialDestination) setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialDate) setDepartureDate(initialDate);
  }, [initialDate]);

  function handleSwap() {
    setDeparture(destination);
    setDestination(departure);
  }

  function handleSearch() {
    if (!departure || !destination || !departureDate) return;
    const { adult, child, elderly, student, union } = passengerCount;
    navigate(
      `/trains/search?fromStationId=${departure.id}&toStationId=${destination.id}&date=${departureDate}` +
      `&adult=${adult}&child=${child}&elderly=${elderly}&student=${student}&union=${union}`
    );
  }

  return (
    <div className="form-body form-body-vexere">
      <div className="search-card-row">
        <div className="search-col search-col-station">
          <StationSelector
            label="Nơi xuất phát"
            type="train"
            role="origin"
            value={departure}
            onChange={(item) => setDeparture(item as LocationDTO)}
            items={trainStations}
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
            type="train"
            role="destination"
            value={destination}
            onChange={(item) => setDestination(item as LocationDTO)}
            items={trainStations}
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
          <button type="button" className="search-btn search-btn-row" onClick={handleSearch}>
            Tìm kiếm
          </button>
        </div>
      </div>
      <PassengerSelector variant="train" count={passengerCount} onChange={setPassengerCount} />
    </div>
  );
}