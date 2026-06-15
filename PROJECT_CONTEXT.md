# 아첼 연주회 관리 프로그램 - 프로젝트 컨텍스트

## 📋 프로젝트 개요

**프로젝트명**: 아첼 연주회 관리 프로그램
**설명**: 음악 단체의 연주회 개최, 단원 관리, 예산 관리, 리허설 일정 관리 등을 지원하는 종합 관리 애플리케이션
**버전**: 0.0.1
**상태**: 개발 중 (웹 모드 + Electron 데스크톱 모드 지원)

---

## 🛠 기술 스택

### 프론트엔드
- **React** 19.2.6 (UI 프레임워크)
- **TypeScript** ~6.0.2 (타입 안정성)
- **Vite** 8.0.12 (빌드 도구, 개발 서버)
- **React Router DOM** 7.15.1 (라우팅)
- **TailwindCSS** 4.3.0 (스타일링)
- **Zustand** 5.0.13 (상태 관리)

### 데이터베이스
- **Dexie** 4.4.3 (IndexedDB 래퍼)
- **IndexedDB** (브라우저 로컬 저장소)

### 데스크톱
- **Electron** 42.4.0 (데스크톱 앱)
- **electron-builder** 26.15.3 (Windows 빌드 및 설치 프로그램)

### 문서 생성
- **jsPDF** 4.2.1 (PDF 생성)
- **DOCX** 9.7.1 (Word 문서)
- **XLSX** 0.18.5 + **xlsx-js-style** 1.2.0 (Excel)

### UI 컴포넌트 라이브러리
- **Heroicons** 2.2.0 (아이콘)
- **Lucide React** 1.16.0 (추가 아이콘)
- **React Hot Toast** 2.6.0 (토스트 알림)

### 드래그 & 드롭
- **@dnd-kit** (6.3.1 core, 10.0.0 sortable, 3.2.2 utilities)

### 유틸리티
- **date-fns** 4.3.0 (날짜 처리)

---

## 🚀 현재 상태

### 실행 환경
**개발 서버**: 실행 중 🟢
- **URL**: http://localhost:5175/
- **포트**: 5175 (strictPort: true)
- **상태**: 정상 작동

### 최근 커밋
1. `2362d2bf` - fix: Electron 빌드 오류 수정 (ES modules 지원, 파일 경로 개선)
2. `78ae0778` - chore: Electron 빌드 워크플로우 올바른 위치로 이동
3. `a4b53310` - chore: Electron 빌드 워크플로우 이름 변경
4. `68301f33` - feat: Electron 데스크톱 앱 및 자동 빌드 설정 추가
5. `fbae3c27` - chore: GitHub Pages 배포 설정 추가

### 현재 수정된 파일
```
M electron-main.js         (Electron 메인 프로세스)
M src/components/settings/SettingsPage.tsx   (설정 페이지)
M src/db/database.ts       (Dexie 데이터베이스)
M vite.config.ts           (Vite 설정)
M package-lock.json        (의존성 lock)
```

### 현재 경고 메시지
1. **HTML 구조 문제**: `<table> cannot contain a nested <div>` (ProgramTab)
   - DnD Kit이 table 내부에 div를 생성하는 접근성 요소 추가
   - 기능에는 영향 없음, 수정 권장

2. **브라우저 호환성**: Module "stream" has been externalized
   - IndexedDB 또는 특정 라이브러리가 Node.js stream 모듈 참조
   - 브라우저에서는 필요 없는 경고

---

## 📁 디렉토리 구조

