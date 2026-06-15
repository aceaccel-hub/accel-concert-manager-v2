import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Music2,
  BookOpen,
  Users,
  Building2,
  CalendarDays,
  Wallet,
  FileText,
  Settings,
} from 'lucide-react';
import { useStore } from '../../store/store';
import { getConcertById } from '../../hooks/useConcert';
import type { Concert } from '../../types';

interface MenuItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  match?: (path: string) => boolean;
}

const menus: MenuItem[] = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, match: (p) => p === '/' },
  { to: '/concerts', label: '연주회', icon: Music2, match: (p) => p.startsWith('/concerts') },
  { to: '/repertoire', label: '곡목', icon: BookOpen },
  { to: '/members', label: '단원', icon: Users },
  { to: '/groups', label: '단체', icon: Building2 },
  { to: '/rehearsals', label: '연습', icon: CalendarDays },
  { to: '/budget', label: '예산', icon: Wallet },
  { to: '/documents', label: '문서출력', icon: FileText },
  { to: '/settings', label: '설정', icon: Settings },
];

export default function Sidebar() {
  const { selectedConcertId } = useStore();
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    if (!selectedConcertId) {
      setSelectedConcert(null);
      return;
    }
    getConcertById(selectedConcertId).then((c) => {
      if (!cancelled) setSelectedConcert(c ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedConcertId]);

  return (
    <aside
      className="flex flex-col h-full shrink-0 text-gray-200"
      style={{ width: 220, background: 'var(--sidebar-bg)' }}
    >
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Music2 size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Accel</p>
            <p className="text-[10px] text-white/60">Concert Manager</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menus.map(({ to, label, icon: Icon, match }) => {
          const isActive = match ? match(location.pathname) : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 선택 연주회 표시 */}
      <div className="p-3 border-t border-white/10">
        {selectedConcert ? (
          <div className="px-3 py-2 rounded-lg bg-white/5">
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">선택된 연주회</p>
            <p className="text-xs font-semibold text-white truncate" title={selectedConcert.title}>
              {selectedConcert.title}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">{selectedConcert.date}</p>
          </div>
        ) : (
          <p className="px-3 py-2 text-[10px] text-white/40">선택된 연주회 없음</p>
        )}
        <p className="text-[10px] text-white/30 text-center mt-3">v1.0</p>
      </div>
    </aside>
  );
}
