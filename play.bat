@echo off
rem VERDIGRIS - launch the game
cd /d "%~dp0"
if not exist index.html (
  echo index.html not found.
  pause
  exit /b 1
)
start "" "%~dp0index.html"
echo VERDIGRIS launched. Save anytime with F.
