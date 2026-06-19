import type { ReactNode } from "react";

interface StatCardProps {
    label:    string;
    value:    string | number;
    icon:     ReactNode;   // react-icons component, vd <MdPeople />
    color:    string;
    sub?:     string;
}

export default function StatCard({ label, value, icon, color, sub }: StatCardProps) {
    return (
        <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: color + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
            </div>
            <div>
                <div className="admin-stat-label">{label}</div>
                <div className="admin-stat-value">{value}</div>
                {sub && <div className="admin-stat-sub">{sub}</div>}
            </div>
        </div>
    );
}
