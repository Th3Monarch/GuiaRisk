@echo off
title GuiaRisk 2.0 - Core de Compliance y Debida Diligencia
echo ===================================================
echo   INICIANDO GUIARISK 2.0 - PLATAFORMA FULL-STACK
echo ===================================================
echo.
cd /d "%~dp0"

echo Verificando servidor existente...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [INFO] GuiaRisk ya esta en ejecucion en el puerto 3000.
    echo Abriendo navegador en http://localhost:3000...
    start "" http://localhost:3000
    exit /b 0
)

echo Abriendo navegador en http://localhost:3000...
start "" http://localhost:3000

echo Iniciando servidor Node.js...
node server.js
pause