```
/Users/shimwoorim/Desktop/아첼연주회관리프로그램/
├── src/
│   ├── components/
│   │   ├── concerts/           # 연주회 관리
│   │   │   ├── ConcertList.tsx
│   │   │   ├── ConcertDetail.tsx
│   │   │   ├── ConcertForm.tsx
│   │   │   └── tabs/           # 연주회 탭들
│   │   │       ├── BasicInfoTab.tsx      (기본정보)
│   │   │       ├── ProgramTab.tsx        (공연곡목)
│   │   │       ├── MembersTab.tsx        (참가자)
│   │   │       ├── GroupsTab.tsx         (단체)
│   │   │       ├── RehearsalsTab.tsx     (리허설)
│   │   │       ├── BudgetTab.tsx         (예산)
│   │   │       ├── DocumentsTab.tsx      (문서)
│   │   │       ├── ChecklistTab.tsx      (체크리스트)
│   │   │       └── MemoTab.tsx           (메모)
│   │   ├── members/            # 단원 관리
│   │   ├── groups/             # 단체 관리
│   │   ├── rehearsals/         # 리허설 관리
│   │   ├── budget/             # 예산 관리
│   │   ├── documents/          # 문서 관리
│   │   ├── repertoire/         # 레퍼토리 관리
│   │   ├── settings/           # 설정
│   │   ├── dashboard/          # 대시보드
│   │   ├── common/             # 공통 컴포넌트
│   │   │   ├── Combobox.tsx         (콤보박스 - DB 연동)
│   │   │   ├── SmartInput.tsx       (스마트 입력 필드)
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── layout/
│   │       └── Sidebar.tsx     (사이드바 네비게이션)
│   ├── db/
│   │   ├── database.ts         # Dexie 스키마 정의
│   │   └── seedData.ts         # 초기 데이터
│   ├── hooks/                  # 커스텀 훅 (데이터 조회/조작)
│   │   ├── useConcert.ts
│   │   ├── useMembers.ts
│   │   ├── useProgram.ts
│   │   ├── useMasterItems.ts   # 마스터 아이템 관리
│   │   └── 기타 도메인별 훅...
│   ├── store/
│   │   └── store.ts            # Zustand 전역 상태
│   ├── types/
│   │   └── index.ts            # 모든 엔티티 타입 정의
│   ├── utils/
│   │   └── calculations.ts     # 계산 유틸리티
│   ├── main.tsx                # React 진입점
│   └── App.tsx                 # 라우팅 설정
├── electron-main.js            # Electron 메인 프로세스
├── preload.js                  # Electron preload (있으면)
├── vite.config.ts              # Vite 설정
├── tsconfig.json               # TypeScript 설정
├── package.json                # 의존성 + 빌드 스크립트
├── vercel.json                 # Vercel 배포 설정
└── dist/                       # 빌드 출력
```

---

## 🔧 핵심 파일 설명

### 1. `src/types/index.ts` - 도메인 모델

**역할**: 모든 엔티티 인터페이스 정의

**주요 엔티티**:
- **Master Entities** (마스터 데이터 - 여러 연주회에서 재사용)
  - `Concert` - 연주회
  - `Repertoire` - 곡목
  - `Member` - 단원
  - `Group` - 단체 (주최/주관/후원 등)
  - `MasterItem` - 악기, 파트, 역할, 작곡가 등 메타데이터

- **Junction Entities** (연주회별 연결 데이터 - concertId 필수)
  - `ProgramItem` - 공연 곡목 (연주회 + 곡목 연계)
  - `ConcertMember` - 참가자 (연주회 + 단원 + 역할/파트)
  - `ConcertGroup` - 단체 역할 (연주회 + 단체 + 역할)
  - `Rehearsal` - 리허설
  - `RehearsalAttendance` - 리허설 참석
  - `Budget` - 예산
  - `ConcertDocument` - 문서
  - `Checklist` - 체크리스트
  - `Memo` - 메모

**핵심 설계 원칙**:
```
Masters (concerts, repertoire, members, groups)
  ↓
  └─ Junction Tables (concertId 포함)
     = 각 연주회별 연계 데이터만 보관
     = masters는 절대 중복 저장 금지
     = 연주회 삭제 시 junction만 제거, masters는 보존
```

### 2. `src/db/database.ts` - Dexie 스키마

**역할**: IndexedDB 스키마 정의 및 데이터베이스 유틸리티

