@echo off
chcp 65001 > nul
echo.
echo ====================================
echo 필수 패키지 설치
echo ====================================
echo.

REM Node.js 설치 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo https://nodejs.org/ (LTS 버전) 에서 설치 후 다시 실행해주세요.
    echo.
    pause
    exit /b
)

echo ✅ Node.js 감지됨
echo.

REM 현재 폴더
cd /d "%~dp0"

REM npm 모듈 설치
echo 📦 패키지 설치 중... (시간이 소요될 수 있습니다)
call npm install

echo.
echo ✅ 설치 완료!
echo.
echo 다음 단계:
echo 1. START.bat 파일을 더블클릭하세요
echo 2. 또는 명령 프롬프트에서 다음 명령어를 실행하세요:
echo    npm run preview -- --host 0.0.0.0 --port 5175
echo.
pause
