// 악기/파트/역할 표준화 선택지
// 요구사항: 악기·파트·역할_표준화_수정요청서.docx

export const INSTRUMENT_OPTIONS = [
  'Violin I',
  'Violin II',
  'Viola',
  'V.Cello',
  'C.Bass',
  'Flute',
  'Oboe',
  'Clarinet',
  'Bassoon',
  'Horn',
  'Trumpet',
  'Trombone',
  'Timpani',
  'Piano',
  'Harp',
];

// Violin I, Violin II → Violin의 parts는 I, II
// Flute, Oboe, Clarinet, Bassoon → parts는 I, II
// Horn → parts는 I, II, III, IV
// Trumpet, Trombone → parts는 I, II, III
// Viola, V.Cello, C.Bass, Piano, Harp, Timpani → parts 없음
export const PART_OPTIONS_BY_INSTRUMENT: Record<string, string[]> = {
  'Violin': ['I', 'II'],
  'Flute': ['I', 'II'],
  'Oboe': ['I', 'II'],
  'Clarinet': ['I', 'II'],
  'Bassoon': ['I', 'II'],
  'Horn': ['I', 'II', 'III', 'IV'],
  'Trumpet': ['I', 'II', 'III'],
  'Trombone': ['I', 'II', 'III'],
};

export const ROLE_OPTIONS = [
  '악장',
  '수석',
  '부수석',
  '일반단원',
  '객원',
  '지휘자',
  '협연자',
  '편곡자',
];
