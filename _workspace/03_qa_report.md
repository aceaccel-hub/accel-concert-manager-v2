# QA 검증 보고서
날짜: 2026-05-28
대상: `/Users/shimwoorim/Desktop/아첼연주회관리프로그램/src/`
방법: 정적 분석 (소스코드 직독)

## 요약
- 통과(✅): 25개
- 실패(❌): 0개
- 주의(⚠️): 3개 (모두 기능적 한계/문서화 권고 수준)

전체 13개 금지 동작 + 15개 테스트 항목 모두 PRD 의도와 일치하는 구현이 확인되었다. 다만
(a) 곡별 연습 횟수 자동 집계 기능이 별도 함수가 아닌 `targetPieces` 텍스트 배열 표시만 지원,
(b) `MembersPage` 마스터에서 단원 삭제 시 dangling junction 행 발생,
(c) `deleteRehearsal` 시 출석률 즉시 재계산 미수행 — 이 세 가지는 PRD 위반은 아니지만 사용자 혼동 가능 항목.

---

## 13개 금지 동작 검증

| # | 항목 | 결과 | 위치 | 비고 |
|---|---|:---:|---|---|
| 1 | 연주회 상세에서 전체 곡목 DB 노출 금지 | ✅ | `ProgramTab.tsx:30` → `getProgramItems(concertId)` / `useProgram.ts:18-22` | `db.programItems.where('concertId').equals(concertId).toArray()`. concertId 없으면 `[]` 반환. `getAllRepertoire()` 는 곡 추가 모달의 "DB에서 선택" 모드에서만 사용. |
| 2 | 다른 연주회 단원 노출 금지 | ✅ | `MembersTab.tsx:39` → `getConcertMembers(concertId)` / `useMembers.ts:51-70` | `db.concertMembers.where('concertId').equals(concertId)` 로 필터. dangling junction 자동 제외. |
| 3 | 곡목 제거 시 repertoire DB 삭제 금지 | ✅ | `useProgram.ts:87-89` | `removeProgramItem` 은 `db.programItems.delete(id)` 만 호출. repertoire 미접근. UI(`ProgramTab.tsx:204`)도 "전체 곡목 DB에서는 삭제되지 않습니다" 명시. |
| 4 | 단원 제외 시 members DB 삭제 금지 | ✅ | `useMembers.ts:108-112` | `removeMemberFromConcert` 는 `db.concertMembers.delete` 만 호출. UI(`MembersTab.tsx:239`)도 동일 안내. |
| 5 | 예산 잔액 수동 입력 금지 | ✅ | `BudgetTab.tsx:396-405`, `BudgetPage.tsx:117`, `useBudget.ts:76-84` | 모달에 balance input 없음. 표시 전용 `calculatedBalance = plannedAmount - paidAmount`. 목록 표 헤더 "잔액 (자동)". `updateBudget` 에서 `balance` 키 sanitize. |
| 6 | 문서 다른 연주회와 혼재 금지 | ✅ | `useDocuments.ts:15-22` / `DocumentsTab.tsx:50-58` | `getDocuments(concertId)` 가 `where('concertId').equals(concertId)`. 문서 생성기도 모든 소스(`getProgramItems`, `getConcertMembers`, `getRehearsals`, `getBudgets`, `getConcertGroups`, `getChecklists`)에 `concertId` 전달. UI 푸터에 "현재 연주회 데이터만 사용해 생성됩니다" 명시. |
| 7 | 탭 이동 시 selectedConcertId 초기화 금지 | ✅ | `store.ts:65-68`, `ConcertDetail.tsx:54-58` | `partialize` 가 `selectedConcertId` 와 `settings` 만 보존, `currentPage/currentTab` 은 휘발성. `ConcertDetail` 의 `useEffect([concertId])` 가 URL→store 동기화. |
| 8 | 대시보드 카드 범위 불명확 금지 | ✅ | `Dashboard.tsx:131,138,144,151,184` | 상단 카드 4개에 `note="전체 기준"` 또는 `"선택 연주회 기준"` 명시. 선택 연주회 헤더에도 `<span>선택 연주회 기준</span>` 표시. |
| 9 | 설정 변경으로 데이터 구조 파괴 금지 | ✅ | `SettingsPage.tsx` 전반, `store.ts:43-45` | 설정 항목은 `baseYear`, `outputFormat`, `autoSaveInterval`, `backupCycle`, `maskResidentNumber`, `maskBankAccount` 만. 어느 setter도 `db.*` 스키마/데이터 변경 없음. (단 명시적 "전체 초기화" 버튼은 별도 확인 모달 후 `db.delete()`) |
| 10 | 자동 계산과 수동 입력 혼재 금지 | ✅ | `BudgetTab.tsx:396-405`, `useBudget.ts:25-36`, `calculations.ts:44-48` | balance 는 `calcBudgetBalance` 가 매번 파생, DB 미저장. 폼에서도 read-only 표시 박스로만 노출. |
| 11 | 같은 연주회 중복 곡 추가 경고 없이 추가 금지 | ✅ | `useProgram.ts:33-51`, `ProgramTab.tsx:283-292,167-181` | `(composer+title+movement)` trim+lowercase 비교 후 중복 시 `throw 'DUPLICATE_REPERTOIRE'`. UI 가 catch 후 전용 Modal 로 한국어 경고 표시. |
| 12 | 예비 단원과 정단원 혼재 금지 | ✅ | `MembersTab.tsx:36,72-76,106-119` | `reserveFilter` state(`전체/정단원/예비단원`) + 토글 버튼 UI. 표 행에 `opacity-60` + 예비/정 뱃지로 시각 구분. 파트별 집계도 `!m.isReserve` 카운트. |
| 13 | 개인정보 마스킹 설정 무시 금지 | ✅ | `MembersPage.tsx:175-185`, `calculations.ts:14-36`, `store.ts:43-44` | `settings.maskResidentNumber` / `settings.maskBankAccount` 가 활성이면 `maskResidentNumber()` / `maskBankAccount()` 호출, 비활성이면 원본 출력. default `true`. |

