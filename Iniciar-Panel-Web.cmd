@echo off
cd /d "%~dp0"
if exist "D:\rea\.local\node-v24.21.0-win-x64\node.exe" (
 "D:\rea\.local\node-v24.21.0-win-x64\node.exe" server.mjs
) else (
 node server.mjs
)
pause
