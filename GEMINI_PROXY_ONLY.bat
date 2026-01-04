@echo off
echo Setting proxy configuration...
set HTTP_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396
set HTTPS_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396
set ALL_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396
set NO_PROXY=localhost,127.0.0.1
echo Proxy configured with authentication
echo.
echo Starting Gemini CLI...
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*
pause
