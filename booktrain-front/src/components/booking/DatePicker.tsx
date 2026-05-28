import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import "./DatePicker.css";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  compact?: boolean;
}

export default function DatePicker({ value, onChange, label, compact }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    return new Date();
  });
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function getDaysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function getFirstDayOfWeek(y: number, m: number) {
    return new Date(y, m, 1).getDay();
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function selectDay(day: number) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${year}-${mm}-${dd}`);
    setIsOpen(false);
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  function formatDisplay(d: string) {
    if (!d) return "";
    const [yStr, mStr, dayStr] = d.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const day = parseInt(dayStr, 10);
    const dt = new Date(y, m - 1, day);
    const wd = WEEKDAYS[dt.getDay()];
    const dd = String(day).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${wd}, ${dd}/${mm}/${y}`;
  }
  const MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
                       "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className={`date-picker-wrap${compact ? " date-picker-compact" : ""}`} ref={wrapperRef}>
      {label && <label className={`date-picker-label${compact ? " field-label-mini" : ""}`}>{label}</label>}
      <div
        className={`date-picker-field${isOpen ? " active" : ""}${compact ? " date-picker-field-inline" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((v) => !v)}
      >
        {compact && <Calendar size={20} className="icon-blue date-picker-cal-icon" />}
        <span className={`date-picker-value${!value ? " placeholder" : ""}`}>
          {value ? formatDisplay(value) : "Chọn ngày"}
        </span>
      </div>

      {isOpen && (
        <div className="date-picker-dropdown">
          <div className="date-picker-header">
            <button type="button" onClick={prevMonth} className="date-nav-btn">‹</button>
            <span className="date-picker-month-label">
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" onClick={nextMonth} className="date-nav-btn">›</button>
          </div>
          <div className="date-picker-grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="date-picker-weekday">{d}</div>
            ))}
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dayStr === todayStr;
              const isSelected = dayStr === value;
              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
