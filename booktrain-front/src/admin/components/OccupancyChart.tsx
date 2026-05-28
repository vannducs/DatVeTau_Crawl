import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

interface DataPoint {
    train_code:     string;
    occupancy_rate: number;
    booked_seats:   number;
    total_seats:    number;
}

interface Props { data: DataPoint[]; }

export default function OccupancyChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="admin-empty" style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Chưa có dữ liệu
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.slice(0, 10)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                    dataKey="train_code"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 100]}
                    tickFormatter={v => v + "%"}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(v: number, _: string, props: { payload?: DataPoint }) => [
                        `${v}% (${props.payload?.booked_seats ?? 0}/${props.payload?.total_seats ?? 0} ghế)`,
                        "Lấp đầy",
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }}
                />
                <Bar dataKey="occupancy_rate" name="% lấp đầy" radius={[4, 4, 0, 0]}>
                    {data.slice(0, 10).map((entry, i) => (
                        <Cell
                            key={i}
                            fill={Number(entry.occupancy_rate) >= 80 ? "#16A34A" :
                                  Number(entry.occupancy_rate) >= 50 ? "#FFC107" : "#2F6FED"}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
