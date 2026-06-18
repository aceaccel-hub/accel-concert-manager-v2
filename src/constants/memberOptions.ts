// 악기/파트/역할 표준화 선택지
// 요구사항: 악기_파트_구분_수정_요청서.docx

export const INSTRUMENT_OPTIONS = [
  'Violin',
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
];

// 악기별 파트 옵션 (악기명과 동일한 파트를 기본값으로 사용)
export const PART_OPTIONS_BY_INSTRUMENT: Record<string, string[]> = {
  'Violin': ['Violin I', 'Violin II'],
  'Viola': ['Viola'],
  'V.Cello': ['V.Cello'],
  'C.Bass': ['C.Bass'],
  'Flute': ['Flute'],
  'Oboe': ['Oboe'],
  'Clarinet': ['Clarinet'],
  'Bassoon': ['Bassoon'],
  'Horn': ['Horn'],
  'Trumpet': ['Trumpet'],
  'Trombone': ['Trombone'],
  'Timpani': ['Timpani'],
  'Piano': ['Piano'],
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
