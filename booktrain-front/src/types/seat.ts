export interface SeatDTO {
    id: number;
    seatNumber: string;
    compartmentNo: number | null;
    berthPosition: string;  // "seat" | "lower" | "middle" | "upper"
    carriageId: number;
    carriageOrder: number;
    carriageType: string;   // "seat" | "sleeper_3" | "sleeper_2"
    isVip: boolean;
    status: string;         // "available" | "booked"
    price: number;
}
