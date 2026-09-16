@echo off
:: เปิดจอ "ห้องปฏิบัติการ" แบบ Kiosk เต็มจออัตโนมัติ
timeout /t 10 /nobreak > nul

set URL=http://localhost:19010/tv/l

where chrome.exe >nul 2>&1
if not errorlevel 1 (
  start "" "chrome.exe" --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required --app=%URL%
  exit
)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required --app=%URL%
  exit
)
start "" "msedge.exe" --kiosk --no-first-run --disable-infobars --app=%URL%