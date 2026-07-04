import type { Difficulty, Repertoire } from '../types';
import { parseFormattedNumber } from './calculations';

export type ImportedRepertoireInput = Omit<Repertoire, 'id' | 'createdAt'>;

export type ParsedRepertoireExcelRow = {
  key: string;
  sheetName: string;
  rowNumber: number;
  data: ImportedRepertoireInput;
  matchedFields: string[];
  warnings: string[];
};

type FieldKey = keyof ImportedRepertoireInput;

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  composer: [
    '작곡가',
    '작곡자',
    '작곡',
    'composer',
    'composer name',
    'author',
    'writer',
  ],
  title: [
    '곡명',
    '곡목',
    '작품명',
    '제목',
    '타이틀',
    '레퍼토리',
    'repertoire',
    'title',
    'piece',
    'work',
    'program',
  ],
  arrangement: ['편곡', '편곡자', 'arranger', 'arrangement', 'arranged by'],
  instrumentation: [
    '편성',
    '악기편성',
    '구성',
    'instrumentation',
    'orchestration',
    'ensemble',
    'instrument',
  ],
  duration: ['시간', '소요시간', '연주시간', '예상시간', '분', 'duration', 'time', 'minutes', 'min'],
  difficulty: ['난이도', '레벨', '수준', 'difficulty', 'level', 'grade'],
  scoreFile: ['악보', '악보파일', '파일', 'score', 'score file'],
  note: ['비고', '메모', '특이사항', '설명', 'note', 'memo', 'remark', 'comment'],
};

const OPTIONAL_FIELDS = new Set<FieldKey>([
  'arrangement',
  'instrumentation',
  'duration',
  'difficulty',
  'scoreFile',
  'note',
]);

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}_\-.:/\\|·,]/g, '');

const normalizedAliases = Object.entries(FIELD_ALIASES).reduce<Record<string, FieldKey>>(
  (acc, [field, aliases]) => {
    aliases.forEach((alias) => {
      acc[normalizeHeader(alias)] = field as FieldKey;
    });
    return acc;
  },
  {}
);

const valueToText = (value: unknown): string => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const hasValue = (value: unknown) => valueToText(value).length > 0;

const normalizeDuration = (value: unknown): number | undefined => {
  if (!hasValue(value)) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 && value < 1 ? Number((value * 24 * 60).toFixed(1)) : value;
  }

  const raw = valueToText(value);
  const timeParts = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (timeParts) {
    const first = Number(timeParts[1]);
    const second = Number(timeParts[2]);
    const third = timeParts[3] === undefined ? undefined : Number(timeParts[3]);
    const minutes = third === undefined ? first + second / 60 : first * 60 + second + third / 60;
    return Number(minutes.toFixed(1));
  }

  const parsed = parseFormattedNumber(raw.replace(/[^\d.,-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDifficulty = (value: unknown): Difficulty | undefined => {
  const raw = normalizeHeader(value);
  if (!raw) return undefined;
  if (raw.includes('초') || raw.includes('easy') || raw.includes('beginner') || raw === '1') {
    return '초급';
  }
  if (raw.includes('고') || raw.includes('hard') || raw.includes('advanced') || raw === '3') {
    return '고급';
  }
  return '중급';
};

const readField = (raw: Partial<Record<FieldKey, unknown>>, field: FieldKey) => raw[field];

const buildRepertoireInput = (
  raw: Partial<Record<FieldKey, unknown>>,
  warnings: string[]
): ImportedRepertoireInput | null => {
  const title = valueToText(readField(raw, 'title'));
  if (!title) return null;

  const composer = valueToText(readField(raw, 'composer')) || '작곡가 미상';
  if (composer === '작곡가 미상') warnings.push('작곡가 미상 처리');

  const data: ImportedRepertoireInput = {
    composer,
    title,
    arrangement: valueToText(readField(raw, 'arrangement')) || undefined,
    instrumentation: valueToText(readField(raw, 'instrumentation')) || undefined,
    duration: normalizeDuration(readField(raw, 'duration')),
    difficulty: normalizeDifficulty(readField(raw, 'difficulty')),
    scoreFile: valueToText(readField(raw, 'scoreFile')) || undefined,
    note: valueToText(readField(raw, 'note')) || undefined,
  };

  return data;
};

const detectHeader = (rows: unknown[][]) => {
  let best = { rowIndex: -1, score: 0, mapping: new Map<number, FieldKey>() };

  rows.slice(0, 30).forEach((row, rowIndex) => {
    const mapping = new Map<number, FieldKey>();
    row.forEach((cell, columnIndex) => {
      const field = normalizedAliases[normalizeHeader(cell)];
      if (field && !Array.from(mapping.values()).includes(field)) {
        mapping.set(columnIndex, field);
      }
    });

    let score = mapping.size;
    if (Array.from(mapping.values()).includes('title')) score += 5;
    if (Array.from(mapping.values()).includes('composer')) score += 3;
    if (score > best.score) best = { rowIndex, score, mapping };
  });

  return best.score >= 5 ? best : null;
};

const buildPositionalMapping = (row: unknown[]) => {
  const mapping = new Map<number, FieldKey>();
  const fields: FieldKey[] = [
    'composer',
    'title',
    'arrangement',
    'instrumentation',
    'duration',
    'difficulty',
    'note',
  ];
  row.forEach((_, index) => {
    const field = fields[index];
    if (field) mapping.set(index, field);
  });
  return mapping;
};

const rowToRaw = (row: unknown[], mapping: Map<number, FieldKey>) => {
  const raw: Partial<Record<FieldKey, unknown>> = {};
  mapping.forEach((field, columnIndex) => {
    if (!OPTIONAL_FIELDS.has(field) || hasValue(row[columnIndex])) {
      raw[field] = row[columnIndex];
    }
  });
  return raw;
};

export function parseRepertoireRowsFromSheets(
  sheets: { sheetName: string; rows: unknown[][] }[]
): ParsedRepertoireExcelRow[] {
  const parsed: ParsedRepertoireExcelRow[] = [];

  sheets.forEach(({ sheetName, rows }) => {
    const nonEmptyRows = rows.filter((row) => row.some(hasValue));
    if (nonEmptyRows.length === 0) return;

    const header = detectHeader(nonEmptyRows);
    const mapping = header?.mapping ?? buildPositionalMapping(nonEmptyRows[0]);
    const startIndex = header ? header.rowIndex + 1 : 0;

    nonEmptyRows.slice(startIndex).forEach((row, offset) => {
      const warnings: string[] = [];
      const raw = rowToRaw(row, mapping);
      const data = buildRepertoireInput(raw, warnings);
      if (!data) return;

      parsed.push({
        key: `${sheetName}-${startIndex + offset + 1}-${data.composer}-${data.title}`,
        sheetName,
        rowNumber: startIndex + offset + 1,
        data,
        matchedFields: Array.from(new Set(mapping.values())),
        warnings,
      });
    });
  });

  return parsed;
}

export function getRepertoireImportIdentity(
  repertoire: Pick<Repertoire, 'composer' | 'title'>
) {
  return `${normalizeHeader(repertoire.composer)}:${normalizeHeader(repertoire.title)}`;
}
