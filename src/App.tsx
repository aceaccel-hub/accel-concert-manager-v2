import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/common/Toast';
import { startAutoCloudSync } from './services/autoCloudSync';
import { registerPwaServiceWorker } from './services/pwa';

export default function App() {
  useEffect(() => {
    const autoSync = startAutoCloudSync();
    registerPwaServiceWorker();
    return () => autoSync.stop();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4fa]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
