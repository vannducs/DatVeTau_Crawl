import { useEffect, useState } from "react";
import { crawlerApi } from "../api/adminApi";
import "./crawler.css";

interface CrawlLogEntry {
    route: string;
    date: string;
    tripsFound: number;
    tripsSaved: number;
    status: string;
}

interface CrawlResult {
    success: boolean;
    totalTrips: number;
    totalCarriages: number;
    totalSeats: number;
    logs: CrawlLogEntry[];
}

interface HistoryLog {
    id: number;
    fromCode: string;
    toCode: string;
    crawlDate: string | null;
    tripsFound: number;
    tripsSaved: number;
    status: string;
    errorMessage: string | null;
    durationMs: number;
    crawledAt: string | null;
}

const PAGE_SIZE = 20;

export default function CrawlerPage() {
    const [vexereToken,  setVexereToken]  = useState("");
    const [crawlMode,    setCrawlMode]    = useState<"days" | "date">("days");
    const [daysAhead,    setDaysAhead]    = useState(30);
    const [specificDate, setSpecificDate] = useState("");
    const [loading,      setLoading]      = useState(false);
    const [crawlResult,  setCrawlResult]  = useState<CrawlResult | null>(null);
    const [error,        setError]        = useState("");

    const [historyLogs,    setHistoryLogs]    = useState<HistoryLog[]>([]);
    const [historyTotal,   setHistoryTotal]   = useState(0);
    const [historyPage,    setHistoryPage]    = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => { fetchHistory(0); }, []);

    async function fetchHistory(page: number) {
        setHistoryLoading(true);
        try {
            const res = await crawlerApi.logs(page, PAGE_SIZE);
            setHistoryLogs(res.data.logs  ?? []);
            setHistoryTotal(res.data.total ?? 0);
            setHistoryPage(page);
        } catch {
            // silently fail — history is non-critical
        } finally {
            setHistoryLoading(false);
        }
    }

    async function handleCrawl() {
        if (loading) return;
        if (crawlMode === "date" && !specificDate) {
            setError("Vui lòng chọn ngày cụ thể.");
            return;
        }
        setError("");
        setCrawlResult(null);
        setLoading(true);
        try {
            const body = {
                vexereToken:  vexereToken.trim() || null,
                daysAhead:    crawlMode === "days" ? daysAhead : undefined,
                specificDate: crawlMode === "date" ? specificDate : null,
            };
            const res = await crawlerApi.triggerAll(body);
            setCrawlResult(res.data as CrawlResult);
            fetchHistory(0);
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: { message?: string } } };
            setError(axErr.response?.data?.message ?? "Crawl thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    function statusClass(s: string) {
        if (s === "success") return "crawler-status-success";
        if (s === "failed")  return "crawler-status-failed";
        return "crawler-status-partial";
    }

    function statusLabel(s: string) {
        if (s === "success") return "✓ Thành công";
        if (s === "failed")  return "✗ Thất bại";
        return "⚠ Một phần";
    }

    const totalHistoryPages = Math.ceil(historyTotal / PAGE_SIZE);

    return (
        <div className="crawler-page">

            {/* ── PHẦN 1: Form cấu hình ──────────────────────────────────────── */}
            <div className="crawler-card">
                <div className="crawler-card-title">
                    <span className="material-icons-round" style={{ color: "#2F6FED", fontSize: 20 }}>
                        cloud_download
                    </span>
                    Cào dữ liệu từ Vexere
                </div>

                {/* Token */}
                <div className="crawler-form-group">
                    <label className="crawler-label">Vexere Token (tuỳ chọn)</label>
                    <textarea
                        className="crawler-textarea"
                        rows={3}
                        placeholder="Dán token Vexere từ DevTools vào đây (Header: Authorization: Bearer eyJ...)"
                        value={vexereToken}
                        onChange={e => setVexereToken(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {/* Chế độ crawl */}
                <div className="crawler-form-group">
                    <label className="crawler-label">Chế độ crawl</label>
                    <div className="crawler-mode-row">
                        <label className={`crawler-radio-label${crawlMode === "days" ? " active" : ""}`}>
                            <input
                                type="radio" name="crawlMode" value="days"
                                checked={crawlMode === "days"}
                                onChange={() => setCrawlMode("days")}
                                disabled={loading}
                            />
                            Theo số ngày
                        </label>
                        <label className={`crawler-radio-label${crawlMode === "date" ? " active" : ""}`}>
                            <input
                                type="radio" name="crawlMode" value="date"
                                checked={crawlMode === "date"}
                                onChange={() => setCrawlMode("date")}
                                disabled={loading}
                            />
                            Ngày cụ thể
                        </label>
                    </div>
                </div>

                {/* Tham số theo chế độ */}
                {crawlMode === "days" ? (
                    <div className="crawler-form-group">
                        <label className="crawler-label">Số ngày (từ hôm nay, tối đa 60)</label>
                        <input
                            type="number"
                            className="crawler-input"
                            min={1} max={60}
                            value={daysAhead}
                            onChange={e => setDaysAhead(Math.min(60, Math.max(1, Number(e.target.value))))}
                            disabled={loading}
                            style={{ width: 120 }}
                        />
                    </div>
                ) : (
                    <div className="crawler-form-group">
                        <label className="crawler-label">Ngày cụ thể</label>
                        <input
                            type="date"
                            className="crawler-input"
                            value={specificDate}
                            onChange={e => setSpecificDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                )}

                {error && <div className="crawler-error-box">{error}</div>}

                <button
                    className="crawler-submit-btn"
                    onClick={handleCrawl}
                    disabled={loading || (crawlMode === "date" && !specificDate)}
                >
                    <span
                        className={`material-icons-round${loading ? " spin" : ""}`}
                        style={{ fontSize: 18 }}
                    >
                        {loading ? "sync" : "cloud_download"}
                    </span>
                    {loading ? "Đang cào dữ liệu..." : "Bắt đầu cào dữ liệu"}
                </button>

                {loading && (
                    <div>
                        <div className="crawler-loading-hint">
                            <span className="material-icons-round" style={{ fontSize: 16 }}>info</span>
                            Quá trình crawl có thể mất vài phút tùy số tuyến và số ngày. Vui lòng không đóng trang.
                        </div>
                        <div className="crawler-progress-bar">
                            <div className="crawler-progress-bar-fill" />
                        </div>
                    </div>
                )}
            </div>

            {/* ── PHẦN 2: Kết quả crawl ──────────────────────────────────────── */}
            {crawlResult && (
                <div className="crawler-card">
                    <div className="crawler-card-title">
                        <span className="material-icons-round" style={{ color: "#10b981", fontSize: 20 }}>
                            check_circle
                        </span>
                        Kết quả crawl vừa thực hiện
                    </div>

                    <div className="crawler-stats-grid">
                        <div className="crawler-stat-box">
                            <div className="crawler-stat-value">{crawlResult.totalTrips}</div>
                            <div className="crawler-stat-label">Chuyến đã lưu</div>
                        </div>
                        <div className="crawler-stat-box">
                            <div className="crawler-stat-value">{crawlResult.totalCarriages}</div>
                            <div className="crawler-stat-label">Toa tàu</div>
                        </div>
                        <div className="crawler-stat-box">
                            <div className="crawler-stat-value">{crawlResult.totalSeats}</div>
                            <div className="crawler-stat-label">Ghế ngồi / nằm</div>
                        </div>
                        <div className="crawler-stat-box">
                            <div className="crawler-stat-value">{crawlResult.logs.length}</div>
                            <div className="crawler-stat-label">Tuyến × Ngày xử lý</div>
                        </div>
                    </div>

                    <div className="crawler-table-wrap" style={{ maxHeight: 380, overflowY: "auto" }}>
                        <table className="crawler-table">
                            <thead>
                                <tr>
                                    <th>Tuyến</th>
                                    <th>Ngày</th>
                                    <th>Tìm thấy</th>
                                    <th>Đã lưu</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {crawlResult.logs.map((log, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{log.route}</td>
                                        <td>{log.date}</td>
                                        <td>{log.tripsFound}</td>
                                        <td>{log.tripsSaved}</td>
                                        <td>
                                            <span className={statusClass(log.status)}>
                                                {statusLabel(log.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── PHẦN 3: Lịch sử crawl ──────────────────────────────────────── */}
            <div className="crawler-card">
                <div className="crawler-card-title">
                    <span className="material-icons-round" style={{ color: "#6b7280", fontSize: 20 }}>
                        history
                    </span>
                    Lịch sử crawl
                    <button
                        onClick={() => fetchHistory(historyPage)}
                        style={{
                            marginLeft: "auto",
                            padding: "4px 12px",
                            fontSize: 12,
                            border: "1.5px solid #e5e7eb",
                            borderRadius: 6,
                            background: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 14 }}>refresh</span>
                        Làm mới
                    </button>
                </div>

                {historyLoading ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#6b7280" }}>
                        Đang tải...
                    </div>
                ) : historyLogs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 14 }}>
                        Chưa có lịch sử crawl nào.
                    </div>
                ) : (
                    <>
                        <div className="crawler-table-wrap">
                            <table className="crawler-table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Tuyến</th>
                                        <th>Ngày crawl</th>
                                        <th>Tìm thấy</th>
                                        <th>Đã lưu</th>
                                        <th>Trạng thái</th>
                                        <th>Lỗi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLogs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#6b7280" }}>
                                                {log.crawledAt
                                                    ? new Date(log.crawledAt).toLocaleString("vi-VN")
                                                    : "—"}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {log.fromCode}→{log.toCode}
                                            </td>
                                            <td>{log.crawlDate ?? "—"}</td>
                                            <td>{log.tripsFound}</td>
                                            <td>{log.tripsSaved}</td>
                                            <td>
                                                <span className={statusClass(log.status)}>
                                                    {statusLabel(log.status)}
                                                </span>
                                            </td>
                                            <td style={{
                                                fontSize: 12,
                                                color: "#ef4444",
                                                maxWidth: 220,
                                                wordBreak: "break-word",
                                            }}>
                                                {log.errorMessage ?? "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalHistoryPages > 1 && (
                            <div className="crawler-pagination">
                                <button
                                    className="crawler-page-btn"
                                    disabled={historyPage === 0}
                                    onClick={() => fetchHistory(historyPage - 1)}
                                >←</button>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>
                                    Trang {historyPage + 1} / {totalHistoryPages}
                                    <span style={{ marginLeft: 8, color: "#9ca3af" }}>
                                        ({historyTotal} bản ghi)
                                    </span>
                                </span>
                                <button
                                    className="crawler-page-btn"
                                    disabled={historyPage >= totalHistoryPages - 1}
                                    onClick={() => fetchHistory(historyPage + 1)}
                                >→</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
