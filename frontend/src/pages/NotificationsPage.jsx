import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { notificationsApi } from '../api/notifications.js';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { markAllRead, refetch } = useNotifications();
  const [items,   setItems]   = useState([]);
  const [meta,    setMeta]    = useState({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    notificationsApi.list({ limit: 50 })
      .then(({ data }) => { setItems(data.data); setMeta(data.meta); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleMarkAll() {
    await markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMeta((m) => ({ ...m, unread: 0 }));
    refetch();
  }

  async function handleMarkOne(id) {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setMeta((m) => ({ ...m, unread: Math.max(0, m.unread - 1) }));
    refetch();
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {meta.unread > 0 ? `${meta.unread} unread` : 'All caught up'}
          </p>
        </div>
        {meta.unread > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={handleMarkAll}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary bg-bg-card border border-border-default hover:border-border-default px-4 py-2 rounded-xl transition-all"
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 rounded-full border-2 border-border-default border-t-accent animate-spin-custom" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Bell size={40} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium text-text-secondary mb-1">No notifications yet</p>
          <p className="text-xs">Reminders will appear here when you have stale applications</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`bg-bg-card border rounded-xl p-4 flex items-start gap-4 transition-all hover:border-border-default
                ${!n.is_read ? 'border-l-2 border-l-accent border-border-subtle' : 'border-border-subtle opacity-70 hover:opacity-100'}`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.is_read ? 'bg-accent-subtle' : 'bg-bg-elevated'}`}>
                <Bell size={15} className={!n.is_read ? 'text-accent' : 'text-text-muted'} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={11} className="text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                  </span>
                  {n.company && (
                    <span className="text-xs bg-bg-elevated border border-border-subtle text-text-muted px-2 py-0.5 rounded-full">
                      {n.company}
                    </span>
                  )}
                </div>
              </div>

              {/* Mark read */}
              {!n.is_read && (
                <button
                  onClick={() => handleMarkOne(n.id)}
                  title="Mark as read"
                  className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-all flex-shrink-0"
                >
                  <CheckCheck size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
