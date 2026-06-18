import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/common/Toast';
import { initSampleData } from './db/database';
import { startAutoCloudSync } from './services/autoCloudSync';
import { registerPwaServiceWorker } from './services/pwa';

export default function App() {
  useEffect(() => {
    // 비어 있을 때 한 번만 샘플 데이터 시드
    initSampleData().catch((err) => {
      console.error('Failed to initialize sample data:', err);
    });

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
