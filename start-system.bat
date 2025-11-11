@echo off
cd /d "%~dp0"
echo ========================================
echo      نظام إدارة المتاجر - CodeVia
echo ========================================
echo.
echo جاري تشغيل التطبيق...
echo.

:: التحقق من وجود Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo خطأ: Node.js غير مثبت على هذا الجهاز
    echo يرجى تحميل وتثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)

:: تثبيت المكتبات إذا لم تكن موجودة
if not exist "node_modules" (
    echo جاري تثبيت المكتبات المطلوبة...
    echo هذا قد يستغرق بضع دقائق في المرة الأولى...
    npm install
    echo.
)

:: التحقق من وجود Electron
if not exist "node_modules\electron" (
    echo جاري تثبيت Electron...
    npm install electron --save-dev
    npm install electron-builder --save-dev
    echo.
)

echo تم تشغيل التطبيق بنجاح!
echo سيتم فتح نافذة التطبيق خلال ثوان...
echo.

:: تشغيل التطبيق كـ Desktop App
npm start
pause