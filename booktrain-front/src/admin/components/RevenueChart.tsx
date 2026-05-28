import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

interface DataPoint {
    period: string;
    revenue: number;
}

interface Props {
    data: DataPoint[];
}

function formatMoney(v: number) {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 1_000)     return (v / 1_000).toFixed(0) + "K";
    return v.toString();
}

export default function RevenueChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="admin-empty" style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Chưa có dữ liệu doanh thu
            </div>
        );
    }

    const formatted = data.map(d => ({
        ...d,
        period: d.period?.slice(0, 10) ?? d.period,
    }));

    return (
        <ResponsiveContainer width="100%" height={260}>
            <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatMoney}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(v: number) => [v.toLocaleString("vi-VN") + "đ", "Doanh thu"]}
                    labelStyle={{ fontSize: 12, color: "#374151" }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#2F6FED"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
