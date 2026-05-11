const STATUS_MAP = {
  applied:   { label: 'Applied',   classes: 'bg-info-bg text-info' },
  screening: { label: 'Screening', classes: 'bg-warning-bg text-warning' },
  interview: { label: 'Interview', classes: 'bg-purple-bg text-purple' },
  offer:     { label: 'Offer',     classes: 'bg-success-bg text-success' },
  rejected:  { label: 'Rejected',  classes: 'bg-error-bg text-error' },
  withdrawn: { label: 'Withdrawn', classes: 'bg-bg-elevated text-text-muted' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, classes: 'bg-bg-elevated text-text-muted' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_MAP };
