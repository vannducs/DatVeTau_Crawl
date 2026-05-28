import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredModal from "../common/LoginRequiredModal";
import type { TripResult } from "../../types/trip";
import "./tripCard.css";

const CARRIAGE_LABEL: Record<string, string> = {
    seat:      "Ghế ngồi",
    sleeper_3: "Nằm khoang 6",
    sleeper_2: "Nằm khoang 4",
};

interface TripCardProps {
    trip: TripResult;
    fromStationId: number;
    toStationId: number;
    adult?: number;
    child?: number;
    elderly?: number;
    student?: number;
    union?: number;
}

export default function TripCard({ trip, fromStationId, toStationId, adult = 1, child = 0, elderly = 0, student = 0, union = 0 }: TripCardProps) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    const formatPrice = (price: number) =>
        price.toLocaleString("vi-VN") + "đ";

    const passengerParams = `&adult=${adult}&child=${child}&elderly=${elderly}&student=${student}&union=${union}`;

    function handleBooking() {
        if (!isAuthenticated) {
            setShowModal(true);
            return;
        }
        navigate(`/trains/booking/${trip.tripId}?fromStationId=${fromStationId}&toStationId=${toStationId}${passengerParams}`);
    }

    function handleConfirmLogin() {
        sessionStorage.setItem("redirectAfterLogin", `/trains/booking/${trip.tripId}?fromStationId=${fromStationId}&toStationId=${toStationId}${passengerParams}`);
        setShowModal(false);
        navigate("/login");
    }

    return (
        <>
            <div className="trip-card">
                <div className="trip-card-left">
                    <div className="trip-times">
                        <div className="trip-time-block">
                            <span className="trip-hour">{trip.boardTime}</span>
                            <span className="trip-station">{trip.fromStationName}</span>
                        </div>

                        <div className="trip-middle">
                            <span className="trip-duration-label">{trip.duration}</span>
                            <div className="trip-line-track">
                                <span className="track-dot" />
                                <span className="track-line" />
                                {trip.nextDay && (
                                    <span className="next-day-badge">+1 ngày</span>
                                )}
                                <span className="track-line" />
                                <span className="track-dot" />
                            </div>
                        </div>

                        <div className="trip-time-block trip-time-block--right">
                            <span className="trip-hour">{trip.alightTime}</span>
                            <span className="trip-station">{trip.toStationName}</span>
                        </div>
                    </div>

                    <div className="trip-train-info">
                        <span className="train-code">{trip.trainCode}</span>
                        {trip.trainName && (
                            <span className="train-name">{trip.trainName}</span>
                        )}
                    </div>
                </div>

                <div className="trip-card-right">
                    <div className="trip-prices-scroll">
                        <div className="trip-prices">
                            {trip.carriageSummary.map((cs) => (
                                <div key={cs.carriageOrder} className="price-item">
                                    <span className="price-type">
                                        {CARRIAGE_LABEL[cs.carriageType] ?? cs.carriageType}
                                        {cs.isVip && " ★"}
                                    </span>
                                    <span className="price-amount">
                                        Từ {formatPrice(cs.minPrice)}
                                    </span>
                                    <span className="price-seats">
                                        còn {cs.availableSeats} chỗ
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn-book-trip" onClick={handleBooking}>
                        Đặt vé
                        {trip.carriageSummary.length > 0 && (
                            <span className="btn-book-hint">Giá rẻ nhất</span>
                        )}
                    </button>
                </div>
            </div>

            {showModal && (
                <LoginRequiredModal
                    onConfirm={handleConfirmLogin}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </>
    );
}
