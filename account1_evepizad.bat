@echo off
setlocal

:: 1. Очистка .gemini конфигов в домашней папке
if exist "%USERPROFILE%\.gemini" rmdir /s /q "%USERPROFILE%\.gemini"

:: 2. Настройка прокси
set HTTP_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set HTTPS_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149
set ALL_PROXY=http://UZtsd1:h4fWKh@161.115.231.113:9149

:: 3. Настройка API ключа для Account 1
set GEMINI_API_KEY=AIzaSyBiUmGPbyxx9BGADLSnxSugzLbk5R1-a_M

:: 4. Запуск gemini-cli
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*

pause
