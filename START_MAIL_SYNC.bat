@echo off
title Gmail Sync Service (IDLE Mode)
echo Starting Gmail Sync Service...
echo This window must remain open for instant email delivery.
echo.
node scripts/sync_emails.cjs
pause