**스키마 버전**:
- **Version 1**: 기본 테이블들
- **Version 2**: `masterItems` 테이블 추가

**핵심 메서드**:
- `deleteConcertCascade(concertId)` - 연주회 삭제 (Junction 데이터만 제거)

**인덱싱 전략**:
```typescript
concerts:              'id, status, groupId, date'
concertMembers:       'id, concertId, memberId, [concertId+memberId]'
rehearsals:           'id, concertId, date'
budgets:              'id, concertId, type'
programItems:         'id, concertId, order, repertoireId'
// 모든 junction은 concertId 인덱싱 → 빠른 조회
```

### 3. `vite.config.ts` - Vite 설정

**주요 설정**:
```typescript
port: 5175           // 개발 서버 포트
strictPort: true     // 포트 자동 변경 안함
hmr:                 // Hot Module Replacement
  protocol: 'ws'
  host: 'localhost'
  port: 5175
```

**빌드 설정**:
- `outDir: 'dist'` - Electron과 호환
- `emptyOutDir: true` - 빌드 시마다 초기화
- `sourcemap: false` - 프로덕션 빌드 최적화

### 4. `electron-main.js` - Electron 데스크톱 앱

**역할**: 데스크톱 앱 윈도우 생성 및 관리

**핵심 기능**:
- ES modules 지원 (`import`/`export`)
- 개발 모드: `http://localhost:5175` 연결
- 프로덕션 모드: `dist/index.html` 로컬 파일 로드
- 개발 중에는 DevTools 자동 열기
- 윈도우 크기: 1400x900 (최소 1000x700)

**보안 설정**:
- `nodeIntegration: false`
- `contextIsolation: true`
- `preload.js` 사용 (선택적)

---

## 📦 핵심 기능

### 1. 연주회 관리 (`concerts/`)
- 연주회 생성/수정/삭제
- 기본정보: 제목, 날짜, 시간, 장소, 지휘자 등
- 진행률 자동 계산 (체크리스트 기반)
- 상태 관리: 기획중 → 준비중 → 진행중 → 완료/취소

### 2. 공연 곡목 관리 (`ProgramTab`)
- 곡목 추가/편집/삭제/순서 변경 (드래그)
- 악보 상태 추적 (준비완료/준비중/미준비)
- 파트별 악보 상태 및 담당자 지정
- ⚠️ **HTML 구조 문제**: DnD Kit과 `<table>` 충돌 (접근성 div 생성)

### 3. 단원 관리 (`members/`)
- 마스터 단원 관리 (악기, 파트, 역할)
- 개인정보 (연락처, 주민등록번호, 은행 정보)
- 활동 상태 (활동중/휴식중/탈퇴)
- 성과 평가 (정단원/준단원/객원)

### 4. 연주회별 참가자 (`MembersTab`)
- 단원을 연주회에 배정
- 역할/파트 설정 (마스터와 별도 가능)
- 출연비 관리 (기본비, 추가비, 공제)
- 리허설 참석 관리

### 5. 예산 관리 (`BudgetTab`, `budget/`)
- 수입/지출 항목 등록
- 계획액 vs 실제비 추적
- 지불 상태 관리 (예정/완료/취소)
- Balance 자동 계산

### 6. 리허설 관리 (`RehearsalsTab`)
- 리허설 일정 (날짜, 시간, 장소)
- 유형 (섹션/합주/드레스/기타)
- 참가자 출석 관리
- 진행 상황 메모

### 7. 문서 생성
- **Word/PDF/Excel 지원**
- 곡목표, 단원명단, 정산표, 공지문 등
- 템플릿 기반 자동 생성

### 8. 체크리스트
- 연주회별 준비 사항 추적
- 진행률 자동 계산
- 상태: 완료/미완료

---

## 🔌 API/Hook 구조

### 커스텀 훅 예시
```typescript
// 데이터 조회/조작 로직 캡슐화
const { concerts, loading, createConcert, updateConcert, deleteConcert } = useConcert();
const { members, addMember, updateMember } = useMembers();
const { programItems, addProgram, updateProgram } = useProgram();
```

