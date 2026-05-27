import { LayoutDashboard, Music2, BookOpen, Users, Building2, CalendarDays, Wallet, FileText, Settings } from 'lucide-react';
import { useStore } from '../../store/store';

const menus = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'concerts', label: '연주회', icon: Music2 },
  { id: 'repertoire', label: '곡목', icon: BookOpen },
  { id: 'members', label: '단원', icon: Users },
  { id: 'groups', label: '단체', icon: Building2 },
  { id: 'rehearsals', label: '연습', icon: CalendarDays },
  { id: 'budget', label: '예산', icon: Wallet },
  { id: 'documents', label: '문서출력', icon: FileText },
  { id: 'settings', label: '설정', icon: Settings },
] as const;

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useStore();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Music2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Accel</p>
            <p className="text-xs text-gray-500">Concert Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menus.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentPage(id)}
            className={`sidebar-item w-full text-left ${currentPage === id ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Accel Concert Manager v2.0</p>
      </div>
    </aside>
  );
}
