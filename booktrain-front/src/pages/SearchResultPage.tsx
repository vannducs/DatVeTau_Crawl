import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tripApi } from "../api/trip";
import { stationApi } from "../api/station";
import type { TripResult } from "../types/trip";
import type { LocationDTO } from "../types/location";
import Header from "../components/common/Header";
import TripCard from "../components/search/TripCard";
import SearchBox from "../components/booking/SearchBox";
import "./searchResult.css";
import "../components/booking/searchSection.css";
import HomeFooter from "../components/home/HomeFooter"


export default function SearchResultPage() {
    const [params] = useSearchParams();

    const fromStationId = Number(params.get("fromStationId"));
    const toStationId   = Number(params.get("toStationId"));
    const date = params.get("date") || "";
    const adult   = Number(params.get("adult")   || 1);
    const child   = Number(params.get("child")   || 0);
    const elderly = Number(params.get("elderly") || 0);
    const student = Number(params.get("student") || 0);
    const union   = Number(params.get("union")   || 0);

    const [trips, setTrips] = useState<TripResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [origin, setOrigin] = useState<LocationDTO | null>(null);
    const [destination, setDestination] = useState<LocationDTO | null>(null);
    const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "depart_asc" | "depart_desc">("price_asc");
    const [filterHour, setFilterHour] = useState<string | null>(null);

    useEffect(() => {
        stationApi.getAll().then(res => {
            const stations: LocationDTO[] = res.data.map(s => ({
                id: s.id,
                name: s.name,
                locationType: "train_station",
                provinceName: s.city,
                provinceId: null,
                address: null,
                iataCode: null,
            }));
            setOrigin(stations.find(s => s.id === fromStationId) || null);
            setDestination(stations.find(s => s.id === toStationId) || null);
        });
    }, [fromStationId, toStationId]);

    useEffect(() => {
        setLoading(true);
        tripApi.search(fromStationId, toStationId, date)
            .then(res => setTrips(res.data))
            .catch(() => setTrips([]))
            .finally(() => setLoading(false));
    }, [fromStationId, toStationId, date]);

    const formatDate = (d: string) => {
        if (!d) return "";
        const [y, m, day] = d.split("-");
        const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
        const thu = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dateObj.getDay()];
        return `${thu}, ${day}/${m}`;
    };

    const filtered = trips.filter(trip => {
        if (!filterHour) return true;
        const hour = parseInt(trip.boardTime.split(":")[0]);
        if (filterHour === "sang_som") return hour >= 0 && hour < 6;
        if (filterHour === "buoi_sang") return hour >= 6 && hour < 12;
        if (filterHour === "buoi_chieu") return hour >= 12 && hour < 18;
        if (filterHour === "buoi_toi") return hour >= 18 && hour <= 23;
        return true;
    });

    const minPrice = (trip: TripResult) =>
        trip.carriageSummary.length > 0
            ? Math.min(...trip.carriageSummary.map(c => c.minPrice))
            : 0;

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "price_asc")    return minPrice(a) - minPrice(b);
        if (sortBy === "price_desc")   return minPrice(b) - minPrice(a);
        if (sortBy === "depart_asc")   return a.boardTime.localeCompare(b.boardTime);
        if (sortBy === "depart_desc")  return b.boardTime.localeCompare(a.boardTime);
        return 0;
    });

    return (
        <>
            <Header />

            <div className="search-result-searchbox">
                <SearchBox
                    initialOrigin={origin}
                    initialDestination={destination}
                    initialDate={date}
                />
            </div>

            <div className="search-result-info-bar">
                <span className="search-route-text">
                    {origin?.name || `Ga #${fromStationId}`}
                    <span className="route-arrow"> → </span>
                    {destination?.name || `Ga #${toStationId}`}
                </span>
                <span className="search-date-badge">{formatDate(date)}</span>
            </div>

            <div className="search-result-page">
                <div className="search-result-body">

                    <aside className="search-filter">
                        <h3 className="filter-title">Bộ lọc</h3>

                        <div className="filter-section">
                            <h4 className="filter-section-title">Giờ đi</h4>
                            <div className="filter-hour-grid">
                                {[
                                    { key: "sang_som", label: "Sáng sớm", sub: "00:00 - 06:00" },
                                    { key: "buoi_sang", label: "Buổi sáng", sub: "06:01 - 12:00" },
                                    { key: "buoi_chieu", label: "Buổi chiều", sub: "12:01 - 18:00" },
                                    { key: "buoi_toi", label: "Buổi tối", sub: "18:01 - 23:59" },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        className={`filter-hour-btn ${filterHour === f.key ? "filter-hour-btn--active" : ""}`}
                                        onClick={() => setFilterHour(filterHour === f.key ? null : f.key)}
                                    >
                                        <span className="filter-hour-label">{f.label}</span>
                                        <span className="filter-hour-sub">{f.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <div className="search-result-main">

                        <div className="sort-bar">
                            <span className="sort-label">Sắp xếp</span>
                            {[
                                { key: "price_asc", label: "Giá thấp nhất" },
                                { key: "price_desc", label: "Giá cao nhất" },
                                { key: "depart_asc", label: "Giờ đi sớm nhất" },
                                { key: "depart_desc", label: "Giờ đi muộn nhất" },
                            ].map(s => (
                                <button
                                    key={s.key}
                                    className={`sort-btn ${sortBy === s.key ? "sort-btn--active" : ""}`}
                                    onClick={() => setSortBy(s.key as typeof sortBy)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="result-status" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                                Đang tìm kiếm chuyến tàu...
                            </div>
                        ) : sorted.length === 0 ? (
                            <div className="result-status">
                                Không tìm thấy chuyến tàu nào!
                            </div>
                        ) : (
                            <>
                                <div className="result-count">
                                    Tìm thấy <strong>{sorted.length}</strong> chuyến tàu
                                </div>
                                <div className="trip-list">
                                    {sorted.map(trip => (
                                        <TripCard
                                            key={trip.tripId}
                                            trip={trip}
                                            fromStationId={fromStationId}
                                            toStationId={toStationId}
                                            adult={adult}
                                            child={child}
                                            elderly={elderly}
                                            student={student}
                                            union={union}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
