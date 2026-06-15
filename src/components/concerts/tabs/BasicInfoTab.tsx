import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Group } from '../../../types';
import { getConcertGroups } from '../../../hooks/useGroups';
import { formatDuration } from '../../../utils/calculations';
import type { ConcertTabContext } from '../ConcertDetail';

export default function BasicInfoTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const [groups, setGroups] = useState<(Group & { role: string })[]>([]);

  useEffect(() => {
    if (!concert?.id) return;
    getConcertGroups(concert.id).then((rows) =>
      setGroups(rows.map((r) => ({ ...r.group, role: r.role })))
    );
  }, [concert?.id]);

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
          <Info label="예상 소요시간" value={concert.expectedDuration ? formatDuration(concert.expectedDuration) : '-'} />
          <Info label="진행률" value={`${concert.progressRate}%`} />
        </div>
        {concert.note && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">비고</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{concert.note}</p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-6">
          ※ 기본 정보를 수정하려면 상단의 [편집] 버튼을 이용하세요.
        </p>
      </section>

      {groups.length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">참여 단체</h2>
          <div className="space-y-3">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">{g.type}</p>
                </div>
                <span className="badge bg-blue-50 text-blue-700">{g.role}</span>
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
