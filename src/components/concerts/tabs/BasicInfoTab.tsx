import { useEffect, useState } from 'react';
import { db } from '../../../db/database';
import type { Concert, Group } from '../../../types';

interface Props { concert: Concert; onRefresh?: () => void; }

export default function BasicInfoTab({ concert }: Props) {
  const [groups, setGroups] = useState<(Group & { role: string })[]>([]);

  useEffect(() => {
    const load = async () => {
      const cgs = await db.concertGroups.where('concertId').equals(concert.id).toArray();
      const gs = await db.groups.toArray();
      setGroups(cgs.map(cg => {
        const g = gs.find(g => g.id === cg.groupId);
        return g ? { ...g, role: cg.role } : null;
      }).filter(Boolean) as (Group & { role: string })[]);
    };
    load();
  }, [concert.id]);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">기본 정보</h2>
        <div className="grid grid-cols-2 gap-6">
          <Info label="연주회명" value={concert.title} full />
          <Info label="날짜" value={concert.date} />
          <Info label="시간" value={concert.time} />
          <Info label="장소" value={concert.place} full />
          <Info label="지휘자" value={concert.conductor} />
          <Info label="협연자" value={concert.coPerformer || '-'} />
          <Info label="담당자" value={concert.manager || '-'} />
          <Info label="상태" value={concert.status} />
          <Info label="예상 소요시간" value={concert.expectedDuration ? `${concert.expectedDuration}분` : '-'} />
          <Info label="진행률" value={`${concert.progressRate}%`} />
        </div>
        {concert.note && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">비고</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{concert.note}</p>
          </div>
        )}
      </section>

      {groups.length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">참여 단체</h2>
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">{g.type}</p>
                </div>
                <span className="badge bg-indigo-50 text-indigo-700">{g.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  );
}
