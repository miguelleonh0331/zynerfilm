@echo off
cd /d "%~dp0"
if exist "dist\electron\Zynerfilmer-win32-x64\Zynerfilmer.exe" (
  start "" "dist\electron\Zynerfilmer-win32-x64\Zynerfilmer.exe"
  exit /b 0
)
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" "."
  exit /b 0
)
echo Ejecuta Construir-Electron.ps1 para preparar Zynerfilmer.
pause
