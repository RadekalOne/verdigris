@echo off
rem VERDIGRIS - serve the game on this machine and the local network.
rem Use this to play on a laptop or tablet on the same wifi.
cd /d "%~dp0"
set PORT=8123
if not exist index.html (
  echo index.html not found.
  pause
  exit /b 1
)
set IP=
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "foreach($i in (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue)){ if($i.IPAddress -notlike '127.*'){ Write-Output $i.IPAddress; break } }"`) do set IP=%%i
echo.
echo   VERDIGRIS is serving on port %PORT%.
echo.
echo     On this PC:    http://127.0.0.1:%PORT%/
if defined IP (
  echo     On your wifi:  http://%IP%:%PORT%/   ^(same network only^)
) else (
  echo     On your wifi:  ^(could not read this PC's IPv4 address^)
)
echo.
echo   Press Ctrl+C to stop.
echo.
where node >nul 2>nul
if not errorlevel 1 (
  node serve.js
  goto :done
)
where python >nul 2>nul
if not errorlevel 1 (
  python -m http.server %PORT% --bind 0.0.0.0
  goto :done
)
echo Neither node nor python was found on PATH.
echo Opening the game directly instead:
start "" "%~dp0index.html"
:done
echo.
echo Server stopped.
pause
