interface StatCardProps {
    label:    string;
    value:    string | number;
    icon:     string;
    color:    string;
    sub?:     string;
}

export default function StatCard({ label, value, icon, color, sub }: StatCardProps) {
    return (
        <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: color + "1A" }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
            </div>
            <div>
                <div className="admin-stat-label">{label}</div>
                <div className="admin-stat-value">{value}</div>
                {sub && <div className="admin-stat-sub">{sub}</div>}
            </div>
        </div>
    );
}
