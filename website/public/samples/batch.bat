@echo off
REM Showcase: Windows batch — labels, loops, and delayed expansion.
setlocal EnableDelayedExpansion

set "APP=highlight"
set "VERSION=0.4.0"
set "RETRIES=3"

if "%~1"=="" (
    echo Usage: %~nx0 [options] input
    echo   /lang LANG   Language to highlight
    echo   /theme NAME  Theme name
    exit /b 2
)

:parse
if "%~1"=="/lang" set "LANG=%~2" & shift & shift & goto parse
if "%~1"=="/theme" set "THEME=%~2" & shift & shift & goto parse
if "%~1"=="/?" goto :usage
set "INPUT=%~1"

if not defined LANG set "LANG=auto"
if not defined THEME set "THEME=default"

if not exist "%INPUT%" (
    echo ERROR: not a file: %INPUT% 1>&2
    exit /b 1
)

for %%F in (%INPUT%) do (
    echo File: %%~nxF ^(%%~zF bytes^)
)

set /a COUNT=0
for /L %%i in (1,1,%RETRIES%) do (
    echo pass %%i/%RETRIES%
    set /a COUNT+=1
)

set FRUITS=apple banana cherry
for %%f in (%FRUITS%) do echo - %%f

call :greet Ada
call :greet
echo done, %COUNT% passes
exit /b 0

:greet
if "%~1"=="" (
    echo hello, world!
) else (
    echo hello, %~1!
)
exit /b 0

:usage
echo Prints this help.
exit /b 0
