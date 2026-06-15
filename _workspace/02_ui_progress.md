# 02. UI 레이어 구현 현황

작성자: concert-ui 에이전트
완료일: 2026-05-28
TypeScript 컴파일: 통과 (`npx tsc --noEmit -p tsconfig.app.json`, EXIT=0)
Vite 빌드: 통과 (`npx vite build`, 1788 modules, 539KB)

> 주의: 작업 시작 시 `_workspace/01_architect_routing.md`, `.claude/skills/concert-ui-guide/SKILL.md` 파일이 모두 존재하지 않았다. 따라서 사용자 작업 명세 + 참조 코드(`/Users/shimwoorim/Desktop/accel-concert-manager/`) + `_workspace/02_data_hooks.md` 의 import 가이드를 기준으로 구현했다.

---

## 생성/수정된 파일 목록 (총 27개)

### 진입 / 라우팅
| # | 경로 | 역할 |
|---|------|------|
| 1 | `vite.config.ts` | `@tailwindcss/vite` 플러그인 등록 |
| 2 | `src/index.css` | Tailwind 4 `@import` + 디자인 토큰 CSS 변수 + `@layer components` (card/btn-*/input/label/badge/tab/sidebar-item) |
| 3 | `src/main.tsx` | `createBrowserRouter` + `RouterProvider`. 모든 라우트(중첩 포함) 정의 |
| 4 | `src/App.tsx` | 전체 레이아웃 (Sidebar 220px + `<Outlet />`). `initSampleData` 1회 호출 |

### 공통/레이아웃
| 5 | `src/components/layout/Sidebar.tsx` | 220px 다크 네이비 사이드바, 9개 메뉴, `NavLink` active, 선택 연주회 표시 |
| 6 | `src/components/common/Modal.tsx` | 기본 `Modal` + `ConfirmModal` (확인/취소, ESC 닫기, 백드롭 클릭) |
| 7 | `src/components/common/StatusBadge.tsx` | ConcertStatus 5종 색상 매핑(기획중 gray / 준비중 blue / 진행중 green / 완료 purple / 취소 red) + 부가 상태 |
| 8 | `src/components/common/LoadingSpinner.tsx` | `Loader2` 회전 |
| 9 | `src/components/common/EmptyState.tsx` | 아이콘 + 제목 + 설명 + 액션 |

### 대시보드
| 10 | `src/components/dashboard/Dashboard.tsx` | 상단 4개 stat (settings.baseYear 기준), 연주회 선택 칩, 선택 연주회 상세 요약 4카드(곡목/단원/연습/예산) + "전체 보기" → `/concerts/:id/<tab>` 이동 |

### 연주회 목록 + 상세 (탭 라우팅)
| 11 | `src/components/concerts/ConcertList.tsx` | 좌(목록: 검색/연도/상태/단체 필터, MoreVertical 메뉴) + 우(상세 미리보기) + 새 연주회 / 삭제 확인 모달. 클릭 시 `setSelectedConcertId`, "상세 관리" → `/concerts/:id/basic` |
| 12 | `src/components/concerts/ConcertDetail.tsx` | URL `concertId` → store 동기화. 헤더(상태/날짜/장소/단원수/진행률) + 탭 9개 `NavLink` + `<Outlet context={concert,reload}>` |
| 13 | `src/components/concerts/ConcertForm.tsx` | 등록/편집 모달. 필수값 검증, `createConcert`/`updateConcert` 호출 |

