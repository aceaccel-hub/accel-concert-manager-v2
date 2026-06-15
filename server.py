#!/usr/bin/env python3
import os
import webbrowser
import http.server
import socketserver
import time
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

def start_server():
    # dist 폴더로 이동
    dist_path = Path(__file__).parent / 'dist'
    if not dist_path.exists():
        print(f"❌ dist 폴더를 찾을 수 없습니다: {dist_path}")
        input("Enter를 눌러 종료하세요...")
        return

    os.chdir(dist_path)

    # 브라우저 자동 오픈
    time.sleep(0.5)
    webbrowser.open(f'http://localhost:{PORT}')

    # 서버 시작
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"✅ 서버가 시작되었습니다!")
        print(f"🌐 http://localhost:{PORT}")
        print(f"종료하려면 Ctrl+C를 누르세요...\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 서버가 종료되었습니다.")

if __name__ == '__main__':
    start_server()
