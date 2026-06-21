import axios from "axios";

const BASE = "/api/admin";

const api = axios.create({ baseURL: BASE });
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem("token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
    summary:       () => api.get("/dashboard/summary"),
    revenue:       (params: object) => api.get("/dashboard/revenue", { params }),
    topCustomers:  (limit = 10) => api.get("/dashboard/top-customers", { params: { limit } }),
    popularRoutes: (limit = 10) => api.get("/dashboard/popular-routes", { params: { limit } }),
    recentOrders:  (limit = 20) => api.get("/dashboard/orders/recent", { params: { limit } }),
    orderHistory:  (params: object) => api.get("/dashboard/orders/history", { params }),
    trainOccupancy: () => api.get("/dashboard/train-occupancy"),
};

// ─── Trains (ĐỢT 2: Danh mục tàu — READ-ONLY) ──────────────────────────────────
// Dữ liệu tàu/toa/ghế từ crawler Vexere, không CRUD thủ công → chỉ còn list + detail.
export const trainAdminApi = {
    list:   ()             => api.get("/trains"),
    detail: (id: number)   => api.get(`/trains/${id}`),
};

// ─── Trips (ĐỢT 2B: quản lý chuyến đã crawl — read-only + ẩn/xóa) ───────────────
export const tripAdminApi = {
    list:         (params: object)   => api.get("/trips", { params }),
    toggleHidden: (tripId: number)   => api.put(`/trips/${tripId}/toggle-hidden`),
    remove:       (tripId: number)   => api.delete(`/trips/${tripId}`),
};

// ─── Locations (READ-ONLY, ĐỢT 2) ─────────────────────────────────────────────
// Chỉ còn list (GET /api/admin/locations) — schema mới không CRUD ga thủ công.
export const locationAdminApi = {
    list: () => api.get("/locations"),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userAdminApi = {
    list:         (params: object) => api.get("/users", { params }),
    detail:       (id: number)     => api.get(`/users/${id}`),
    updateStatus: (id: number, status: string) => api.put(`/users/${id}/status`, { status }),
    delete:       (id: number)     => api.delete(`/users/${id}`),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentAdminApi = {
    list:   (params: object) => api.get("/payments", { params }),
    detail: (id: number)     => api.get(`/payments/${id}`),
    refund: (id: number, reason: string) => api.put(`/payments/${id}/refund`, { reason }),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationAdminApi = {
    send:        (body: object) => api.post("/notifications/send", body),
    list:        (params: object) => api.get("/notifications", { params }),
    searchUsers: (q: string)    => api.get("/notifications/users/search", { params: { q } }),
};

// ─── Logs ────────────────────────────────────────────────────────────────────
export const logsAdminApi = {
    my:     (params: object) => api.get("/logs/my", { params }),
    orders: (params: object) => api.get("/logs/orders", { params }),
};

// ─── Crawler ─────────────────────────────────────────────────────────────────
export const crawlerApi = {
    // Synchronous bulk crawl — may take several minutes; timeout set to 10 min
    triggerAll:   (body: object) => api.post("/crawler/trigger-all", body, { timeout: 600_000 }),
    trigger:      (body: object) => api.post("/crawler/trigger", body),
    repair:       (body: object) => api.post("/crawler/repair", body, { timeout: 300_000 }),
    logs:         (page = 0, size = 20) => api.get("/crawler/logs", { params: { page, size } }),
    configs:      () => api.get("/crawler/configs"),
    updateConfig: (id: number, body: object) => api.put(`/crawler/configs/${id}`, body),
};
