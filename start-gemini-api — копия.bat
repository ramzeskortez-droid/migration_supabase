@echo off
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
echo Starting Gemini CLI with API key...
set GEMINI_API_KEY=AIzaSyDev6A5ZyJ1QGq7PQtvDMxSheLuQht_veo
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*
pause
