@echo off
chcp 65001 > nul
echo.
echo ====================================
echo 아첼 연주회 관리 프로그램 시작
echo ====================================
echo.

REM Node.js 설치 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo https://nodejs.org/ 에서 LTS 버전을 설치해주세요.
    echo.
    pause
    exit /b
)

echo ✅ Node.js 감지됨

REM 현재 폴더 경로 저장
set SCRIPT_PATH=%~dp0
cd /d "%SCRIPT_PATH%"

REM npm 모듈 확인 및 설치
if not exist "node_modules" (
    echo.
    echo 📦 필요한 패키지 설치 중...
    call npm install
)

REM 브라우저 자동 오픈
timeout /t 3 /nobreak
start http://localhost:5175

REM 서버 실행
echo.
echo 🚀 서버가 시작되었습니다!
echo.
echo 🌐 브라우저에서 다음 주소로 접속하세요:
echo    http://localhost:5175
echo.
echo ⚠️  이 창을 닫으면 서버가 종료됩니다.
echo.

npm run preview -- --host 0.0.0.0 --port 5175