---

## 15개 테스트 항목 코드 검증

| # | 항목 | 결과 | 근거 |
|---|---|:---:|---|
| 1 | 연주회 A 선택 시 A의 곡목만 | ✅ | `useProgram.ts:18-22` `where('concertId').equals(concertId)` |
| 2 | 연주회 B 선택 시 B의 곡목만 | ✅ | 동일 함수, `[concertId]` 가 useEffect dep (`ProgramTab.tsx:36`) |
| 3 | 연주회 A의 단원 제외 → 전체 단원 DB 유지 | ✅ | `useMembers.ts:108-112` `removeMemberFromConcert` 가 `concertMembers` 만 삭제 |
| 4 | 곡 삭제 → 전체 곡목 DB 유지 | ✅ | `useProgram.ts:87-89` `removeProgramItem` 이 `programItems` 만 삭제 |
| 5 | 연습 출석 체크 → 단원 출석률 반영 | ✅ | `useRehearsals.ts:83-128` `recordAttendance` 가 upsert 후 `calcAttendanceRateInternal` 으로 재계산해 `db.concertMembers.update` |
| 6 | 곡별 연습 횟수 자동 집계 | ⚠️ | `targetPieces: string[]` 으로 저장만 됨. 곡별 횟수 집계 함수/UI 없음. 표시는 `RehearsalsTab.tsx:192`, `DocumentsTab.tsx:116` 의 텍스트 join 뿐. PRD 가 "집계" 까지 요구한다면 추가 구현 필요. |
| 7 | 예산 잔액 자동 계산 | ✅ | `useBudget.ts:27-36` `getBudgets` → `BudgetWithBalance`, `calculations.ts:44-48` `calcBudgetBalance` |
| 8 | 정산표 출력 시 해당 연주회 예산만 | ✅ | `DocumentsTab.tsx:55` `getBudgets(concertId)` 결과만 사용. 정산표 generator(`123-140`)가 그 결과로만 합산 |
| 9 | 문서 미리보기 → 현재 연주회 데이터 | ✅ | `DocumentsTab.tsx:51-58` 6개 소스 모두 `concertId` 전달. 헤더에 `concert.title/date/place` 사용 |
| 10 | 탭 이동 후 selectedConcertId 유지 | ✅ | `store.ts:65-68` partialize 에 `selectedConcertId` 포함, `currentTab` 은 휘발성 |
| 11 | 새로고침 후 선택 연주회 복원 | ✅ | `zustand/persist` + `localStorage` (`name: 'accel-concert-store'`). `Dashboard.tsx:52-55` 에서도 `selectedConcertId` 우선 사용 |
| 12 | 개인정보 마스킹 설정 적용 | ✅ | `MembersPage.tsx:173-186` 가 `settings.maskResidentNumber/maskBankAccount` 분기. default `true` |
| 13 | 백업 후 복원 시 데이터 정상 복원 | ✅ | `database.ts:118-229` `exportAllData`/`importAllData`. 13개 테이블 모두 clear → bulkAdd. version 체크(`INVALID_BACKUP_VERSION`). UI(`SettingsPage.tsx:42-64`) 에서 확인 다이얼로그 + reload |
| 14 | 중복 곡목 추가 시 경고 표시 | ✅ | `useProgram.ts:43-51` throw, `ProgramTab.tsx:283-292` catch → `onDuplicate` → 모달 (`167-181`) |
| 15 | 예비→정단원 전환 시 isReserve만 변경 | ✅ | `useMembers.ts:114-119` `toggleReserveStatus` 가 `db.concertMembers.update(id, { isReserve })` 만 수행 |

