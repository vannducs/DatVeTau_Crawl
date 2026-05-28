export interface CarriageSummary {
    carriageOrder: number;
    carriageType: string;
    isVip: boolean;
    amenities: string;
    availableSeats: number;
    totalSeats: number;
    minPrice: number;
}

export interface TripResult {
    tripId: number;
    trainCode: string;
    trainName: string;
    fromStationName: string;
    toStationName: string;
    fromStationCode: string;
    toStationCode: string;
    boardTime: string;   // HH:mm
    alightTime: string;  // HH:mm
    boardDate: string;   // dd/MM/yyyy
    alightDate: string;
    duration: string;    // "Xh Yp"
    nextDay: boolean;
    carriageSummary: CarriageSummary[];
}
