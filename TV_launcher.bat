@echo off
:: ===================================================
:: SmartQueue PLK — TV Display Launcher
:: เลือกจอแสดงผลที่ต้องการเปิดบนทีวีเครื่องนี้
:: ===================================================

title SmartQueue TV Launcher

echo.
echo  =============================================
echo    SmartQueue PLK — เลือกจอแสดงผล
echo  =============================================
echo.
echo  1. จุดซักประวัติ            (station=sa)
echo  2. ห้องตรวจ                  (station=sb)
echo  3. ห้องยาและการเงิน         (station=rx)
echo  4. ห้องฉุกเฉิน              (station=er)
echo  5. ห้องฉีดยา ทำแผล         (station=t)
echo  6. ทันตกรรม                 (station=d)
echo  7. ห้องปฏิบัติการ (LAB)     (station=l)
echo  8. เอกซเรย์ (X-Ray)        (station=x)
echo  9. หน้าเลือกแผนก (Launcher)
echo.
echo  [กด 0 เพื่อกำหนด URL เอง]
echo.
set /p choice=กรุณาเลือกหมายเลข: 

set SERVER=http://localhost:19010

if "%choice%"=="1" set STATION=sa
if "%choice%"=="2" set STATION=sb
if "%choice%"=="3" set STATION=rx
if "%choice%"=="4" set STATION=er
if "%choice%"=="5" set STATION=t
if "%choice%"=="6" set STATION=d
if "%choice%"=="7" set STATION=l
if "%choice%"=="8" set STATION=x
if "%choice%"=="9" (
  start "" "http://localhost:19010/tv/"
  goto :end
)
if "%choice%"=="0" (
  set /p STATION=กรอก station id (เช่น sa, sb, rx): 
)

if not defined STATION (
  echo เลือกไม่ถูกต้อง กรุณาลองใหม่
  pause
  exit
)

set URL=%SERVER%/tv/%STATION%

echo.
echo  กำลังเปิด: %URL%
echo  (Chrome Kiosk Mode — กด F11 หรือ Alt+F4 เพื่อออก)
echo.

:: เปิด Chrome แบบ Kiosk mode (เต็มจอ, ไม่มี toolbar, ไม่มี address bar)
start "" "chrome.exe" --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --app=%URL%

:: ถ้าไม่มี Chrome ลอง Edge
if errorlevel 1 (
  start "" "msedge.exe" --kiosk --no-first-run --app=%URL%
)

:end
echo  เปิดหน้าจอเรียบร้อย
