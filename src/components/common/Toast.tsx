/**
 * 토스트 알림 컴포넌트
 * useToast() 훅으로 show(message, type?) 호출하면 우상단에 표시됨.
 */
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// 전역 토스트 큐 (간단한 모듈 레벨 이벤트 버스)
type Listener = (item: ToastItem) => void;
const listeners: Listener[] = [];
export function showToast(message: string, type: ToastType = 'success') {
  const item: ToastItem = { id: crypto.randomUUID(), message, type };
  listeners.forEach((fn) => fn(item));
}

const icons = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error: <XCircle size={16} className="text-red-500" />,
  info: <AlertCircle size={16} className="text-blue-500" />,
};

function ToastBubble({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 3000);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  return (
    <div
      className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 text-sm text-gray-800 min-w-[240px] max-w-sm animate-slide-in"
      style={{ animation: 'slideIn 0.2s ease-out' }}
    >
      {icons[item.type]}
      <span className="flex-1">{item.message}</span>
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-gray-500">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (item) => setToasts((prev) => [...prev, item]);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastBubble item={t} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
