@echo off
echo Starting China-Nai Local Development Environment...

:: Запуск синхронизации почты в отдельном окне
start "Gmail Sync Service" cmd /c "node sync_emails.cjs"

:: Запуск основного приложения
echo Starting React Frontend...
npm run dev -- --port 3000
pause