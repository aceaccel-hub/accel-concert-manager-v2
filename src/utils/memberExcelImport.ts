import type { Member, MemberGrade, MemberRole, MemberStatus } from '../types';
import { ROLE_OPTIONS } from '../constants/memberOptions';
import { normalizeInstrumentPartSelection } from './normalization';
import { parseFormattedNumber } from './calculations';

export type ImportedMemberInput = Omit<Member, 'id' | 'createdAt'>;

export type ParsedMemberExcelRow = {
  key: string;
  sheetName: string;
  rowNumber: number;
  data: ImportedMemberInput;
  matchedFields: string[];
  warnings: string[];
};

type FieldKey = keyof ImportedMemberInput;

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  name: ['이름', '성명', '성함', '단원명', '연주자', '연주자명', '출연자', '출연자명', 'name', 'member', 'musician', 'player'],
  instrument: ['악기', '악기명', '파트악기', 'instrument', 'inst', 'section'],
  part: ['파트', '세부파트', '파트명', 'part', 'position part'],
  role: ['역할', '직책', '포지션', '구분', 'role', 'position'],
  phone: ['연락처', '전화', '전화번호', '휴대폰', '핸드폰', '핸드폰번호', 'phone', 'mobile', 'tel'],
  email: ['이메일', '메일', 'email', 'e-mail', 'mail'],
  residentNumber: ['주민등록번호', '주민번호', '등록번호', '외국인등록번호', '여권번호', '생년월일', 'id', 'id number', 'resident number'],
  idNumberType: ['신분증유형', '신분증 유형', '증빙유형', 'id type'],
  nationality: ['국적', 'nationality', 'country'],
  address: ['주소', '거주지', 'address'],
  incomeType: ['소득구분', '소득 유형', '소득유형', 'income type'],
  bankName: ['은행', '은행명', 'bank', 'bank name'],
  bankAccount: ['계좌', '계좌번호', '입금계좌', 'account', 'account number', 'bank account'],
  accountHolder: ['예금주', '예금주명', '계좌주', 'account holder'],
  accountHolderRelation: ['예금주관계', '예금주와의관계', '관계', 'account relation'],
  baseFee: ['사례비', '출연료', '페이', '금액', '지급액', '기본사례비', 'fee', 'pay', 'amount', 'payment'],
  grade: ['등급', '단원등급', '회원등급', 'grade'],
  abilityGrade: ['실력등급', '능력등급', '평가등급', 'ability', 'ability grade'],
  status: ['상태', '활동상태', 'status'],
  joinDate: ['가입일', '입단일', '등록일', 'join date', 'joined', 'date'],
  note: ['비고', '메모', '특이사항', 'note', 'memo', 'remark'],
};

