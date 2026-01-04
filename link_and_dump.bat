@echo off
set PROJECT_ID=axrrmbhcwtlbsffqosls
set DB_PASS=2codeegorDima
set DB_URL="postgresql://postgres:%DB_PASS%@db.%PROJECT_ID%.supabase.co:5432/postgres"

echo [1/2] Exporting FULL SCHEMA (Direct connection)...
call npx supabase db dump --db-url %DB_URL% -f cloud_full_dump.sql

echo.
echo [2/2] Exporting DATA ONLY (Direct connection)...
call npx supabase db dump --db-url %DB_URL% --data-only -f cloud_data_only.sql

echo.
echo DONE!
pause