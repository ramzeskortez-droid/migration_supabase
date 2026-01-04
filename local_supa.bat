@echo off
echo [1/3] Checking Supabase status...
call npx supabase start

echo.
echo [2/3] Supabase local URLs:
echo Studio (DB Manager): http://127.0.0.1:54323
echo API URL: http://127.0.0.1:54321
echo.

echo [3/3] Starting Web Application...
npm run dev
pause
