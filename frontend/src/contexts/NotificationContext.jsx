import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '../api/notifications.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [toasts,      setToasts]      = useState([]); // active corner toasts
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIdsRef = useRef(new Set());               // track already-shown notifications

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await notificationsApi.list({ limit: 10, offset: 0 });
      const { data: items, meta } = data;
      setUnreadCount(meta.unread);

      // Show toasts only for unread notifications we haven't displayed yet
      const newItems = items.filter(
        (n) => !n.is_read && !seenIdsRef.current.has(n.id)
      );

      newItems.forEach((n) => {
        seenIdsRef.current.add(n.id);
        addToast(n.id, n.message);
      });
    } catch {
      // Silently ignore — polling should not crash the app
    }
  }, [isAuthenticated]);

  // Start/stop polling based on auth state
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchNotifications]);

  function addToast(id, message) {
    setToasts((prev) => [...prev, { id, message, exiting: false }]);
    // Auto-dismiss after 4 seconds
    setTimeout(() => dismissToast(id), 4000);
  }

  function dismissToast(id) {
    // Trigger exit animation then remove
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }

  const markRead = useCallback(async (id) => {
    await notificationsApi.markRead(id);
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ toasts, unreadCount, dismissToast, markRead, markAllRead, refetch: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
