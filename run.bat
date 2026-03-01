@echo off
chcp 65001 >nul 2>&1
call "%~dp0run_main.bat" "%~dp0"
exit /b
