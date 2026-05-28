import { useEffect, useState } from "react";
import { locationAdminApi } from "../api/adminApi";

interface Location {
    id: number;
    name: string;
    location_type: string;
    province_name: string;
    address: string;
    iata_code: string;
}

interface Province { id: number; name: string; }

interface LocForm {
    name: string;
    locationType: string;
    provinceId: string;
    address: string;
    latitude: string;
    longitude: string;
    iataCode: string;
}

const EMPTY: LocForm = {
    name: "", locationType: "train_station", provinceId: "",
    address: "", latitude: "", longitude: "", iataCode: "",
};

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [search,    setSearch]    = useState("");
    const [modal,     setModal]     = useState<"add" | "edit" | null>(null);
    const [editId,    setEditId]    = useState<number | null>(null);
    const [form,      setForm]      = useState<LocForm>(EMPTY);
    const [msg,       setMsg]       = useState("");
    const [error,     setError]     = useState("");

    async function fetchLocations(s = search) {
        const res = await locationAdminApi.list(s);
        setLocations(res.data);
    }

    useEffect(() => {
        fetchLocations("");
        locationAdminApi.provinces().then(r => setProvinces(r.data));
    }, []);

    function openAdd() {
        setForm(EMPTY);
        setEditId(null);
        setModal("add");
        setError("");
    }

    function openEdit(loc: Location & Record<string, unknown>) {
        setForm({
            name:         loc.name ?? "",
            locationType: (loc.location_type as string) ?? "",
            provinceId:   (loc.province_id as string | number)?.toString() ?? "",
            address:      (loc.address as string) ?? "",
            latitude:     (loc.latitude as string | number)?.toString() ?? "",
            longitude:    (loc.longitude as string | number)?.toString() ?? "",
            iataCode:     (loc.iata_code as string) ?? "",
        });
        setEditId(loc.id);
        setModal("edit");
        setError("");
    }

    async function handleSave() {
        setError("");
        const body = {
            name:         form.name,
            locationType: form.locationType,
            provinceId:   form.provinceId ? Number(form.provinceId) : null,
            address:      form.address || null,
            latitude:     form.latitude ? Number(form.latitude) : null,
            longitude:    form.longitude ? Number(form.longitude) : null,
            iataCode:     form.iataCode || null,
        };
        try {
            if (modal === "add") {
                await locationAdminApi.create(body);
                setMsg("Thêm ga tàu thành công");
            } else if (editId !== null) {
                await locationAdminApi.update(editId, body);
                setMsg("Cập nhật ga tàu thành công");
            }
            setModal(null);
            fetchLocations(search);
        } catch {
            setError("Có lỗi xảy ra. Vui lòng thử lại.");
        }
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Xóa ga "${name}"?`)) return;
        try {
            await locationAdminApi.delete(id);
            setMsg("Đã xóa ga tàu");
            fetchLocations(search);
        } catch {
            setMsg("");
            alert("Không thể xóa: ga đang dùng trong chuyến tàu.");
        }
    }

    function field(key: keyof LocForm, label: string, type = "text", placeholder = "") {
        return (
            <div className="admin-form-group">
                <label className="admin-form-label">{label}</label>
                <input className="admin-form-input" type={type} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
        );
    }

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý ga tàu</div>
                    <div className="admin-page-subtitle">Tổng: {locations.length} ga</div>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={openAdd}>+ Thêm ga tàu</button>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            <div className="admin-card">
                <div className="admin-toolbar">
                    <input className="admin-search" placeholder="Tìm theo tên ga, mã IATA..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && fetchLocations(search)} />
                    <button className="admin-btn admin-btn-outline"
                        onClick={() => fetchLocations(search)}>Tìm</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên ga</th>
                                <th>Loại</th>
                                <th>Tỉnh/Thành</th>
                                <th>Mã IATA</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.length === 0 ? (
                                <tr><td colSpan={6} className="admin-empty">Không có dữ liệu</td></tr>
                            ) : locations.map(loc => (
                                <tr key={loc.id}>
                                    <td style={{ color: "#9CA3AF" }}>#{loc.id}</td>
                                    <td><strong>{loc.name}</strong></td>
                                    <td><span className="admin-badge badge-active" style={{ fontSize: 11 }}>
                                        {loc.location_type}
                                    </span></td>
                                    <td>{loc.province_name}</td>
                                    <td style={{ fontFamily: "monospace" }}>{loc.iata_code || "—"}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button className="admin-btn admin-btn-outline admin-btn-sm"
                                                onClick={() => openEdit(loc as Location & Record<string, unknown>)}>Sửa</button>
                                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleDelete(loc.id, loc.name)}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="admin-modal-overlay" onClick={() => setModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">
                                {modal === "add" ? "Thêm ga tàu" : "Chỉnh sửa ga tàu"}
                            </span>
                            <button className="admin-modal-close" onClick={() => setModal(null)}>×</button>
                        </div>

                        {error && <div className="admin-alert admin-alert-error">{error}</div>}

                        {field("name", "Tên ga *", "text", "Vd: Ga Hà Nội")}
                        <div className="admin-grid-2">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Loại</label>
                                <select className="admin-form-select"
                                    value={form.locationType}
                                    onChange={e => setForm(f => ({ ...f, locationType: e.target.value }))}>
                                    <option value="train_station">Train Station</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Tỉnh/Thành</label>
                                <select className="admin-form-select"
                                    value={form.provinceId}
                                    onChange={e => setForm(f => ({ ...f, provinceId: e.target.value }))}>
                                    <option value="">-- Chọn tỉnh --</option>
                                    {provinces.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {field("address",   "Địa chỉ",   "text", "Số nhà, đường...")}
                        {field("iataCode",  "Mã IATA",   "text", "Vd: HAN")}
                        <div className="admin-grid-2">
                            {field("latitude",  "Vĩ độ",   "number", "Vd: 21.0285")}
                            {field("longitude", "Kinh độ", "number", "Vd: 105.8542")}
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setModal(null)}>Huỷ</button>
                            <button className="admin-btn admin-btn-primary" onClick={handleSave}>
                                {modal === "add" ? "Thêm ga" : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
