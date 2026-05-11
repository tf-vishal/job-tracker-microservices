import { X } from 'lucide-react';

export default function Modal({ title, children, footer, onClose, maxWidth = 'max-w-lg' }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-bg-card border border-border-default rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-5 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
