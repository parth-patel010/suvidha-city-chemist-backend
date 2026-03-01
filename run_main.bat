@echo off
setlocal EnableDelayedExpansion
if "%~1" neq "" (cd /d "%~1") else (cd /d "%~dp0")
color 0B

REM Load .env into environment so DATABASE_URL etc. are set for this session
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (".env") do if /i "%%a"=="DATABASE_URL" set "DATABASE_URL=%%b"

cls

echo.
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|   ######   ###     ###     ##     ##  #######  ######                       ^|
echo ^|   #     #  # ##   ## #     ##     ##  #        #     #                      ^|
echo ^|   ######   #  ## ##  #     ##  #  ##  #####    ######                       ^|
echo ^|   #     #  #   ###   #     ## ### ##  #        #     #                      ^|
echo ^|   ######   #    #    #      #######   ######   ######                       ^|
echo ^|   #     #  #         #      ##  ##   #        #     #                       ^|
echo ^|                                                                            ^|
echo ^|              ######   ##     ##   ##  ####  ##  ######   ##    ##          ^|
echo ^|             #        ##     ##   ##   ##   ##  #        ##    ##           ^|
echo ^|             #####    ##     ##   ##   ##   ##  #####    ########           ^|
echo ^|             #        ##     ##   ##   ##   ##  #        ##    ##           ^|
echo ^|             ######   #######   ####   ##   ##  ######   ##    ##           ^|
echo ^|             #     #  #     #    ##    ##   ##  #        ##    ##           ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|                     P M   W E B   S O L U T I O N S                        ^|
echo ^|                                                                            ^|
echo ^|           Suvidha City Chemist / Suvidha Pharmacy Pro v1.0.0               ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|                            Shri Ram                                         ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo.
echo.

echo +------------------------------------------------------------------------------+
echo ^|  [SYSTEM]  Initializing Suvidha Pharmacy Pro...                             ^|
echo +------------------------------------------------------------------------------+
echo.

REM ==============================================================================
REM  PHASE 1: Environment Checks
REM ==============================================================================
echo  +-- PHASE 1: Environment Verification --------------------------------------+
echo  ^|                                                                         ^|

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo  ^|  [OK]  Node.js            : !NODE_VER!
) else (
    echo  ^|  [X]  Node.js            : NOT FOUND - Please install Node.js 18+
    echo  ^|                                                                         ^|
    echo  +-----------------------------------------------------------------------------+
    echo.
    echo  FATAL: Node.js is required. Download from https://nodejs.org
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
    echo  ^|  [OK]  npm                : v!NPM_VER!
) else (
    echo  ^|  [X]  npm                : NOT FOUND
    echo  +-----------------------------------------------------------------------------+
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PY_VER=%%i
    echo  ^|  [OK]  Python             : !PY_VER!
) else (
    where python3 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=*" %%i in ('python3 --version 2^>^&1') do set PY_VER=%%i
        echo  ^|  [OK]  Python             : !PY_VER!
    ) else (
        echo  ^|  [X]  Python             : NOT FOUND - AI Service will be unavailable
    )
)

REM Check pip
where pip >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('pip --version 2^>^&1') do set PIP_VER=%%i
    echo  ^|  [OK]  pip                : Installed
) else (
    echo  ^|  [~]  pip                : NOT FOUND - AI Service deps may fail
)

echo  ^|                                                                         ^|
echo  +-----------------------------------------------------------------------------+
echo.

REM ==============================================================================
REM  PHASE 2: Dependency Installation
REM ==============================================================================
echo  +-- PHASE 2: Dependency Check ^& Installation ---------------------------------+
echo  ^|                                                                         ^|

REM Check Node modules
if exist "node_modules\" (
    echo  ^|  [OK]  Node modules       : Found
) else (
    echo  ^|  [~]  Node modules       : Not found - Installing...
    echo  ^|                                                                         ^|
    call npm install
    if %ERRORLEVEL% EQU 0 (
        echo  ^|  [OK]  Node modules       : Installed successfully
    ) else (
        echo  ^|  [X]  Node modules       : Installation FAILED
        echo  +-----------------------------------------------------------------------------+
        pause
        exit /b 1
    )
)

REM Check critical node packages
call npx --no-install tsx --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  ^|  [OK]  tsx                : Available
) else (
    echo  ^|  [~]  tsx                : Installing...
    call npm install tsx
)

