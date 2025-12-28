@echo off
echo Setting proxy configuration...
set HTTP_PROXY=http://w2v4zv:sfJENE@138.219.123.78:9081
set HTTPS_PROXY=http://w2v4zv:sfJENE@138.219.123.78:9081
set ALL_PROXY=http://w2v4zv:sfJENE@138.219.123.78:9081
set NO_PROXY=localhost,127.0.0.1
echo Proxy configured with authentication
echo.
echo Starting Gemini CLI...
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*
pause
