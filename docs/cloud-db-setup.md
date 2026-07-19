# Firebase 클라우드 DB 설정 안내

현재 프로그램은 브라우저 안의 IndexedDB를 오프라인 저장소로 사용하고, `/api/cloud-state` API를 통해 Firebase Firestore와 전체 데이터 묶음을 동기화합니다.

## 저장 방식

- 프론트엔드: 기존 React/Vite 앱
- 클라우드 API: `/api/cloud-state`
- 클라우드 저장소: Firebase Cloud Firestore
- 보안:
  - 사용자는 설정 화면에 `동기화 코드`를 입력합니다.
  - 서버 API는 `CLOUD_SYNC_TOKEN`과 입력 코드가 일치할 때만 읽기/쓰기를 허용합니다.
  - Firestore 접속은 서버의 Firebase Admin SDK 서비스 계정으로만 수행합니다.

## 현재 진행 상태

- 프로그램 코드는 Vercel Blob 대신 Firebase Firestore를 사용하도록 변경되었습니다.
- 로컬 빌드와 타입 검사는 통과했습니다.
- 실제 운영 사이트에서 작동하려면 Firebase 프로젝트의 서비스 계정 값을 Vercel 환경변수에 추가해야 합니다.

## 비용

Firebase Firestore는 무료로 시작할 수 있는 Spark 요금제가 있습니다. Firebase 공식 가격표 기준으로 Firestore는 무료 한도에서 저장 데이터 1GiB, 읽기 50,000회/일, 쓰기 20,000회/일, 삭제 20,000회/일을 제공합니다.

아첼 연주회 관리 프로그램처럼 소수의 기기에서 전체 데이터를 동기화하는 용도라면 보통 무료 한도 안에서 시작할 가능성이 큽니다. 단, 사용량이 커지거나 Google에서 요구하는 유료 기능을 켜면 비용이 발생할 수 있으므로 Firebase 콘솔의 사용량 화면을 확인해야 합니다.

## Vercel에서 필요한 환경변수

| 이름 | 설명 |
| --- | --- |
| `CLOUD_SYNC_TOKEN` | 선생님과 공유할 동기화 코드입니다. 앱 설정 화면에 입력하는 값과 같아야 합니다. |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID입니다. |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정의 `client_email` 값입니다. |
| `FIREBASE_PRIVATE_KEY` | Firebase 서비스 계정의 `private_key` 값입니다. 줄바꿈은 `\n` 형태 그대로 넣어도 됩니다. |
| `FIREBASE_SYNC_COLLECTION` | 선택 사항. 기본값은 `appState` 입니다. |
| `FIREBASE_SYNC_DOCUMENT_ID` | 선택 사항. 기본값은 `accel-concert-manager` 입니다. |

## Firebase 준비 순서

1. Firebase Console에서 프로젝트를 생성합니다.
2. Firestore Database를 생성합니다.
3. Project settings → Service accounts로 이동합니다.
4. Firebase Admin SDK 서비스 계정 키를 새로 발급합니다.
5. 발급된 JSON에서 아래 값을 Vercel 환경변수로 옮깁니다.
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
6. Vercel Production 환경에 위 환경변수를 저장합니다.
7. Vercel에서 Production 재배포를 실행합니다.

## 사용 순서

1. 데이터가 가장 정확한 컴퓨터에서 웹사이트를 엽니다.
2. 설정 → 클라우드 DB에서 동기화 코드를 입력합니다.
3. `클라우드 연결`을 누릅니다.
4. 다른 컴퓨터나 스마트폰에서도 같은 코드를 입력하고 `클라우드 연결`을 누릅니다.
5. 이후 앱이 켜져 있고 인터넷이 연결되어 있으면 약 8초 간격으로 자동 동기화됩니다.

## 남은 작업

1. Firebase 프로젝트와 Firestore Database를 준비합니다.
2. Firebase 서비스 계정 JSON을 발급합니다.
3. JSON 안의 `project_id`, `client_email`, `private_key` 값을 Vercel Production 환경변수에 넣습니다.
4. 운영 사이트를 재배포합니다.
5. 데이터가 들어있는 컴퓨터에서 먼저 `클라우드 연결`을 눌러 기존 데이터를 Firebase에 올립니다.
6. 다른 컴퓨터와 스마트폰에서 같은 동기화 코드를 입력해 연결합니다.

## 주의

이 방식은 한 문서에 전체 백업 묶음을 저장합니다. 동시에 같은 항목을 여러 기기에서 수정하면 마지막으로 저장된 변경이 기준이 됩니다.

## 참고 공식 문서

- Firebase Admin SDK 설정: https://firebase.google.com/docs/admin/setup
- Cloud Firestore 시작하기: https://firebase.google.com/docs/firestore/quickstart
- Firebase 가격표: https://firebase.google.com/pricing
