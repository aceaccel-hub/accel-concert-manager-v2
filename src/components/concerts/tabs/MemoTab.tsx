import { useEffect, useState } from 'react';
import { Save, Clock } from 'lucide-react';
import { db } from '../../../db/database';
import type { Memo } from '../../../types';

interface Props { concertId: string; }

export default function MemoTab({ concertId }: Props) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    db.memos.where('concertId').equals(concertId).first().then(m => {
      if (m) { setMemo(m); setContent(m.content); }
    });
  }, [concertId]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    if (memo) {
      const updated = { ...memo, content, updatedAt: now };
      await db.memos.put(updated);
      setMemo(updated);
    } else {
      const newMemo: Memo = { id: crypto.randomUUID(), concertId, content, updatedAt: now };
      await db.memos.add(newMemo);
      setMemo(newMemo);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <Save size={14} /> {saved ? '저장됨 ✓' : '저장'}
        </button>
      </div>

      <div className="card p-1">
        <textarea
          className="w-full h-96 p-4 text-sm text-gray-800 resize-none focus:outline-none rounded-xl"
          placeholder="연주회 관련 메모를 자유롭게 작성하세요.

예:
- 지휘자 미팅: 6월 1일 예정
- 포스터 디자이너 시안 요청 중
- 악보 추가 주문 필요
- 홍보 채널: 인스타, 카카오톡 단체"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </div>

      <p className="text-xs text-gray-400">💡 Ctrl+Enter로 빠르게 저장할 수 있습니다.</p>
    </div>
  );
}
