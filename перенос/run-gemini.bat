@echo off
echo =====================================
echo Running Gemini from local folder
echo =====================================
echo.

echo Setting proxy configuration...
set HTTP_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set HTTPS_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set ALL_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set NO_PROXY=localhost,127.0.0.1
echo Proxy configured with authentication
echo.

echo Setting Python configuration...
set PYTHON_BIN=C:\Users\Dima\AppData\Local\Microsoft\WindowsApps\python.exe
echo Python bin set to %PYTHON_BIN%
echo.

echo Setting API key...
set GEMINI_API_KEY=AIzaSyDev6A5ZyJ1QGq7PQtvDMxSheLuQht_veo
echo API key configured
echo.

echo Copying Gemini configuration...
set USERPROFILE_GEMINI=%USERPROFILE%\.gemini
set LOCAL_GEMINI=%~dp0.gemini

if exist "%USERPROFILE_GEMINI%" (
    echo Backup existing config to .gemini.backup...
    if exist "%USERPROFILE_GEMINI%.backup" (
        rmdir /s /q "%USERPROFILE_GEMINI%.backup"
    )
    move "%USERPROFILE_GEMINI%" "%USERPROFILE_GEMINI%.backup"
)

echo Copying .gemini from current folder to user profile...
xcopy "%LOCAL_GEMINI%" "%USERPROFILE_GEMINI%" /E /I /Y
echo Configuration copied successfully
echo.

echo Starting Gemini CLI...
gemini %*

pause
