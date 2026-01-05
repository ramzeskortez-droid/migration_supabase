@echo off
echo Setting proxy configuration...
set HTTP_PROXY=http://user:pass@ip:port
set HTTPS_PROXY=http://user:pass@ip:port
set ALL_PROXY=http://user:pass@ip:port
set NO_PROXY=localhost,127.0.0.1
set GITHUB_MCP_PAT=your_github_pat_here
echo Proxy configured with authentication
echo GitHub MCP PAT configured
echo.
echo Starting Gemini CLI...
node C:\Users\Dima\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js %*
pause
