import { useState, useEffect, useRef } from "react";
import { Users, ChevronDown, User, Baby, UserRound, GraduationCap, BadgePercent } from "lucide-react";
import PassengerDropdown from "./PassengerDropdown";
import TrainPassengerDropdown from "./TrainPassengerDropdown";
import type { TrainPassengerCount, FlightPassengerCount } from "../../types/passenger";

type TrainProps = {
  variant: "train";
  count: TrainPassengerCount;
  onChange: (c: TrainPassengerCount) => void;
};

type FlightProps = {
  variant: "flight";
  count: FlightPassengerCount;
  onChange: (c: FlightPassengerCount) => void;
};

type Props = TrainProps | FlightProps;

export default function PassengerSelector(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (props.variant === "train") {
    const { count, onChange } = props;
    const total = count.adult + count.child + count.elderly + count.student + count.union;

    return (
      <div className="passenger-selector-wrap train-passenger-wrap" ref={wrapperRef}>
        <div
          className={`train-passenger-bar${isOpen ? " train-passenger-bar-open" : ""}`}
          onClick={() => setIsOpen((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setIsOpen((v) => !v)}
          aria-expanded={isOpen}
        >
          <div className="train-passenger-left">
            <Users size={18} className="icon-blue" />
            <span className="train-passenger-trigger-label">{total} Hành khách</span>
          </div>
          <div className="train-passenger-chips">
            <span className="train-pax-chip">
              <User size={14} className="train-pax-chip-icon" />
              {count.adult} Người lớn
            </span>
            <span className="train-pax-chip">
              <Baby size={14} className="train-pax-chip-icon" />
              {count.child} Trẻ em
              <span className="chip-discount chip-g">-25%</span>
            </span>
            <span className="train-pax-chip">
              <UserRound size={14} className="train-pax-chip-icon" />
              {count.elderly} Người cao tuổi
              <span className="chip-discount chip-g">-15%</span>
            </span>
            <span className="train-pax-chip">
              <GraduationCap size={14} className="train-pax-chip-icon" />
              {count.student} Sinh viên
              <span className="chip-discount chip-g">-10%</span>
            </span>
            <span className="train-pax-chip">
              <BadgePercent size={14} className="train-pax-chip-icon" />
              {count.union} ĐVCĐ
              <span className="chip-discount chip-g">-5%</span>
            </span>
          </div>
          <ChevronDown size={16} className="icon-chevron train-passenger-chevron" />
        </div>

        {isOpen && (
          <div className="passenger-dropdown-anchor train-passenger-anchor">
            <TrainPassengerDropdown
              count={count}
              onChange={onChange}
              onConfirm={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  const { count, onChange } = props;
  const total = count.adult + count.child + count.infant;

  return (
    <div className="passenger-selector-wrap flight-passenger-inline" ref={wrapperRef}>
      <div
        className={`passenger-field${isOpen ? " passenger-field-active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <Users size={18} className="icon-blue" />
        <div className="passenger-field-content">
          <div className="passenger-field-total">{total} Hành khách</div>
        </div>
        <ChevronDown size={16} className="icon-chevron" />
      </div>

      {isOpen && (
        <div className="passenger-dropdown-anchor flight-passenger-anchor">
          <PassengerDropdown count={count} onChange={onChange} onDone={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