### 연주회 상세 9개 탭
| 14 | `tabs/BasicInfoTab.tsx` | 기본 정보 표시 + 참여 단체 섹션 (편집은 상단 [편집] 버튼 안내) |
| 15 | `tabs/ProgramTab.tsx` | 곡목 테이블, 순서 변경 ↑↓, 추가/편집/제거. **DB에서 선택 vs 직접 입력 모드**. `DUPLICATE_REPERTOIRE` 캐치 → 중복 경고 모달. 제거 시 "전체 곡목 DB는 보존" 안내 |
| 16 | `tabs/MembersTab.tsx` | 단원 테이블, 파트별 집계 배지, 정/예비 토글, 출석률 표시, 사례비. **DB에서 불러오기** + **새 단원 추가** 두 진입. 제외 시 "전체 단원 DB 보존" 안내. 예비/정/전체 필터 |
| 17 | `tabs/GroupsTab.tsx` | 단체 카드 목록, 역할 배지, 추가/제거. `ALREADY_IN_CONCERT` 캐치 |
| 18 | `tabs/RehearsalsTab.tsx` | 예정/완료 분리. 추가/편집/삭제 + 출석 체크 모달(출/지/조/결 4상태, `recordAttendance` → 출석률 자동 갱신) |
| 19 | `tabs/BudgetTab.tsx` | 요약 3카드 + 계획대비 집행 그래프 + 전체/수입/지출 필터 + 테이블. **잔액은 자동 계산 표시 전용 (input 없음)**. 폼 안에서도 "잔액 자동 계산, DB 저장 안 함" 표시. `BudgetWithBalance.balance` 사용 |
| 20 | `tabs/DocumentsTab.tsx` | 좌측 7종 문서 유형 + 미리보기 + 복사/다운로드(.txt)/저장. 저장된 문서 목록 표시 + 삭제. 모든 데이터는 concertId 스코프 |
| 21 | `tabs/ChecklistTab.tsx` | 진행률 바 + 체크박스 토글(`toggleChecklist`) + 추가/삭제. 토글 후 부모 `reload` 호출로 헤더 진행률도 갱신 |
| 22 | `tabs/MemoTab.tsx` | 단일 메모(category='_default') 업서트. Ctrl/⌘+Enter 단축 저장. 마지막 수정일 표시 |

### 마스터 DB 페이지
| 23 | `src/components/repertoire/RepertoirePage.tsx` | 좌(검색/난이도 필터) + 우(상세) + 추가/편집/삭제 + **"연주회에 추가" 모달**(연주회 선택 → addProgramItem, 중복 캐치) |
| 24 | `src/components/members/MembersPage.tsx` | 좌(검색/파트/상태 필터) + 우(상세 마스킹 적용: settings.maskResidentNumber, maskBankAccount) + 추가/편집/삭제 + **"연주회에 추가"** |
| 25 | `src/components/groups/GroupsPage.tsx` | 좌(검색/상태) + 우(상세) + 추가/편집/삭제 + **"연주회에 연결"** (역할 선택 포함) |

### 운영 페이지
| 26 | `src/components/rehearsals/RehearsalsPage.tsx` | `선택 연주회` ↔ `전체` 토글. 예정/완료 분리. 카드 클릭 시 해당 연주회의 연습 탭으로 이동 |
| 27 | `src/components/budget/BudgetPage.tsx` | 연주회 선택 드롭다운 + 요약 3카드 + 테이블. 상세 편집은 "상세 편집" 버튼으로 BudgetTab 이동. 잔액은 `BudgetWithBalance.balance` 표시 전용 |
| 28 | `src/components/documents/DocumentsPage.tsx` | 연주회 카드 리스트 → 클릭 시 해당 연주회 문서 탭으로. 생성 가능 문서 안내 |
| 29 | `src/components/settings/SettingsPage.tsx` | 기본/개인정보/데이터 관리/시스템 정보 4섹션. `exportAllData`/`importAllData` 사용. 백업/복원/샘플시드/전체초기화. 기본값 복구. `INVALID_BACKUP_VERSION` 안내 |

---

## 라우팅 구조

