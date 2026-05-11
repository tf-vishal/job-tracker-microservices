import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 ml-60 flex flex-col min-h-screen">
        <div className="flex-1 p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
