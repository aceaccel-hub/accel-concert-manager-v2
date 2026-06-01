import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { initSampleData } from './db/database';
import { useStore } from './store/store';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import ConcertList from './components/concerts/ConcertList';
import RepertoirePage from './components/repertoire/RepertoirePage';
import MembersPage from './components/members/MembersPage';
import GroupsPage from './components/groups/GroupsPage';
import SettingsPage from './components/settings/SettingsPage';
import RehearsalsPageFull from './components/rehearsals/RehearsalsPageFull';
import BudgetPageFull from './components/budget/BudgetPageFull';
import DocumentsPageFull from './components/documents/DocumentsPageFull';

export default function App() {
  const { currentPage } = useStore();

  useEffect(() => {
    initSampleData();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'concerts': return <ConcertList />;
      case 'repertoire': return <RepertoirePage />;
      case 'members': return <MembersPage />;
      case 'groups': return <GroupsPage />;
      case 'rehearsals': return <RehearsalsPageFull />;
      case 'budget': return <BudgetPageFull />;
      case 'documents': return <DocumentsPageFull />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontSize: '14px', borderRadius: '10px', fontFamily: 'Apple SD Gothic Neo, Noto Sans KR, sans-serif' },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}
