import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import Layout           from './components/Layout.jsx';
import ProtectedRoute   from './components/ProtectedRoute.jsx';
import ToastContainer   from './components/ToastContainer.jsx';
import LoginPage        from './pages/LoginPage.jsx';
import RegisterPage     from './pages/RegisterPage.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import JobsPage         from './pages/JobsPage.jsx';
import ResumesPage      from './pages/ResumesPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="w-8 h-8 rounded-full border-2 border-border-default border-t-accent animate-spin-custom" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — wrapped in Layout (sidebar + navbar) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/jobs"          element={<JobsPage />} />
          <Route path="/resumes"       element={<ResumesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast notifications live outside the route tree */}
      <ToastContainer />
    </>
  );
}