### 상태 관리 (Zustand)
```typescript
// store.ts에서 전역 상태 관리
// - UI 상태 (선택된 항목, 모달 열림/닫힘)
// - 필터링 상태
```

---

## 🗄️ 데이터 구조 예시

### Master vs Junction 분리
```typescript
// ❌ 나쁜 구조: 각 연주회마다 모든 단원을 복사
concerts[1].members = [Member1, Member2, Member3]  // 중복!

// ✅ 좋은 구조: 연주회와 단원을 별도로 관리
members[1] = { id: 'm1', name: '홍길동', ... }
concertMembers[1] = { id: 'cm1', concertId: 'c1', memberId: 'm1', part: '제1바이올린' }
```

### Cascade Delete 원칙
```typescript
// 연주회 c1 삭제 시
deleteConcertCascade('c1')
  → ❌ 제거: concertMembers, programItems, budgets 등 (c1 포함 records)
  → ✅ 보존: members, repertoire, groups (다른 연주회에서 사용 가능)
```

---

## 🚀 실행 명령어

### 개발
```bash
npm run dev              # Vite 웹 개발 서버 시작 (localhost:5175)
npm run electron-dev    # Electron 데스크톱 앱 시작
```

### 빌드
```bash
npm run build           # 웹 번들 생성 (dist/)
npm run electron-build  # Windows 설치 프로그램 생성
```

### 배포
```bash
npm run deploy          # GitHub Pages에 배포 (gh-pages)
```

---

## 📊 배포 전략

### 웹 버전
- **플랫폼**: GitHub Pages
- **설정**: `vercel.json` (Vercel 배포 선택 옵션)
- **상태**: 활성

### 데스크톱 버전
- **플랫폼**: Windows (NSIS + Portable)
- **빌드 도구**: electron-builder
- **설치 경로**: 자동 설치 + 바탕화면 단축키

---

## ⚠️ 알려진 문제

### 1. HTML 구조 경고
```
<table> cannot contain a nested <div>
```
**원인**: DnD Kit가 접근성을 위해 `<div id="DndDescribedBy-0">` 추가
**영향**: 기능은 정상, 브라우저 경고만 표시
**해결책**: ProgramTab에서 table 구조 개선 (또는 div 기반으로 변경)

### 2. Module "stream" 경고
```
Module "stream" has been externalized for browser compatibility
```
**원인**: IndexedDB 또는 특정 라이브러리가 Node.js 스트림 모듈 참조
**영향**: 개발 시에만 경고, 프로덕션에는 영향 없음
**해결책**: 라이브러리 업데이트 또는 Vite 설정 조정

---

## 👨‍💻 개발 노트

### 주의사항
1. **Junction 테이블 절대 건드리지 말 것**
   - `concertMembers`, `programItems` 등은 각 연주회별 데이터
   - 마스터 정보는 별도 관리

2. **Cascade Delete 원칙**
   - 연주회 삭제 = Junction 제거만 (Masters는 보존)
   - 이를 통해 데이터 재사용성 보장

3. **타입 안정성**
   - 모든 엔티티는 `src/types/index.ts`에 정의
   - 새 필드 추가 시 타입도 함께 업데이트

### 향후 개선 사항
- [ ] HTML 구조 경고 제거 (ProgramTab)
- [ ] Module externalization 경고 제거
- [ ] 온라인 동기화 기능 (Firebase/Supabase)
- [ ] 협업 기능 (실시간 다중 사용자)
- [ ] 모바일 앱 (React Native)

---

## 📞 연락처 및 참고

**사용자**: woorimmi@gmail.com
**프로젝트 경로**: `/Users/shimwoorim/Desktop/아첼연주회관리프로그램`
**Git 사용자**: aceaccel-hub
**개발 서버**: http://localhost:5175/

---

**생성 일시**: 2026-06-14
**최종 업데이트**: 최근 5개 커밋 기준
