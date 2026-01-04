@echo off
set DB_URL="postgresql://postgres:2codeegorDima@db.axrrmbhcwtlbsffqosls.supabase.co:5432/postgres"

echo [1/2] Exporting FULL SCHEMA from cloud...
call npx supabase db dump --db-url %DB_URL% -f cloud_full_dump.sql

echo.
echo [2/2] Exporting DATA ONLY from cloud...
call npx supabase db dump --db-url %DB_URL% --data-only -f cloud_data_only.sql

echo.
echo DONE! Created 'cloud_full_dump.sql' and 'cloud_data_only.sql'
echo Now you can close this window.
pause