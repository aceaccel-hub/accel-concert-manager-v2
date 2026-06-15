import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = '로딩 중...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Loader2 size={28} className="animate-spin" />
      <p className="text-xs mt-2">{label}</p>
    </div>
  );
}
