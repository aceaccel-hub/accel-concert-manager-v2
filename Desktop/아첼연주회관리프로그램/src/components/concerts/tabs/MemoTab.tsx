import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Clock } from 'lucide-react';
import type { Memo } from '../../../types';
import { getMemos, saveMemo } from '../../../hooks/useMemos';
import type { ConcertTabContext } from '../ConcertDetail';

export default function MemoTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [memo, setMemo] = useState<Memo | null>(null);
  const [content, setContent] = useState('');
  const [savedFlag, setSavedFlag] = useState(false);

  const load = async () => {
    const memos = await getMemos(concertId);
    const m = memos.find((mm) => (mm.category ?? '_default') === '_default') ?? null;
    setMemo(m);
    setContent(m?.content ?? '');
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  const handleSave = async () => {
    await saveMemo(concertId, content);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1500);
    load();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">메모</h2>
          {memo && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock size={11} /> 마지막 저장: {new Date(memo.updatedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={handleSave}>
          <Save size={14} /> {savedFlag ? '저장됨' : '저장'}
        </button>
      </div>

      <div className="card p-1">
        <textarea
          className="w-full h-96 p-4 text-sm text-gray-800 resize-none focus:outline-none rounded-xl"
          placeholder={`연주회 관련 메모를 자유롭게 작성하세요.

예시:
- 지휘자 미팅: 6월 1일 예정
- 포스터 디자이너 시안 요청 중
- 악보 추가 주문 필요
- 홍보 채널: 인스타그램, 카카오톡 단체방`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>

      <p className="text-xs text-gray-400">Tip: Ctrl(⌘) + Enter 로 빠르게 저장할 수 있습니다.</p>
    </div>
  );
}