```
/                                    → Dashboard
/concerts                            → ConcertList
/concerts/:concertId                 → ConcertDetail (헤더+탭바+Outlet)
  ├─ basic                            → BasicInfoTab
  ├─ program                          → ProgramTab
  ├─ members                          → MembersTab
  ├─ groups                           → GroupsTab
  ├─ rehearsals                       → RehearsalsTab
  ├─ budget                           → BudgetTab
  ├─ documents                        → DocumentsTab
  ├─ checklist                        → ChecklistTab
  └─ memo                             → MemoTab
/repertoire                          → RepertoirePage
/members                             → MembersPage
/groups                              → GroupsPage
/rehearsals                          → RehearsalsPage
/budget                              → BudgetPage
/documents                           → DocumentsPage
/settings                            → SettingsPage
```

URL의 `:concertId` 가 변경되면 `ConcertDetail` 의 `useEffect` 가 `setSelectedConcertId(concertId)` 를 호출해 store 와 동기화한다.

탭은 `NavLink end={false}` (기본) 로 `isActive` 자동 감지.

---

## 디자인 시스템 적용

- 사이드바: 220px 고정, `var(--sidebar-bg) #1a2744` 다크 네이비, 활성 메뉴 `#2d4a8a`
- 컨텐츠 배경: `var(--content-bg) #f0f4fa`
- 카드: `bg-white rounded-xl shadow-sm border border-gray-100` (`@layer components .card`)
- Primary 버튼: `#2563eb`, Accent: `#ebaf19`
- 상태 배지 (StatusBadge):
  - 기획중: gray-100/700
  - 준비중: blue-100/700
  - 진행중: green-100/700
  - 완료: purple-100/700
  - 취소: red-100/700
- Tailwind v4 `@tailwindcss/vite` 방식. `tailwind.config` 파일 없음. `@import "tailwindcss";` + `@layer components`로 유틸 클래스 정의

---

## 핵심 구현 규칙 준수 체크

| 규칙 | 준수 위치 | 비고 |
|------|-----------|------|
| 연주회 상세 탭은 항상 concertId 기반 필터 | 모든 `tabs/*.tsx` 가 `useOutletContext<ConcertTabContext>()` 로 받은 `concert.id` 를 hook 에 전달 (getProgramItems / getConcertMembers / getRehearsals / getBudgets / getDocuments / getChecklists / getMemos) | ✅ |
| 탭 이동 시 selectedConcertId 유지 | `ConcertDetail` useEffect 가 URL 파라미터를 store 에 동기화. Sidebar 가 store 의 `selectedConcertId` 를 읽어 표시 | ✅ |
| 예산 잔액 자동 계산 표시만 (input 금지) | `BudgetTab` 폼 안에 `calculatedBalance = plannedAmount - paidAmount` 표시 div (input 아님). 테이블은 `BudgetWithBalance.balance` 사용. `updateBudget` 도 balance 를 strip 함 | ✅ |
| 연주회/단체 삭제 확인 모달 필수 | `ConcertList` `deleteTarget`, `GroupsPage` `deleteTarget`, `MembersPage` `deleteTarget`, `RepertoirePage` `deleteTarget` 모두 Modal 통해 확인 | ✅ |
| 곡 중복 추가 경고 모달 필수 | `ProgramTab` 가 `DUPLICATE_REPERTOIRE` 에러 catch → `duplicateWarning` 모달 표시. `RepertoirePage` 의 "연주회에 추가" 도 동일 처리 | ✅ |
| 마스터 DB는 cascade 영향 받지 않음 | `removeProgramItem` / `removeMemberFromConcert` / `removeGroupFromConcert` 만 사용. 사용자에게 "전체 DB는 삭제되지 않습니다" 명시 | ✅ |

---

## 주요 사용 hook 매핑

