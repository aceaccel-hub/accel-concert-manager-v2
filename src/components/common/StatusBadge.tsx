const statusColors: Record<string, string> = {
  // ConcertStatus
  '기획중': 'bg-gray-100 text-gray-700',
  '준비중': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-green-100 text-green-700',
  '완료': 'bg-purple-100 text-purple-700',
  '취소': 'bg-red-100 text-red-700',

  // ScoreStatus
  '준비완료': 'bg-green-100 text-green-700',
  '미준비': 'bg-red-100 text-red-700',

  // MemberStatus / GroupStatus
  '활동중': 'bg-green-100 text-green-700',
  '운영중': 'bg-green-100 text-green-700',
  '휴식중': 'bg-gray-100 text-gray-700',
  '탈퇴': 'bg-red-100 text-red-700',
  '해산': 'bg-red-100 text-red-700',

  // AttendanceStatus
  '출석': 'bg-green-100 text-green-700',
  '결석': 'bg-red-100 text-red-700',
  '지각': 'bg-yellow-100 text-yellow-700',
  '조퇴': 'bg-orange-100 text-orange-700',

  // PaymentStatus
  '예정': 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
