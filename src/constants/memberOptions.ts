// 악기/파트/역할 표준화 선택지
// 엑셀 기준: 악보보관현황표(개별)

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

export const PART_OPTIONS_BY_INSTRUMENT: Record<string, string[]> = {
  'Violin I': ['I'],
  'Violin II': ['II'],
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
];
