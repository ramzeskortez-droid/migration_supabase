@echo off
set HTTP_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set HTTPS_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set ALL_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set NO_PROXY=localhost,127.0.0.1
node "%APPDATA%\npm\node_modules\@google\gemini-cli\dist\index.js" %*
pause
