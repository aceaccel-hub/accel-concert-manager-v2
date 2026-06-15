# 다른 AI 개발자를 위한 핵심 파일 가이드

## 📋 빠른 시작 (5분)

### 1단계: 프로젝트 이해하기
1. `PROJECT_CONTEXT.md` 읽기 (10분) ← **여기서 시작**
2. 기술 스택, 아키텍처, 현재 상태 파악

### 2단계: 코드 탐색
아래 순서대로 파일 읽기:

1. **타입 정의** (가장 중요!)
   - `src/types/index.ts` 
   - 모든 엔티티 구조 이해

2. **데이터베이스**
   - `src/db/database.ts`
   - IndexedDB 스키마, cascade 삭제 로직

3. **라우팅 & 상태 관리**
   - `src/App.tsx` (라우팅 구조)
   - `src/store/store.ts` (Zustand 전역 상태)

4. **패키지 정보**
   - `package.json` (의존성, 빌드 스크립트)

---

## 🎯 파일별 역할 및 읽기 우선순위

### 🔴 **필독** (작업 전 반드시 읽기)

#### 1. `PROJECT_CONTEXT.md` ⭐ (START HERE)
- **용도**: 프로젝트 전체 개요
- **읽기 시간**: 15-20분
- **내용**:
  - 기술 스택 및 버전
  - 디렉토리 구조
  - 핵심 기능
  - 데이터 모델 (Master vs Junction)
  - 알려진 문제점

#### 2. `src/types/index.ts` ⭐⭐⭐
- **용도**: 모든 엔티티 타입 정의
- **읽기 시간**: 15분
- **이해해야 할 것**:
  ```typescript
  // Master Entities (여러 연주회에서 재사용)
  Concert, Repertoire, Member, Group, MasterItem
  
  // Junction Entities (각 연주회별 데이터)
  ProgramItem, ConcertMember, ConcertGroup, Rehearsal, 
  RehearsalAttendance, Budget, ConcertDocument, Checklist, Memo
  ```
- **핵심 원칙**: 
  - Master와 Junction은 절대 섞지 말 것
  - concertId는 Junction의 핵심 구분자

#### 3. `src/db/database.ts` ⭐⭐
- **용도**: IndexedDB 스키마 및 쿼리 로직
- **읽기 시간**: 10분
- **주의사항**:
  - Version 2까지 스키마 진화 과정 확인
  - `deleteConcertCascade()` 함수의 중요성
  - concertId 인덱싱 전략

### 🟠 **주요** (첫 작업 전 읽기)

#### 4. `src/App.tsx`
- **용도**: 라우팅 구조
- **읽기 시간**: 5분
- **내용**:
  - Sidebar + Outlet 구조
  - 초기 샘플 데이터 로드

#### 5. `src/store/store.ts`
- **용도**: Zustand 전역 상태
- **읽기 시간**: 5분
- **상태 항목**:
  - `selectedConcertId` (현재 선택 연주회)
  - `currentPage` (현재 페이지)
  - `settings` (앱 설정)

#### 6. `package.json`
- **용도**: 의존성, 빌드 스크립트
- **중요 명령어**:
  ```bash
  npm run dev              # 웹 개발 서버
  npm run electron-dev    # Electron 데스크톱
  npm run build           # 프로덕션 빌드
  ```

#### 7. `vite.config.ts`
- **용도**: Vite 빌드 설정
- **주의**: 포트 5175, HMR 설정 확인

#### 8. `electron-main.js`
- **용도**: Electron 데스크톱 앱 진입점
- **주의**: ES modules, 개발/프로덕션 모드 분기

### 🟡 **선택** (특정 기능 작업 시)

#### 컴포넌트 파일들

**연주회 관리**
- `src/components/concerts/ConcertDetail.tsx` - 연주회 상세 화면
- `src/components/concerts/tabs/ProgramTab.tsx` - 공연 곡목 (⚠️ HTML 구조 문제)
- `src/components/concerts/tabs/MembersTab.tsx` - 참가자 관리
- `src/components/concerts/tabs/BudgetTab.tsx` - 예산 탭

**마스터 데이터**
- `src/components/members/MembersPage.tsx` - 단원 마스터 관리
- `src/components/groups/GroupsPage.tsx` - 단체 마스터 관리
- `src/components/repertoire/RepertoirePage.tsx` - 곡목 마스터

**공통 컴포넌트**
- `src/components/common/Combobox.tsx` - DB 연동 콤보박스 ⭐ (사용자 정의)
- `src/components/common/SmartInput.tsx` - 스마트 입력 필드
- `src/components/common/Modal.tsx` - 모달 다이얼로그