| UI 컴포넌트 | 사용 hook |
|-------------|-----------|
| Dashboard | `getAllConcerts`, `getProgramItems`, `getConcertMembers`, `getRehearsals`, `getBudgets`, `getBudgetSummary`, `getChecklists` |
| ConcertList | `getAllConcerts`, `getAllGroups`, `deleteConcert` |
| ConcertDetail | `getConcertById`, `getConcertMembers`, `getChecklists` |
| ConcertForm | `getAllGroups`, `createConcert`, `updateConcert` |
| BasicInfoTab | `getConcertGroups` |
| ProgramTab | `getAllRepertoire`, `getProgramItems`, `addProgramItem`, `updateProgramItem`, `removeProgramItem` (순서 변경은 `db.programItems.update` 트랜잭션 직접 사용) |
| MembersTab | `getAllMembers`, `getConcertMembers`, `addMemberToConcert`, `removeMemberFromConcert`, `toggleReserveStatus`, `createMember` |
| GroupsTab | `getAllGroups`, `getConcertGroups`, `addGroupToConcert`, `removeGroupFromConcert` |
| RehearsalsTab | `getRehearsals`, `createRehearsal`, `updateRehearsal`, `deleteRehearsal`, `getAttendance`, `recordAttendance`, `getConcertMembers` |
| BudgetTab | `getBudgets`, `getBudgetSummary`, `createBudget`, `updateBudget`, `deleteBudget` |
| DocumentsTab | `getDocuments`, `createDocument`, `deleteDocument` + 모든 조회 hook (문서 생성용) |
| ChecklistTab | `getChecklists`, `toggleChecklist`, `createChecklist`, `deleteChecklist` |
| MemoTab | `getMemos`, `saveMemo` |
| RepertoirePage | `getAllRepertoire`, `createRepertoire`, `updateRepertoire`, `deleteRepertoire`, `addProgramItem`, `getAllConcerts` |
| MembersPage | `getAllMembers`, `createMember`, `updateMember`, `addMemberToConcert`, `getAllConcerts` + `db.members.delete` 직접 (마스터 삭제) |
| GroupsPage | `getAllGroups`, `createGroup`, `updateGroup`, `addGroupToConcert`, `getAllConcerts` + `db.groups.delete` |
| RehearsalsPage | `getAllConcerts`, `getRehearsals` + `db.rehearsals.toArray` (전체 스코프) |
| BudgetPage | `getAllConcerts`, `getBudgets`, `getBudgetSummary` |
| DocumentsPage | `getAllConcerts` |
| SettingsPage | `exportAllData`, `importAllData`, `initSampleData`, `db.delete()` |

---

## 검증

1. TypeScript: `npx tsc --noEmit -p tsconfig.app.json` → 통과 (EXIT=0)
2. Vite 빌드: `npx vite build` → 통과 (1788 모듈, 540KB JS, 34KB CSS, 빌드 시간 804ms)
3. ESLint: 33개 warning (React 19 신규 규칙 `react-hooks/set-state-in-effect` 와 `catch (e: any)` 패턴). 모두 컴파일/런타임에는 영향 없으며 데이터 로딩 / 에러 처리의 일반적 패턴.

---

## UI 측 주의사항 (사용자/후속 작업자)

- 모든 hook 함수는 순수 비동기 함수 → `useEffect` + `useState` 로 호출
- 예산 행은 `BudgetWithBalance.balance` (자동 계산, DB 미저장) 를 표시
- 단원/단체/곡목을 콘서트에서 "제거" 시 마스터 DB 영향 없음을 확인 모달에 명시
- 주민번호/계좌번호는 `settings.maskResidentNumber`/`settings.maskBankAccount` 에 따라 표시 시점 마스킹
- `selectedConcertId` 는 Zustand persist 로 새로고침 후에도 유지
- URL `/concerts/:concertId/<tab>` 이 진실의 원천. 직접 URL 입력 시 `ConcertDetail` 이 store 와 동기화함
- 새 연주회 등록 시 자동으로 기본 체크리스트 10개 생성 (`createConcert` 가 처리)
- 출석 기록 시 단원의 `attendanceRate` 자동 갱신 (`recordAttendance` 가 처리, UI 에서 별도 처리 불필요)
- 곡 중복 추가 시 `DUPLICATE_REPERTOIRE` 에러 → `ProgramTab` 과 `RepertoirePage` 가 모두 모달로 안내
