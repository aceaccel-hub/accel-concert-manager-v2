const statusColors: Record<string, string> = {
  '기획중': 'bg-gray-100 text-gray-700',
  '준비중': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-yellow-100 text-yellow-700',
  '완료': 'bg-green-100 text-green-700',
  '취소': 'bg-red-100 text-red-700',
  '준비완료': 'bg-green-100 text-green-700',
  '미준비': 'bg-red-100 text-red-700',
  '활동중': 'bg-green-100 text-green-700',
  '휴식중': 'bg-gray-100 text-gray-700',
  '출석': 'bg-green-100 text-green-700',
  '결석': 'bg-red-100 text-red-700',
  '지각': 'bg-yellow-100 text-yellow-700',
  '예정': 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
