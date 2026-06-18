// 악기명 정규화 (화면 표시용)
export function normalizeInstrumentName(instrument: string | undefined): string {
  if (!instrument) return '';

  const value = String(instrument).trim().toLowerCase();

  const normalizationMap: Record<string, string> = {
    // V.Cello
    'cello': 'V.Cello',
    'v.cello': 'V.Cello',
    'vcello': 'V.Cello',
    'v cello': 'V.Cello',
    'violoncello': 'V.Cello',
    'violincello': 'V.Cello',

    // C.Bass
    'contrabass': 'C.Bass',
    'c.bass': 'C.Bass',
    'cbass': 'C.Bass',
    'double bass': 'C.Bass',

    // Violin I
    'violin 1': 'Violin I',
    'violin i': 'Violin I',
    '1st violin': 'Violin I',
    'first violin': 'Violin I',
    'v.1': 'Violin I',
    'vn.1': 'Violin I',

    // Violin II
    'violin 2': 'Violin II',
    'violin ii': 'Violin II',
    '2nd violin': 'Violin II',
    'second violin': 'Violin II',
    'v.2': 'Violin II',
    'vn.2': 'Violin II',

    // Viola
    'viola': 'Viola',
    'va': 'Viola',

    // Flute
    'flute': 'Flute',
    'fl': 'Flute',

    // Oboe
    'oboe': 'Oboe',
    'ob': 'Oboe',

    // Clarinet
    'clarinet': 'Clarinet',
    'cl': 'Clarinet',

    // Bassoon
    'bassoon': 'Bassoon',
    'bn': 'Bassoon',
    'fg': 'Bassoon',

    // Horn
    'horn': 'Horn',
    'hn': 'Horn',
    'cor': 'Horn',

    // Trumpet
    'trumpet': 'Trumpet',
    'tr': 'Trumpet',
    'tp': 'Trumpet',

    // Trombone
    'trombone': 'Trombone',
    'tb': 'Trombone',

    // Timpani
    'timpani': 'Timpani',
    'timp': 'Timpani',

    // Piano
    'piano': 'Piano',
    'pf': 'Piano',

    // Harp
    'harp': 'Harp',
    'hp': 'Harp',
  };

  // 카테고리명 제거
  if (
    [
      'string',
      'strings',
      'stringed',
      'woodwind',
      'brass',
      'percussion',
      'etc',
      'keyboard',
      '현악기',
      '목관',
      '금관',
      '타악기',
      '건반',
    ].includes(value)
  ) {
    return '';
  }

  return normalizationMap[value] || instrument;
}

// 악기 기본 정보 추출 (파트 결정용)
export function getInstrumentBase(instrument: string | undefined): string {
  const normalized = normalizeInstrumentName(instrument);

  // Violin I → Violin, Violin II → Violin
  if (normalized === 'Violin I' || normalized === 'Violin II') {
    return 'Violin';
  }

  // 파트가 없는 악기들
  if (['Viola', 'V.Cello', 'C.Bass', 'Piano', 'Harp', 'Timpani'].includes(normalized)) {
    return normalized;
  }

  return normalized;
}

// 기존 잘못 저장된 데이터 보정 (instrument가 Violin I/II인 경우)
export function normalizeMemberInstrumentPart(member: { instrument?: string; part?: string }): { instrument?: string; part?: string } {
  const normalized = normalizeInstrumentName(member.instrument);

  if (normalized === 'Violin I') {
    return {
      ...member,
      instrument: 'Violin',
      part: member.part || 'Violin I',
    };
  }

  if (normalized === 'Violin II') {
    return {
      ...member,
      instrument: 'Violin',
      part: member.part || 'Violin II',
    };
  }

  return member;
}
