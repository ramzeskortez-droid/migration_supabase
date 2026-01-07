@echo off
title Gmail Sync Service
echo Starting Gmail Sync Service for China-Nai...
:: Устанавливаем флаг через окружение и запускаем с системными сертификатами
set NODE_TLS_REJECT_UNAUTHORIZED=0
node --use-system-ca sync_emails.cjs
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Script crashed. Check the messages above.
)
pause