import { useState, useEffect, useRef } from "react";
import { MapPin, Search, ChevronDown, CircleDot } from "lucide-react";
import type { LocationDTO } from "../../types/location";
import type { ProvinceDTO } from "../../types/province";

interface StationSelectorProps {
  label: string;
  type: "train" | "airport" | "bus";
  value: LocationDTO | ProvinceDTO | null;
  onChange: (item: LocationDTO | ProvinceDTO) => void;
  items: (LocationDTO | ProvinceDTO)[];
  iconColor: "blue" | "red";
  role: "origin" | "destination";
  compact?: boolean;
  disabled?: boolean;
}

function trainMainTitle(name: string) {
  return name.startsWith("Ga ") ? name.slice(3) : name;
}

export default function StationSelector({
  label,
  type,
  value,
  onChange,
  items,
  iconColor,
  role,
  compact,
  disabled,
}: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setKeyword("");
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function airportDisplayMain(name: string) {
    const rest = name.replace(/^Sân bay\s+(Quốc tế\s+)?/i, "").trim();
    return rest || name;
  }

  function getMainLine(item: LocationDTO | ProvinceDTO): string {
    if (type === "train" && "name" in item) return trainMainTitle(item.name);
    if (type === "airport" && "name" in item) return airportDisplayMain(item.name);
    return item.name;
  }

  function getSubLine(item: LocationDTO | ProvinceDTO): string | null {
    if (type === "train" && "name" in item) return item.name;
    if (type === "airport" && "iataCode" in item && item.iataCode && "name" in item) {
      return `${item.iataCode} - ${item.name}`;
    }
    if (type === "bus" && "regionCode" in item && item.regionCode) return item.regionCode;
    return null;
  }

  const filtered = items.filter((item) => item.name.toLowerCase().includes(keyword.toLowerCase()));

  const grouped: Record<string, (LocationDTO | ProvinceDTO)[]> = {};
  if (type === "bus") {
    grouped[""] = filtered;
  } else {
    for (const item of filtered) {
      let group = "Khác";
      if ("provinceName" in item && item.provinceName) group = item.provinceName;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    }
  }

  function handleSelect(item: LocationDTO | ProvinceDTO) {
    onChange(item);
    setIsOpen(false);
    setKeyword("");
  }

  const main = value ? getMainLine(value) : null;
  const sub = value ? getSubLine(value) : null;

  const PinIcon = role === "origin" ? CircleDot : MapPin;

  return (
    <div className={`field-block${compact ? " field-block-compact" : ""}`} ref={wrapperRef}>
      <label className={compact ? "field-label-mini" : undefined}>{label}</label>
      <div
        className={`field-card field-card-select${isOpen ? " active" : ""}${disabled ? " disabled" : ""}${compact ? " field-card-compact" : ""}`}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <PinIcon size={compact ? 22 : 20} className={`icon-${iconColor}`} />
        <div className="field-content">
          <div className="field-title-row">
            {main ? (
              <>
                <span className="field-title">{main}</span>
                {compact && <span className="field-tag-cu"></span>}
              </>
            ) : (
              <span className="placeholder">Chọn {label.toLowerCase()}</span>
            )}
          </div>
          {sub && <div className="field-sub">{sub}</div>}
        </div>
        <ChevronDown size={16} className="icon-chevron" />
      </div>

      {isOpen && (
        <div className="station-dropdown">
          <div className="station-search">
            <Search size={16} className="icon-muted" />
            <input
              autoFocus
              placeholder={
                type === "train"
                  ? "Tìm ga tàu..."
                  : type === "airport"
                    ? "Tìm sân bay..."
                    : "Tìm tỉnh thành..."
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="station-list">
            {Object.entries(grouped).map(([groupName, groupItems]) => (
              <div key={groupName || "all"}>
                {type !== "bus" && groupName && (
                  <div className="station-group-label">{groupName}</div>
                )}
                {groupItems.map((item) => {
                  const title = getMainLine(item);
                  const itemSub = getSubLine(item);
                  const isSelected = value && "id" in value && "id" in item && value.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`station-item${isSelected ? " selected" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                    >
                      <div className="station-item-title">{title}</div>
                      {itemSub && <div className="station-item-sub">{itemSub}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && <div className="station-empty">Không tìm thấy kết quả</div>}
          </div>
        </div>
      )}
    </div>
  );
}
