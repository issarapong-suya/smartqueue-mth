@echo off
title SmartQueue v2 Server
chcp 65001 > nul
echo ====================================================
echo   Smart Queue PLK v2 - โรงพยาบาลแม่ทะ จังหวัดลำปาง
echo ====================================================
echo.
echo กำลังเริ่มทำงานเซิร์ฟเวอร์...
node server/index.js
pause
