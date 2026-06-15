# 02. 데이터 레이어 구현 현황

작성자: concert-data 에이전트
완료일: 2026-05-28
TypeScript 컴파일: ✅ 통과 (`npx tsc --noEmit -p tsconfig.app.json`)

> 주의: 작업 시작 시 `_workspace/01_architect_*.md` 와 `.claude/skills/concert-data-guide/SKILL.md`,
> `.claude/skills/concert-orchestrator/references/prd-core-rules.md` 파일이 모두 존재하지 않았다.
> 따라서 참조 코드(`/Users/shimwoorim/Desktop/accel-concert-manager/`) 의 구조와
> 사용자 작업 명세에 적힌 시그니처/규칙을 기준으로 구현했다.

---

## 생성된 파일 목록 (총 14개)

| # | 경로 | 역할 |
|---|------|------|
| 1 | `src/types/index.ts` | 전 도메인 타입 + Settings + BackupBundle |
| 2 | `src/db/database.ts` | Dexie 스키마, `db` 싱글턴, cascade 삭제, 백업/복원, 샘플 시드 |
| 3 | `src/store/store.ts` | Zustand persist 스토어 (selectedConcertId, settings) |
| 4 | `src/utils/calculations.ts` | mask/balance/duration/progress 계산 유틸 |
| 5 | `src/hooks/useConcert.ts` | 콘서트 CRUD + 기본 체크리스트 10개 자동 생성 + cascade 삭제 |
| 6 | `src/hooks/useProgram.ts` | 프로그램 아이템 CRUD + 중복 검사 + 총 연주시간 |
| 7 | `src/hooks/useRepertoire.ts` | 레퍼토리 마스터 CRUD |
| 8 | `src/hooks/useMembers.ts` | 단원 마스터 + 콘서트 단원 junction |
| 9 | `src/hooks/useGroups.ts` | 단체 마스터 + 콘서트 단체 junction |
| 10 | `src/hooks/useRehearsals.ts` | 연습 + 출석 upsert + 출석률 자동 갱신 |
| 11 | `src/hooks/useBudget.ts` | 예산 CRUD + balance 자동 계산 + 요약 |
| 12 | `src/hooks/useDocuments.ts` | 문서 CRUD |
| 13 | `src/hooks/useChecklists.ts` | 체크리스트 + 진행률 자동 갱신 |
| 14 | `src/hooks/useMemos.ts` | 메모 upsert (category 기반) |

> 새로 만든 디렉토리: `src/utils/`, `src/hooks/`, `_workspace/`.

---

## 각 훅의 핵심 구현 요약

### `useConcert.ts`
- `getAllConcerts()` → 연주일 내림차순 정렬
- `createConcert(data)` → 트랜잭션으로 콘서트 + 기본 체크리스트 10개 동시 생성
  - 기본 항목: 장소예약 / 곡목확정 / 악보준비 / 단원섭외 / 연습일정 / 포스터 / 프로그램북 / 홍보 / 리허설 / 정산
- `deleteConcert(id)` → `deleteConcertCascade()` 호출
  - junction(programItems, concertMembers, concertGroups, rehearsals, rehearsalAttendance, budgets, documents, checklists, memos) 만 삭제
  - **masters(members, repertoire, groups)는 절대 건드리지 않음**

### `useProgram.ts`
- `addProgramItem()` → 같은 콘서트 내 `(composer + title + movement)` 중복 시 `throw new Error('DUPLICATE_REPERTOIRE')`
- order 자동 계산 (기존 최대 + 1)
- `removeProgramItem()` → programItems 행만 삭제, repertoire 마스터 DB는 건드리지 않음
- `getTotalDuration()` → duration 합산 반환

### `useMembers.ts`
- `getConcertMembers()` → bulkGet 으로 마스터 join, dangling 행은 결과에서 제외
- `addMemberToConcert()` → `[concertId+memberId]` 인덱스로 중복 검사, 중복 시 `ALREADY_IN_CONCERT` throw
- `removeMemberFromConcert()` → concertMembers 행만 삭제, **members DB는 건드리지 않음**
- `toggleReserveStatus()` → 예비단원 ↔ 정단원 토글