#### 훅 파일들
- `src/hooks/useConcert.ts` - 연주회 CRUD
- `src/hooks/useMembers.ts` - 단원 조회
- `src/hooks/useProgram.ts` - 곡목 조회
- `src/hooks/useMasterItems.ts` - 마스터 아이템 (악기, 파트, 역할)
- `src/hooks/useBudget.ts` - 예산 계산
- 기타 도메인별 훅

---

## 📌 사용자 정의 기능 (메모리)

### 블록 항목 용어 정의
**파일**: `/Users/shimwoorim/.claude/projects/-Users-shimwoorim/memory/block_item_terminology.md`

- DB 연동 콤보박스 (악기·파트·역할 적용)
- 향후 확장 예정

### 드롭다운 블록 기능
**파일**: `/Users/shimwoorim/.claude/projects/-Users-shimwoorim/memory/dropdown_block_feature.md`

- 드롭다운 + 커스텀 입력
- 블록 생성/삭제 기능

### Vercel 배포 전용 설정
**파일**: `/Users/shimwoorim/.claude/projects/-Users-shimwoorim/memory/deployment_preference.md`

- 코드 작성 시 Vercel 배포 전용으로 설정됨

---

## 🔄 파일 관계도

```
├─ App.tsx (라우팅 진입점)
│  ├─ Sidebar (네비게이션)
│  └─ Outlet (페이지 렌더링)
│
├─ store/store.ts (전역 상태)
│  └─ useStore() hook
│
├─ types/index.ts (타입 정의)
│  ├─ Master Entities
│  └─ Junction Entities
│
├─ db/database.ts (IndexedDB)
│  ├─ Dexie 스키마
│  └─ deleteConcertCascade()
│
├─ hooks/* (데이터 로직)
│  ├─ useConcert() → concerts 테이블
│  ├─ useMembers() → members 테이블
│  ├─ useProgram() → programItems 테이블
│  └─ ...
│
└─ components/* (UI)
   ├─ concerts/ (연주회 페이지)
   ├─ members/ (단원 페이지)
   ├─ common/ (재사용 컴포넌트)
   └─ ...
```

---

## 💡 작업 종류별 읽을 파일

### 🎭 새 기능 추가
1. `types/index.ts` - 새 타입 정의
2. `db/database.ts` - 스키마 업데이트 (필요 시)
3. `hooks/useXXX.ts` - 새 훅 작성
4. `components/XXX/` - 컴포넌트 작성

### 🐛 버그 수정
1. `PROJECT_CONTEXT.md` - 알려진 문제 확인
2. 관련 컴포넌트 파일
3. 관련 훅 파일

### 🔧 성능 최적화
1. `types/index.ts` - 데이터 구조 이해
2. `hooks/*` - 쿼리 로직
3. `vite.config.ts` - 빌드 설정

### 📱 Electron/데스크톱 작업
1. `electron-main.js` - Electron 설정
2. `vite.config.ts` - HMR 설정

---

## ⚙️ 개발 시작 전 체크리스트

- [ ] `PROJECT_CONTEXT.md` 읽기
- [ ] `types/index.ts`에서 Master vs Junction 이해
- [ ] `db/database.ts`의 cascade 삭제 원칙 확인
- [ ] 로컬 개발 서버 실행 (`npm run dev`)
- [ ] http://localhost:5175에서 앱 동작 확인
- [ ] 현재 경고 메시지 확인 (HTML table 구조, module externalization)

---

## 📞 추가 정보

**프로젝트 경로**: `/Users/shimwoorim/Desktop/아첼연주회관리프로그램`
**개발 서버**: http://localhost:5175/
**Git 사용자**: aceaccel-hub
**사용자 이메일**: woorimmi@gmail.com

---

## 🎓 중요 개념 정리

### Master vs Junction
```typescript
// ❌ 잘못된 설계
{
  concertId: 'c1',
  members: [ { id: 'm1', name: '홍길동' }, ... ]  // 중복!
}

// ✅ 올바른 설계
members[0] = { id: 'm1', name: '홍길동', instrument: '바이올린' }
concertMembers[0] = { 
  concertId: 'c1', 
  memberId: 'm1',
  part: '제1바이올린'  // 연주회별 추가 정보
}
```

### Cascade Delete
```typescript
// 연주회 삭제 시
deleteConcertCascade('c1')
  ✅ 제거: concertMembers, programItems, budgets, ...
  ❌ 보존: members, repertoire, groups (다른 연주회에서 사용 가능)
```

### Zustand Persist
```typescript
// localStorage에만 저장
- selectedConcertId (새로고침 후 같은 연주회 선택)
- settings (앱 설정 유지)

// 저장 안함 (휘발성)
- currentPage
- currentTab
```

---

**마지막 업데이트**: 2026-06-14
