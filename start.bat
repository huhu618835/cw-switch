@echo off
cd /d "%~dp0"
echo 🐋 cw-switch 正在启动...
echo 浏览器将自动打开，如果未打开请访问控制台显示的地址
echo.
node server.js
pause
