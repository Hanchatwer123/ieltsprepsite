@echo off
setlocal EnableDelayedExpansion

echo [✓] Starting Python server on all interfaces (0.0.0.0)...

for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4.*"') do (
    set "ip=%%A"
    goto :found
)
:found
set "ip=%ip: =%"
start "" http://%ip%:8000/index.html

netsh advfirewall firewall add rule name="Allow Python 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

python -m http.server 8000 --bind 0.0.0.0

pause