const OPTIONAL_FIELDS = new Set<FieldKey>([
  'phone',
  'email',
  'residentNumber',
  'idNumberType',
  'nationality',
  'address',
  'incomeType',
  'bankName',
  'bankAccount',
  'accountHolder',
  'accountHolderRelation',
  'baseFee',
  'grade',
  'abilityGrade',
  'status',
  'joinDate',
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

const normalizeMoney = (value: unknown): number | undefined => {
  if (!hasValue(value)) return undefined;
  const parsed = typeof value === 'number' ? value : parseFormattedNumber(valueToText(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDate = (value: unknown): string | undefined => {
  if (!hasValue(value)) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }

  const raw = valueToText(value).replace(/[.]/g, '-').replace(/\s+/g, '');
  const ymd = raw.match(/^(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return raw;
};

const normalizeRole = (value: unknown): MemberRole => {
  const raw = valueToText(value);
  const compact = normalizeHeader(raw);
  const found =
    ROLE_OPTIONS.find((role) => normalizeHeader(role) === compact || compact.includes(normalizeHeader(role))) ||
    (compact.includes('concertmaster') ? '악장' : '') ||
    (compact.includes('principal') ? '수석' : '') ||
    (compact.includes('assistant') ? '부수석' : '') ||
    (compact.includes('guest') ? '객원' : '') ||
    (compact.includes('conductor') ? '지휘자' : '') ||
    (compact.includes('solo') ? '협연자' : '');
  return (found || '일반단원') as MemberRole;
};

const normalizeGrade = (value: unknown): MemberGrade => {
  const raw = valueToText(value);
  if (raw.includes('준')) return '준단원';
  if (raw.includes('객')) return '객원';
  return '정단원';
};

const normalizeStatus = (value: unknown): MemberStatus => {
  const raw = valueToText(value);
  if (raw.includes('휴')) return '휴식중';
  if (raw.includes('탈') || raw.includes('중지')) return '탈퇴';
  return '활동중';
};

const normalizeIncomeType = (value: unknown): '사업소득' | '기타소득' | undefined => {
  const raw = valueToText(value);
  if (!raw) return undefined;
  return raw.includes('기타') ? '기타소득' : '사업소득';
};

const normalizeIdNumberType = (value: unknown): ImportedMemberInput['idNumberType'] => {
  const raw = valueToText(value);
  if (!raw) return undefined;
  if (raw.includes('외국')) return '외국인등록번호';
  if (raw.includes('여권')) return '여권번호';
  return '주민등록번호';
};

const readField = (raw: Partial<Record<FieldKey, unknown>>, field: FieldKey) => raw[field];

const buildMemberInput = (raw: Partial<Record<FieldKey, unknown>>, warnings: string[]): ImportedMemberInput | null => {
  const name = valueToText(readField(raw, 'name'));
  if (!name) return null;

  const normalized = normalizeInstrumentPartSelection(
    valueToText(readField(raw, 'instrument')),
    valueToText(readField(raw, 'part'))
  );

  const baseFee = normalizeMoney(readField(raw, 'baseFee'));
  const data: ImportedMemberInput = {
    name,
    instrument: normalized.instrument,
    part: normalized.part,
    role: normalizeRole(readField(raw, 'role')),
    phone: valueToText(readField(raw, 'phone')) || undefined,
    email: valueToText(readField(raw, 'email')) || undefined,
    residentNumber: valueToText(readField(raw, 'residentNumber')) || undefined,
    idNumberType: normalizeIdNumberType(readField(raw, 'idNumberType')),
    nationality: valueToText(readField(raw, 'nationality')) || undefined,
    address: valueToText(readField(raw, 'address')) || undefined,
    incomeType: normalizeIncomeType(readField(raw, 'incomeType')),
    bankName: valueToText(readField(raw, 'bankName')) || undefined,
    bankAccount: valueToText(readField(raw, 'bankAccount')) || undefined,
    accountHolder: valueToText(readField(raw, 'accountHolder')) || undefined,
    accountHolderRelation: valueToText(readField(raw, 'accountHolderRelation')) || undefined,
    baseFee,
    grade: normalizeGrade(readField(raw, 'grade')),
    abilityGrade: valueToText(readField(raw, 'abilityGrade')).toUpperCase().match(/^[ABC]$/)?.[0] as 'A' | 'B' | 'C' | undefined,
    status: normalizeStatus(readField(raw, 'status')),
    joinDate: normalizeDate(readField(raw, 'joinDate')),
    note: valueToText(readField(raw, 'note')) || undefined,
  };

  if (!data.instrument) warnings.push('악기 미인식');
  if (!data.part) warnings.push('파트 미인식');
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
    if (Array.from(mapping.values()).includes('name')) score += 5;
    if (Array.from(mapping.values()).includes('instrument')) score += 2;
    if (Array.from(mapping.values()).includes('part')) score += 2;
    if (score > best.score) best = { rowIndex, score, mapping };
  });

  return best.score >= 6 ? best : null;
};

const buildPositionalMapping = (row: unknown[]) => {
  const mapping = new Map<number, FieldKey>();
  const fields: FieldKey[] = ['name', 'instrument', 'part', 'role', 'phone', 'baseFee', 'residentNumber', 'bankName', 'bankAccount'];
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

export function parseMemberRowsFromSheets(sheets: { sheetName: string; rows: unknown[][] }[]): ParsedMemberExcelRow[] {
  const parsed: ParsedMemberExcelRow[] = [];

  sheets.forEach(({ sheetName, rows }) => {
    const nonEmptyRows = rows.filter((row) => row.some(hasValue));
    if (nonEmptyRows.length === 0) return;

    const header = detectHeader(nonEmptyRows);
    const mapping = header?.mapping ?? buildPositionalMapping(nonEmptyRows[0]);
    const startIndex = header ? header.rowIndex + 1 : 0;

    nonEmptyRows.slice(startIndex).forEach((row, offset) => {
      const warnings: string[] = [];
      const raw = rowToRaw(row, mapping);
      const data = buildMemberInput(raw, warnings);
      if (!data) return;

      parsed.push({
        key: `${sheetName}-${startIndex + offset + 1}-${data.name}`,
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

export function getMemberImportIdentity(member: Pick<Member, 'name' | 'phone' | 'residentNumber'>) {
  if (member.residentNumber) return `id:${normalizeHeader(member.residentNumber)}`;
  if (member.phone) return `name-phone:${normalizeHeader(member.name)}:${normalizeHeader(member.phone)}`;
  return `name:${normalizeHeader(member.name)}`;
}
