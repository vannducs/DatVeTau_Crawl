export interface SeatDTO {
    id: number;
    seatNumber: string;
    compartmentNo: number | null;
    berthPosition: string;    // "seat" | "lower" | "middle" | "upper"
    carriageId: number;
    carriageOrder: number;
    carriageType: string;     // "seat" | "sleeper_3" | "sleeper_2"
    isVip: boolean;
    status: string;           // "available" | "booked"
    price: number;
    // Fields từ Vexere API 2 (null nếu dùng fallback generateSeats)
    gridRow: number | null;
    gridCol: number | null;
    seatCode: string | null;  // "1".."64", null cho generated seats
    loaiCho: string | null;   // "NML", "NMLV", null cho generated seats
}
