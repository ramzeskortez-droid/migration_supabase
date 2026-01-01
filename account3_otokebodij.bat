@echo off
setlocal

:: 1. Очистка .gemini конфигов в домашней папке
if exist "%USERPROFILE%\.gemini" rmdir /s /q "%USERPROFILE%\.gemini"

:: 2. Настройка прокси
set HTTP_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396
set HTTPS_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396
set ALL_PROXY=http://6Wwr8r:oJo4g8@70.38.2.17:13396

:: 3. Настройка API ключа для Account 3
set GEMINI_API_KEY=AIzaSyAT-8k8OuWcB8y0ZD96oLiVer-pXBSXqEc

:: 4. Запуск gemini-cli
C:\Users\Dima\AppData\Roaming\npm\gemini.cmd %*

pause
