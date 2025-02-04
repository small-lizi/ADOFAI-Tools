@echo off
cd /d "%~dp0"  & rem 预置目录（防止后续路径问题）

bcdedit >nul 2>&1
if '%errorlevel%' NEQ '0' (goto UACPrompt) else (goto gotAdmin)

:UACPrompt
echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
echo UAC.ShellExecute "%~s0","","","runas",1 >> "%temp%\getadmin.vbs"
"%temp%\getadmin.vbs"
exit /B

:gotAdmin
cd /d "%~dp0"  & rem 确保管理员模式下的目录正确
setlocal EnableExtensions EnableDelayedExpansion
if not "%1"=="hide" (
    start /min cmd /c "%~f0" hide
    exit
)

:killloop
taskkill /F /IM "ADOFAI Tools.exe" /T 2>nul
timeout /t 1 /nobreak >nul
tasklist | find "ADOFAI Tools.exe" >nul && goto killloop

if not exist "resources\" mkdir "resources"  & rem 确保目标目录存在

if exist "app.asar.tmp" (
    copy /Y "app.asar.tmp" "resources\app.asar"
    if errorlevel 1 (
        echo [错误] 无法复制 app.asar.tmp 到 resources\app.asar
        pause
        exit /B 1
    ) else (
        del "app.asar.tmp"
        echo 文件已成功替换
    )
)

start "" "%~dp0ADOFAI Tools.exe"
exit