---

## 수정 필요 항목 (우선순위)

### P1 (기능 보강 권고)
1. **곡별 연습 횟수 자동 집계 (항목 6) — ⚠️**
   - 현황: `Rehearsal.targetPieces` 가 자유 문자열 배열로만 저장되며, "곡 X 가 몇 번 연습되었는지" 를 계산하는 함수가 부재.
   - 영향: 대시보드/문서/곡목 탭에서 곡별 연습 횟수를 조회할 수 없음. 표시도 join 된 텍스트뿐이라 곡명 표기 불일치 시 카운트 불가.
   - 제안:
     - 단기: `useRehearsals.ts` 에 `getRehearsalCountPerPiece(concertId): Promise<Record<string, number>>` 추가 (targetPieces 문자열 카운트).
     - 중기: `targetPieces` 를 `programItemId[]` 로 정규화하고 곡 추가/제거 시 자동 갱신. `ProgramTab` 에 "연습 횟수" 컬럼 노출.

### P2 (UX/일관성 권고)
2. **MembersPage 마스터 삭제 시 dangling junction (관련: 항목 4)** — 정보 표기 충실, 정책 위반은 아님
   - 현황: `MembersPage.tsx:52` `db.members.delete` 가 마스터를 삭제. `getConcertMembers` 가 dangling 자동 필터링하므로 표시는 정상이나, junction 행은 IndexedDB 에 남음.
   - 제안: 단원 마스터 삭제 시 cascade 로 모든 `concertMembers` junction 도 함께 정리하거나, 마스터 삭제 대신 `status='탈퇴'` 로 전환하도록 유도.

3. **deleteRehearsal 시 출석률 즉시 재계산 미수행 (관련: 항목 5)**
   - 현황: `useRehearsals.ts:63-68` 주석대로 출석률은 다음 `recordAttendance` 시 갱신. 그 사이 `concertMembers.attendanceRate` 가 stale.
   - 제안: 삭제된 연습에 출석 기록이 있던 단원들에 대해 `calcAttendanceRateInternal` 을 호출해 즉시 갱신.

### P3 (없음)
검증된 13개 금지 동작 모두 위반 사례 없음. 추가 즉시 수정 항목 없음.

---

## 참고 파일 경로
- 곡목: `/Users/shimwoorim/Desktop/아첼연주회관리프로그램/src/hooks/useProgram.ts`, `/src/components/concerts/tabs/ProgramTab.tsx`
- 단원: `/src/hooks/useMembers.ts`, `/src/components/concerts/tabs/MembersTab.tsx`, `/src/components/members/MembersPage.tsx`
- 예산: `/src/hooks/useBudget.ts`, `/src/components/concerts/tabs/BudgetTab.tsx`, `/src/components/budget/BudgetPage.tsx`, `/src/utils/calculations.ts`
- 문서: `/src/hooks/useDocuments.ts`, `/src/components/concerts/tabs/DocumentsTab.tsx`, `/src/components/documents/DocumentsPage.tsx`
- 연습/출석: `/src/hooks/useRehearsals.ts`, `/src/components/concerts/tabs/RehearsalsTab.tsx`
- 스토어/탭 영속화: `/src/store/store.ts`, `/src/components/concerts/ConcertDetail.tsx`
- 대시보드: `/src/components/dashboard/Dashboard.tsx`
- 설정/백업: `/src/components/settings/SettingsPage.tsx`, `/src/db/database.ts`
