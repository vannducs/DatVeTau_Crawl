import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/api/auth";
import "./notification-bell.css";

interface Notification {
  id: number;
  title: string;
  body: string;
  noti_type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count ?? 0);
    } catch { /* not logged in */ }
  }, []);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { page: 0, size: 30 } });
      setNotifications(res.data.notifications ?? []);
    } finally { setLoading(false); }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedNotif(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // When opening dropdown, fetch notifications
  const handleToggle = () => {
    if (!open) {
      fetchNotifications();
    } else {
      setSelectedNotif(null);
    }
    setOpen(!open);
  };

  // Mark one as read
  const handleSelect = async (n: Notification) => {
    setSelectedNotif(n);
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        setNotifications(prev =>
          prev.map(x => x.id === n.id ? { ...x, is_read: true } : x)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* ignore */ }
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    return d.toLocaleDateString("vi-VN");
  };

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button className="btn-icon notif-bell-btn" aria-label="Thông báo" onClick={handleToggle}>
        <span className="material-icons-round" style={{ fontSize: 22, color: "white" }}>notifications</span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          {/* Header */}
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Thông báo</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Content */}
          {selectedNotif ? (
            <div className="notif-detail">
              <button className="notif-back" onClick={() => setSelectedNotif(null)}>
                <span className="material-icons-round" style={{ fontSize: 16 }}>arrow_back</span>
                Quay lại
              </button>
              <div className="notif-detail-title">{selectedNotif.title}</div>
              <div className="notif-detail-time">{formatTime(selectedNotif.created_at)}</div>
              <div className="notif-detail-body">{selectedNotif.body}</div>
            </div>
          ) : (
            <div className="notif-list">
              {loading ? (
                <div className="notif-empty">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">
                  <span className="material-icons-round" style={{ fontSize: 36, color: "#D1D5DB" }}>notifications_off</span>
                  <p>Không có thông báo</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button key={n.id} className={`notif-item ${!n.is_read ? "notif-item--unread" : ""}`}
                    onClick={() => handleSelect(n)}>
                    <div className="notif-item-icon">
                      <span className="material-icons-round" style={{ fontSize: 18 }}>
                        {n.noti_type === "cancellation" ? "cancel" : n.noti_type === "broadcast" ? "campaign" : "info"}
                      </span>
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-time">{formatTime(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div className="notif-item-dot" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
