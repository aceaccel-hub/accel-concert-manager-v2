import { useEffect, useState } from 'react';
import { db } from '../../db/database';
import type { Rehearsal, Concert } from '../../types';

export default function RehearsalsPageFull() {
  const [rehearsals, setRehearsals] = useState<(Rehearsal & { concert?: Concert })[]>([]);

  useEffect(() => {
    const load = async () => {
      const rs = await db.rehearsals.orderBy('date').reverse().toArray();
      const cs = await db.concerts.toArray();
      setRehearsals(rs.map(r => ({ ...r, concert: cs.find(c => c.id === r.concertId) })));
    };
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = rehearsals.filter(r => r.date >= today);
  const past = rehearsals.filter(r => r.date < today);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">연습 전체 목록</h1>
      <p className="text-sm text-gray-500">특정 연주회의 연습을 관리하려면 연주회 상세 → 연습 탭을 이용하세요.</p>

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">📅 예정된 연습 ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.map(r => <RehearsalRow key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">✅ 완료된 연습 ({past.length})</h2>
          <div className="space-y-2 opacity-70">
            {past.map(r => <RehearsalRow key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {rehearsals.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 연습 일정이 없습니다.</p>
          <p className="text-xs mt-2">연주회 상세 화면에서 연습을 추가하세요.</p>
        </div>
      )}
    </div>
  );
}

function RehearsalRow({ r }: { r: Rehearsal & { concert?: Concert } }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-indigo-50 text-indigo-700">{r.type}</span>
            <span className="text-sm font-semibold">{r.date} {r.time}</span>
          </div>
          <p className="text-xs text-gray-500">📍 {r.place}</p>
          {r.concert && <p className="text-xs text-indigo-600 mt-0.5">🎵 {r.concert.title}</p>}
          {r.targetPieces && r.targetPieces.length > 0 && <p className="text-xs text-gray-400 mt-0.5">대상곡: {r.targetPieces.join(', ')}</p>}
        </div>
        {r.progressRate != null && (
          <span className="text-xs text-gray-500">진행도 {r.progressRate}%</span>
        )}
      </div>
    </div>
  );
}
