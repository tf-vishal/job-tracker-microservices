import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, TrendingUp, CheckCircle2, XCircle, Clock, Award, ArrowRight } from 'lucide-react';
import { jobsApi } from '../api/jobs.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { format } from 'date-fns';

const STAT_CONFIG = [
  { key: 'applied',   label: 'Applied',   icon: Briefcase,     color: 'text-info',    bg: 'bg-info-bg',    accent: 'bg-info' },
  { key: 'screening', label: 'Screening', icon: Clock,         color: 'text-warning', bg: 'bg-warning-bg', accent: 'bg-warning' },
  { key: 'interview', label: 'Interview', icon: TrendingUp,    color: 'text-purple',  bg: 'bg-purple-bg',  accent: 'bg-purple' },
  { key: 'offer',     label: 'Offers',    icon: Award,         color: 'text-success', bg: 'bg-success-bg', accent: 'bg-success' },
  { key: 'rejected',  label: 'Rejected',  icon: XCircle,       color: 'text-error',   bg: 'bg-error-bg',   accent: 'bg-error' },
  { key: 'withdrawn', label: 'Withdrawn', icon: CheckCircle2,  color: 'text-text-muted', bg: 'bg-bg-elevated', accent: 'bg-text-muted' },
];

export default function DashboardPage() {
  const { user }   = useAuth();
  const [stats,    setStats]   = useState(null);
  const [recent,   setRecent]  = useState([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    Promise.all([jobsApi.stats(), jobsApi.list()])
      .then(([statsRes, jobsRes]) => {
        setStats(statsRes.data.data);
        setRecent(jobsRes.data.data.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-border-default border-t-accent animate-spin-custom" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Hey, {firstName} 👋
        </h1>
        <p className="text-sm text-text-muted mt-1">
          You have <span className="text-text-primary font-semibold">{stats?.total ?? 0}</span> total applications
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {STAT_CONFIG.map(({ key, label, icon: Icon, color, bg, accent }) => (
          <div
            key={key}
            className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 hover:border-border-default hover:-translate-y-0.5 transition-all relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent} opacity-60 rounded-t-xl`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary leading-none">
              {stats?.byStatus?.[key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary text-sm">Recent Applications</h2>
          <Link to="/jobs" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 font-medium">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-text-secondary mb-1">No applications yet</p>
            <Link to="/jobs" className="text-xs text-accent hover:text-accent-hover">Add your first application →</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg-elevated">
                {['Company', 'Role', 'Status', 'Applied'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((job) => (
                <tr key={job.id} className="border-t border-border-subtle hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">{job.company}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{job.role}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3.5 text-sm text-text-muted">
                    {format(new Date(job.appliedDate), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
