@echo off
rem ---------------------------------------------------------------------------
rem dsh-locale-ru: standalone launcher for the DSH web GUI.
rem
rem Why this exists: the GUI must survive independently of whichever agent
rem session started it, and it must not start while an older dsh web still holds
rem the port (an EADDRINUSE start would leave a GUI-less process and a dead URL).
rem
rem Used by the scheduled task "dsh-web-3080":
rem   schtasks /create /tn dsh-web-3080 /tr "C:\Users\zavtr\.dsh\locale-ru\bin\run-web.cmd 3080" ...
rem   schtasks /run    /tn dsh-web-3080
rem
rem TEMP/TMP must live outside the session workspace (C:\Users\zavtr), otherwise
rem dsh's Windows ACL sandbox refuses every confined shell call.
rem ---------------------------------------------------------------------------
setlocal
set "PORT=%~1"
if "%PORT%"=="" set "PORT=3080"

set "TEMP=C:\Temp"
set "TMP=C:\Temp"
if not exist "%TEMP%" mkdir "%TEMP%" >nul 2>&1
set "LOG=C:\Temp\dsh-web-%PORT%.log"
echo [dsh-ru] %DATE% %TIME% launcher start >> "%LOG%"

rem Refuse to start when the port is already served: two dsh web processes race
rem for 3080 and the loser stays alive with no listener at all.
netstat -ano | findstr /r /c:"TCP.*:%PORT%.*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [dsh-ru] port %PORT% is already in use; nothing started. >> "%LOG%"
  exit /b 3
)

echo [dsh-ru] starting npx @deepseek-ai/dsh web --port %PORT% >> "%LOG%"
cd /d "C:\Users\zavtr"
call npx --yes @deepseek-ai/dsh web --port %PORT% >> "%LOG%" 2>&1
echo [dsh-ru] dsh web exited with code %ERRORLEVEL% >> "%LOG%"
