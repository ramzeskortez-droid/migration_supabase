@echo off
echo Setting proxy configuration...
set HTTP_PROXY=http://N1QZJq:4gPRbh@152.232.72.252:9842
set HTTPS_PROXY=http://N1QZJq:4gPRbh@152.232.72.252:9842
set ALL_PROXY=http://N1QZJq:4gPRbh@152.232.72.252:9842
set NO_PROXY=localhost,127.0.0.1
echo Proxy configured with authentication
echo.
echo Starting Gemini CLI with API key...
set GEMINI_API_KEY=AIzaSyBsYsarnP4XAChmf_sa9UqAVG8Ta2NdsnA
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*
pause