### `useGroups.ts`
- 단원과 동일한 패턴. `removeGroupFromConcert()` 는 groups 마스터를 절대 삭제하지 않음.

### `useRehearsals.ts`
- `recordAttendance()` → `[rehearsalId+memberId]` upsert 후 그 단원의 `attendanceRate` 를 자동 재계산해 `concertMembers.attendanceRate` 에 저장
  - 출석률 = (`출석` + `지각`) / 전체 기록 × 100 (지각은 출석 인정, 결석/조퇴는 미출석)
- `deleteRehearsal()` → 트랜잭션으로 출석 기록까지 함께 정리

### `useBudget.ts`
- **`balance` 필드는 절대 DB에 저장하지 않음.** `getBudgets()` 가 매번 `plannedAmount - paidAmount` 로 계산해 `BudgetWithBalance` 형태로 반환
- `updateBudget()` 는 입력에 `balance` 가 있어도 strip 후 저장
- `getBudgetSummary()` → 수입/지출/잔액 (모두 `paidAmount` 기준 실집행 합계)

### `useChecklists.ts`
- 모든 변경(toggle/create/delete) 후 해당 콘서트의 `progressRate` 를 `완료 / 전체 × 100` 으로 자동 갱신
- `concerts.updatedAt` 도 함께 업데이트

### `useMemos.ts`
- `saveMemo(concertId, content, category?)` → `(concertId, category)` 기준 upsert
- `category` 미지정 시 `_default` 로 처리해 콘서트당 1개 메모로 동작

### `database.ts`
- 인덱스 추가: `[concertId+memberId]`, `[concertId+groupId]`, `[rehearsalId+memberId]` (upsert 성능)
- `exportAllData()` → BackupBundle (`version: 1`, exportedAt) 반환
- `importAllData(bundle)` → 전체 clear 후 bulkAdd. 트랜잭션 안에서 13개 테이블 처리. `version !== 1` 이면 `INVALID_BACKUP_VERSION` throw

### `store.ts`
- `selectedConcertId` 와 `settings` 만 `persist.partialize` 로 영속화
- `currentPage` / `currentTab` 은 휘발성
- `resetSettings()` 추가 (기본값 복구)
- `MenuPage` 타입 export 함

### `calculations.ts`
- `maskResidentNumber(num)` → `######-1******` (성별 첫 자리만 노출)
- `maskBankAccount(acc)` → 앞 3 + 중간 마스킹 + 뒤 2
- `calcBudgetBalance(p, x)` → 음수/NaN 안전 처리
- `formatDuration(min)` → `"0분"` / `"X분"` / `"X시간"` / `"X시간 Y분"`
- `calcProgressRate(done, total)` → 0~100 정수, total ≤ 0 시 0

---

## 핵심 규칙 준수 체크

| 규칙 | 준수 위치 | 비고 |
|------|----------|------|
| concertId 없이 junction 전체 조회 금지 | 모든 hook 의 getter 가 첫 줄에서 concertId 검사 후 `.where('concertId').equals(...)` | ✅ |
| removeProgramItem → repertoire DB 삭제 금지 | `useProgram.removeProgramItem` 은 `db.programItems.delete(id)` 만 호출 | ✅ |
| removeMemberFromConcert → members DB 삭제 금지 | `useMembers.removeMemberFromConcert` 는 `db.concertMembers.delete(id)` 만 | ✅ |
| 예산 balance DB 저장 금지 | `useBudget.updateBudget` 가 `balance` 키 strip, 타입 정의에서 `Budget` 에는 `balance` 없음 | ✅ |
| deleteConcert → masters 삭제 금지 | `deleteConcertCascade` 가 9개 junction 만 처리하고 members/repertoire/groups 는 미접근 | ✅ |

---

## concert-ui 에이전트용 import 경로 가이드

