import { useEffect, useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import type { Concert } from '../../types';

export default function DocumentsPageFull() {
  const { setCurrentPage, setCurrentTab, setSelectedConcertId } = useStore();
  const [concerts, setConcerts] = useState<Concert[]>([]);

  useEffect(() => {
    db.concerts.orderBy('date').reverse().toArray().then(setConcerts);
  }, []);

  const goToDocuments = (concertId: string) => {
    setSelectedConcertId(concertId);
    setCurrentPage('concerts');
    setCurrentTab('문서');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">문서 출력</h1>
        <p className="text-sm text-gray-500 mt-1">연주회를 선택해서 문서를 생성하세요.</p>
      </div>

      <div className="grid gap-3 max-w-2xl">
        {concerts.map(c => (
          <button
            key={c.id}
            onClick={() => goToDocuments(c.id)}
            className="card p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.date} · {c.place}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500" />
          </button>
        ))}
        {concerts.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p>등록된 연주회가 없습니다.</p>
          </div>
        )}
      </div>

      <div className="card p-5 max-w-2xl bg-blue-50 border-blue-200">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">생성 가능한 문서</h2>
        <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
          {['🎵 곡목표', '👥 단원 명단', '📅 리허설 일정표', '💰 정산표', '📖 프로그램북 원고', '📢 공지문', '✅ 체크리스트'].map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