REM Check AI Service Python dependencies
if exist "requirements.txt" (set "REQ_FILE=requirements.txt") else if exist "ai-service\requirements.txt" (set "REQ_FILE=ai-service\requirements.txt") else (set "REQ_FILE=")
if defined REQ_FILE (
    echo  ^|  [~]  AI Service deps    : Checking...
    pip show flask >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo  ^|  [OK]  AI Service deps    : All packages found
    ) else (
        echo  ^|  [~]  AI Service deps    : Installing...
        python -m pip install -r "!REQ_FILE!"
        if !ERRORLEVEL! EQU 0 (
            echo  ^|  [OK]  AI Service deps    : Installed successfully
        ) else (
            echo  ^|  [!]  AI Service deps    : Some packages failed (non-critical)
        )
    )
) else (
    echo  ^|  [!]  AI Service deps    : requirements.txt not found
)

echo  ^|                                                                         ^|
echo  +-----------------------------------------------------------------------------+
echo.

REM ==============================================================================
REM  PHASE 3: Database Setup
REM ==============================================================================
echo  +-- PHASE 3: Database Setup ------------------------------------------------+
echo  ^|                                                                         ^|

if defined DATABASE_URL (
    echo  ^|  [OK]  DATABASE_URL       : Configured
    echo  ^|  [~]  Running schema push...
    call npx drizzle-kit push >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo  ^|  [OK]  Schema sync        : Complete
        echo  ^|  [~]  Seeding default users and data...
        call npm run db:seed >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo  ^|  [OK]  Seed              : Admin and credentials created
        ) else (
            echo  ^|  [~]  Seed              : Already seeded or check logs
        )
    ) else (
        echo  ^|  [!]  Schema sync        : Check database connection
    )
) else (
    echo  ^|  [!]  DATABASE_URL       : NOT SET - Database features disabled
    echo  ^|       Set DATABASE_URL environment variable to enable
)

echo  ^|                                                                         ^|
echo  +-----------------------------------------------------------------------------+
echo.

REM ==============================================================================
REM  PHASE 4: Launch Services
REM ==============================================================================
echo  +-- PHASE 4: Starting Services ---------------------------------------------+
echo  ^|                                                                         ^|

REM Start AI Service in background
echo  ^|  [~]  AI Service          : Starting on port 8000...
if exist "ai-service\app.py" (
    if exist "requirements.txt" (set "REQ=requirements.txt") else (set "REQ=ai-service\requirements.txt")
    python -m pip install -r "!REQ!" >nul 2>&1
    start /B "AI-Service" cmd /c "cd /d "%~dp0ai-service" && python app.py"
    timeout /t 3 /nobreak >nul
    
    REM Check if AI service is running
    powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/health' -TimeoutSec 5 -UseBasicParsing; if($r.StatusCode -eq 200) { Write-Host '  ^|  [OK]  AI Service          : RUNNING (port 8000)' } else { Write-Host '  ^|  [!]  AI Service          : Started but health check failed' } } catch { Write-Host '  ^|  [!]  AI Service          : Starting up (may need a moment)' }" 2>nul
) else (
    echo  ^|  [!]  AI Service          : app.py not found
)

echo  ^|                                                                         ^|
echo  ^|  [~]  Backend + Frontend   : Starting on port 5000...
echo  ^|                                                                         ^|
echo  +-----------------------------------------------------------------------------+
echo.

echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|           #######  ####  ##  ##  #######  ##   ##  #######                   ^|
echo ^|           #        ##    ##  ##  #        ##   ##  #                        ^|
echo ^|           #######  ##    ######  #####    ##   ##  #######                  ^|
echo ^|                #   ##    ##  ##  #        ##   ##  #                        ^|
echo ^|           #######  ##    ##  ##  #######   #####   #######                  ^|
echo ^|           #        ##    ##  ##  #            ##   #                        ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|   SERVICE              PORT       STATUS                                   ^|
echo ^|   --------------------------------                                         ^|
echo ^|   AI Microservice       8000       * Launched                               ^|
echo ^|   Backend (Express)     5000       * Launching...                           ^|
echo ^|   Frontend (Vite)       5000       * Launching...                           ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|   ACCESS URLS:                                                             ^|
echo ^|   * App:        http://localhost:5000                                      ^|
echo ^|   * AI Health:  http://localhost:8000/health                               ^|
echo ^|                                                                            ^|
echo ^|   DEFAULT CREDENTIALS:                                                    ^|
echo ^|   * Admin:    admin / admin123                                             ^|
echo ^|   * Manager:  manager1 / password123                                       ^|
echo ^|   * Cashier:  cashier1 / password123                                       ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo ^|                                                                            ^|
echo ^|              Powered by PM Web Solutions ^| Shri Ram                        ^|
echo ^|          Suvidha Pharmacy Pro v1.0.0 ^| All Rights Reserved                 ^|
echo ^|                                                                            ^|
echo +==============================================================================+
echo.
echo  Press Ctrl+C to stop all services
echo.

REM Start main application (this blocks)
call npm run dev