### 타입
```ts
import type {
  Concert, ConcertStatus,
  Repertoire,
  ProgramItem, ScoreStatus,
  Member, MemberRole, MemberGrade, MemberStatus,
  ConcertMember,
  Group, GroupRole, GroupStatus,
  ConcertGroup,
  Rehearsal, RehearsalType,
  RehearsalAttendance, AttendanceStatus,
  Budget, BudgetWithBalance, BudgetType, PaymentStatus,
  ConcertDocument, DocumentType,
  Checklist,
  Memo,
  Settings,
  BackupBundle,
} from './types';
```

### DB / 백업
```ts
import { db, initSampleData, exportAllData, importAllData, deleteConcertCascade } from './db/database';
```

### Zustand 스토어
```ts
import { useStore, type MenuPage } from './store/store';
const { selectedConcertId, setSelectedConcertId, currentPage, setCurrentPage, currentTab, setCurrentTab, settings, updateSettings } = useStore();
```

### 계산 유틸
```ts
import {
  maskResidentNumber, maskBankAccount,
  calcBudgetBalance, formatDuration, calcProgressRate,
} from './utils/calculations';
```

### 훅 (모두 named export, async 함수)
```ts
import * as ConcertAPI from './hooks/useConcert';
import * as ProgramAPI from './hooks/useProgram';
import * as RepertoireAPI from './hooks/useRepertoire';
import * as MembersAPI from './hooks/useMembers';
import * as GroupsAPI from './hooks/useGroups';
import * as RehearsalsAPI from './hooks/useRehearsals';
import * as BudgetAPI from './hooks/useBudget';
import * as DocumentsAPI from './hooks/useDocuments';
import * as ChecklistsAPI from './hooks/useChecklists';
import * as MemosAPI from './hooks/useMemos';
```

또는 함수별 직접 import:
```ts
import { getAllConcerts, createConcert, updateConcert, deleteConcert, getConcertById } from './hooks/useConcert';
import { getProgramItems, addProgramItem, updateProgramItem, removeProgramItem, getTotalDuration } from './hooks/useProgram';
import { getAllRepertoire, createRepertoire, updateRepertoire, deleteRepertoire, getRepertoireById } from './hooks/useRepertoire';
import { getAllMembers, getConcertMembers, addMemberToConcert, removeMemberFromConcert, toggleReserveStatus, createMember, updateMember } from './hooks/useMembers';
import { getAllGroups, getConcertGroups, addGroupToConcert, removeGroupFromConcert, createGroup, updateGroup } from './hooks/useGroups';
import { getRehearsals, createRehearsal, updateRehearsal, deleteRehearsal, getAttendance, recordAttendance, getAttendanceRate } from './hooks/useRehearsals';
import { getBudgets, getBudgetSummary, createBudget, updateBudget, deleteBudget, type BudgetSummary } from './hooks/useBudget';
import { getDocuments, createDocument, deleteDocument } from './hooks/useDocuments';
import { getChecklists, toggleChecklist, createChecklist, deleteChecklist } from './hooks/useChecklists';
import { getMemos, saveMemo, deleteMemo } from './hooks/useMemos';
```

### 앱 초기화 패턴 (main.tsx 또는 App.tsx)
```ts
import { useEffect } from 'react';
import { initSampleData } from './db/database';

useEffect(() => {
  initSampleData(); // 비어 있을 때만 시드 1회
}, []);
```

### UI 측 주의사항
- 모든 hook 함수는 **순수 비동기 함수** (React hook 이 아님). 컴포넌트 안에서는 `useEffect` 또는 `useState + 비동기 fetch 패턴` 으로 호출하라.
- 예산 행을 화면에 그릴 때는 `BudgetWithBalance.balance` 를 그대로 사용 (DB 저장본 X, 계산본 O).
- 단원/단체/곡목을 콘서트에서 "제거" 할 때 마스터 DB 영향이 없음을 사용자에게 명확히 알릴 것.
- 마스킹은 `settings.maskResidentNumber` / `settings.maskBankAccount` 에 따라 표시 시점에만 적용.
- 출석 기록 시 `concertMembers.attendanceRate` 가 자동 갱신되므로, 화면에서 별도 계산할 필요 없음 (다만 `getAttendanceRate(memberId, concertId)` 로 즉시 조회도 가능).
