import { Minus, Plus } from "lucide-react";
import type { FlightPassengerCount } from "../../types/passenger";

export type { FlightPassengerCount };

interface PassengerDropdownProps {
  count: FlightPassengerCount;
  onChange: (count: FlightPassengerCount) => void;
  onDone: () => void;
}

const rows: { key: keyof FlightPassengerCount; title: string; subtitle: string; min: number }[] = [
  {
    key: "adult",
    title: "Người lớn",
    subtitle: "Từ đúng 12 tuổi trở lên vào ngày khởi hành",
    min: 1,
  },
  {
    key: "child",
    title: "Trẻ em",
    subtitle: "Từ đúng 2 tuổi đến dưới 11 tuổi",
    min: 0,
  },
  {
    key: "infant",
    title: "Em bé",
    subtitle: "Từ đúng 14 ngày đến dưới 2 tuổi",
    min: 0,
  },
];

export default function PassengerDropdown({ count, onChange, onDone }: PassengerDropdownProps) {
  function handleDecrease(key: keyof FlightPassengerCount, min: number) {
    if (count[key] > min) onChange({ ...count, [key]: count[key] - 1 });
  }

  function handleIncrease(key: keyof FlightPassengerCount) {
    onChange({ ...count, [key]: count[key] + 1 });
  }

  return (
    <div className="passenger-dropdown flight-passenger-dropdown">
      {rows.map(({ key, title, subtitle, min }) => (
        <div key={key} className="flight-pax-row">
          <div className="flight-pax-row-text">
            <div className="flight-pax-row-title">{title}</div>
            <div className="flight-pax-row-sub">{subtitle}</div>
          </div>
          <div className="flight-pax-counter">
            <button
              type="button"
              className={`flight-counter-btn${count[key] <= min ? " disabled" : ""}`}
              onClick={() => handleDecrease(key, min)}
              disabled={count[key] <= min}
              aria-label={`Giảm ${title}`}
            >
              <Minus size={14} />
            </button>
            <span className="flight-counter-val">{count[key]}</span>
            <button
              type="button"
              className="flight-counter-btn flight-counter-plus"
              onClick={() => handleIncrease(key)}
              aria-label={`Tăng ${title}`}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      ))}
      <div className="flight-pax-done-wrap">
        <button type="button" className="flight-pax-done" onClick={onDone}>
          Xong
        </button>
      </div>
    </div>
  );
}
