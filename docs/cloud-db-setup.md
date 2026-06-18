# 클라우드 DB 전환 안내

현재 프로그램은 브라우저 안의 IndexedDB를 기본 저장소로 사용하고, 설정 화면에서 전체 데이터 묶음을 클라우드 저장소와 동기화합니다.

## 저장 방식

- 프론트엔드: 기존 React/Vite 앱
- 클라우드 API: `/api/cloud-state`
- 클라우드 저장소: Vercel Blob Private Storage
- 보안: `CLOUD_SYNC_TOKEN` 값과 사용자가 설정 화면에 입력한 동기화 코드가 일치해야 읽기/쓰기가 됩니다.

## Vercel에서 필요한 환경변수

| 이름 | 설명 |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 저장소를 만들면 자동 생성됩니다. |
| `CLOUD_SYNC_TOKEN` | 선생님과 공유할 동기화 코드입니다. 길고 예측하기 어렵게 만드세요. |
| `CLOUD_STATE_PATH` | 선택 사항. 기본값은 `accel-concert-manager/state.json` 입니다. |

## 사용 순서

1. Vercel에 프로젝트를 배포합니다.
2. Vercel 프로젝트의 Storage에서 Private Blob 저장소를 만듭니다.
3. Environment Variables에 `CLOUD_SYNC_TOKEN`을 추가합니다.
4. 배포된 사이트의 설정 화면에서 클라우드 주소와 동기화 코드를 입력합니다.
5. 기존 데이터가 있는 컴퓨터에서 `클라우드로 올리기`를 누릅니다.
6. 다른 컴퓨터에서 같은 주소로 접속한 뒤 `클라우드에서 불러오기`를 누릅니다.

## 주의

이 방식은 “한 명이 올리고 다른 사람이 내려받는” 안전한 1차 동기화 방식입니다. 여러 사람이 동시에 같은 항목을 편집하는 실시간 공동 편집은 충돌 처리 규칙이 추가로 필요합니다.
