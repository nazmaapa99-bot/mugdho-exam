@echo off
title Mugdho English Master - GitHub Uploader
color 0A
echo ========================================================
echo   Mugdho English Master - GitHub-e Upload Shuru Hoche...
echo ========================================================
echo.
cd /d "D:\Antigravity projects\Mugdho exams"
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   [SUCCESS] Sob kichu GitHub-e upload hoye geche!
    echo ========================================================
) else (
    echo.
    echo [NOTE] Jodi login chaite thake, browser theke Authorize korun.
)
echo.
echo Ei window bondho korte kono key chapun...
pause >nul
