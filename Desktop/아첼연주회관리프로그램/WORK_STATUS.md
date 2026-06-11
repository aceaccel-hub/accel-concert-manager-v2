# 아첼 연주회 관리 프로그램 - 작업 상태 정리

## 📊 프로젝트 정보
- **저장소**: https://github.com/aceaccel-hub/accel-concert-manager-v2.git
- **브랜치**: main
- **상태**: 모든 변경사항 GitHub에 동기화 완료 ✅

---

## 🎯 최근 작업 내역 (이번 세션)

### 1️⃣ 연주회 단원 관리 개선 (Commit: 0007e319)
- **기능**: 단원 수정 모달 추가 및 확대
- **변경사항**:
  - EditModal 크기: `md` → `lg` (더 큰 모달)
  - 모든 단원 정보 필드 포함 (악기, 파트, 역할, 연락처, 이메일, 국적 등)
  - 현재 연주회 사용 위치 "(현재)" 표시
- **파일**: `src/components/concerts/tabs/MembersTab.tsx`

### 2️⃣ 곡 편집 시 사용 이력 표시 (Commit: a9a6ee2c)
- **기능**: 곡 수정 모달에서 연주 이력 표시
- **변경사항**:
  - 편집 모드에서도 히스토리 로드
  - 사용 이력을 항상 표시
  - 현재 연주회는 "(현재)" 강조
- **파일**: `src/components/concerts/tabs/ProgramTab.tsx`

### 3️⃣ 연습 관리 UI 개선 (Commit: 47ed07a7)
- **기능**: 
  - 대상곡목 드래그 앤 드롭 정렬
  - 지휘자 평가 필드 제거
- **구현**:
  - dnd-kit 라이브러리 사용
  - SortableTargetPieces 컴포넌트 추가
  - 각 곡목마다 그립 핸들(≡) 제공
- **파일**: `src/components/concerts/tabs/RehearsalsTab.tsx`

### 4️⃣ 출석 상태별 가중치 적용 (Commit: f0103b1e)
- **기능**: 출석률 계산 방식 개선
- **가중치**:
  - 출석 ✅: 100%
  - 지각 ⏰: 80%
  - 조퇴 🚪: 50%
  - 결석 ❌: 0%
- **계산식**: (각 상태의 점수 합) / 전체 연습 수
- **파일**: `src/hooks/useRehearsals.ts`

### 5️⃣ 버그 수정 및 안정화
- **깜박거림 문제** (자동 새로고침) - 2회 수정
  - RehearsalsTab: concert 객체 의존성 제거 (Commit: 57ec897d)
  - DocumentsTab: concert 객체 의존성 제거 (Commit: 975b21af)
  
- **문서 저장 모달 입력 필드** - 3회 개선
  - type="text" 명시 (Commit: f9ee13d4)
  - placeholder 최적화 (Commit: f9ee13d4)
  - onChange 개선 (Commit: d498634e)

---

## 🛠️ 개발 환경 설정

### 로컬 개발 시작
```bash
# 저장소 클론 (이미 있으면 스킵)
git clone https://github.com/aceaccel-hub/accel-concert-manager-v2.git
cd 아첼연주회관리프로그램

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 브라우저에서 열기
http://localhost:5175
```

### 커밋 후 푸시
```bash
# 상태 확인
git status

# 변경사항 스테이징 및 커밋
git add <files>
git commit -m "feat/fix: 메시지"

# GitHub에 푸시
git push origin main
```

---

## 📋 핵심 기능 요약

### 연주회 관리
- ✅ 연주회 생성, 수정, 삭제
- ✅ 기본정보, 곡목, 단원, 단체, 연습, 예산, 문서 탭
- ✅ 진행률 표시

### 단원 관리
- ✅ 전체 단원 DB 관리
- ✅ 연주회별 단원 추가/제거
- ✅ 단원 정보 상세 수정 (악기, 파트, 역할, 연락처, 계좌 등)
- ✅ 수정 모달 (+ 아이콘으로 드래그 정렬)

### 곡목 관리
- ✅ 곡목 추가/수정/삭제
- ✅ 드래그로 순서 변경
- ✅ 곡 편집 시 연주 이력 표시
- ✅ 악보/파트보 준비 상태 추적

### 연습 관리
- ✅ 연습 일정 추가/수정/삭제
- ✅ 출석 체크 (출석, 지각, 조퇴, 결석)
- ✅ 대상곡목 드래그로 순서 정렬
- ✅ 출석률 자동 계산 (가중치 적용)

### 문서 생성
- ✅ 곡목표, 단원명단, 연습일정표, 정산표 등
- ✅ PDF, Excel, Word 형식 내보내기
- ✅ 문서 저장 및 불러오기

---

## 🚀 다음 작업 항목 (추천)

1. **문서 저장 모달 입력 필드 최종 안정화**
   - 현재: onChange 개선됨
   - 테스트 필요: 한 글자씩 입력 후 저장 기능 확인
   
2. **페이지 깜박거림 최종 확인**
   - 현재: useEffect 의존성 2곳 수정
   - 확인: 각 탭에서 부드러운 전환 검증

3. **Vercel 배포**
   - GitHub 저장소 연동 후 Vercel에서 자동 배포 설정
   - 환경 변수 설정 (필요시)

4. **추가 기능 (향후)**
   - 원천징수영수증 자동 생성
   - 국세청 신고 기능
   - 이메일 공지 기능
   - 통계 대시보드

---

## 📞 주의사항

### 자동 새로고침 문제 (해결됨)
- ❌ concert 객체를 useEffect 의존성에 넣으면 안 됨
- ✅ concertId만 사용
- ✅ 적용 파일: RehearsalsTab, DocumentsTab

### 입력 필드 렌더링 (해결됨)
- ❌ template literal placeholder 피하기
- ✅ 문자열 연결 사용 (`concert.title + ' ' + selectedType`)
- ✅ onChange에서 e.preventDefault() 추가

---

## 🎓 데이터 모델

### Concert (연주회)
- id, title, date, time, place, status, conductor, expectedDuration, intermissionDuration

### Member (단원)
- id, name, instrument, part, role, phone, email, residentNumber, bankAccount, etc.

### ConcertMember (연주회-단원 관계)
- id, concertId, memberId, part, role, fee, attendanceRate, isReserve

### ProgramItem (곡목)
- id, concertId, order, composer, title, movement, duration, scoreStatus

### Rehearsal (연습)
- id, concertId, date, startTime, endTime, place, type, targetPieces, progressRate

### RehearsalAttendance (출석)
- id, rehearsalId, concertId, memberId, status (출석/지각/조퇴/결석)

---

**마지막 업데이트**: 2026-06-11
**프로젝트 상태**: 안정적 ✅ (모든 변경사항 GitHub에 저장됨)
