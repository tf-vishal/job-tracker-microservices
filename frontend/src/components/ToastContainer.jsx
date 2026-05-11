import { Bell, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext.jsx';

function Toast({ id, message, exiting }) {
  const { dismissToast } = useNotifications();

  return (
    <div
      className={`bg-bg-elevated border border-border-default border-l-2 border-l-accent rounded-xl px-4 py-3 min-w-72 max-w-sm shadow-xl flex items-start gap-3 pointer-events-auto
        ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
    >
      <div className="w-7 h-7 rounded-lg bg-accent-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bell size={14} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary">Reminder</p>
        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={() => dismissToast(id)}
        className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}
