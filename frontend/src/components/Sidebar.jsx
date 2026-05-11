import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FileText, Bell, LogOut, Zap,
} from 'lucide-react';
import { useAuth }          from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',          icon: Briefcase,       label: 'Jobs' },
  { to: '/resumes',       icon: FileText,        label: 'Resumes' },
  { to: '/notifications', icon: Bell,            label: 'Notifications', badge: true },
];

export default function Sidebar() {
  const { user, logout }  = useAuth();
  const { unreadCount }   = useNotifications();
  const navigate          = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen bg-bg-card border-r border-border-subtle flex flex-col py-6 px-4 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 pb-6 border-b border-border-subtle mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center accent-glow flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-base gradient-text">JobTracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
              ${isActive
                ? 'bg-accent-subtle text-accent-hover before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-0.5 before:bg-accent before:rounded-r'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="bg-error text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card + logout */}
      <div className="border-t border-border-subtle pt-4 mt-2">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-elevated hover:text-error transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
