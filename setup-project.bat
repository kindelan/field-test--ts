@echo off
title FT Manager Project Setup
echo ============================================
echo     FT MANAGER - PROJECT SETUP (WINDOWS)
echo ============================================
echo.

:: ---------- CHECK NODE INSTALLATION ----------
echo Checking Node.js installation...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is NOT installed.
    echo Please install Node.js from:
    echo https://nodejs.org/
    echo and THEN run this script again.
    pause
    exit /b
)
echo ✅ Node.js found: %ERRORLEVEL%
echo.

:: ---------- CHECK NPM INSTALLATION ----------
echo Checking npm installation...
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is NOT available.
    echo Something is wrong with your Node installation.
    pause
    exit /b
)
echo ✅ npm found
echo.

:: ---------- INSTALL TYPESCRIPT ----------
echo Installing TypeScript globally...
npm install -g typescript
echo ✅ TypeScript installed
echo.

:: ---------- CREATE PROJECT STRUCTURE ----------
echo Creating folder structure...
mkdir app
mkdir app\dao
mkdir app\dto
mkdir app\utils
mkdir app\services
mkdir app\controllers

mkdir assets
mkdir pages
mkdir dist
echo ✅ Folders created
echo.

:: ---------- CREATE tsconfig.json ----------
echo Creating tsconfig.json...
(
echo {
echo   "compilerOptions": {
echo     "target": "ES2020",
echo     "module": "ES2020",
echo     "moduleResolution": "Node",
echo     "strict": false,
echo     "outDir": "./dist",
echo     "rootDir": "./",
echo     "allowJs": false
echo   },
echo   "include": [
echo     "app/**/*.ts"
echo   ]
echo }
) > tsconfig.json
echo ✅ tsconfig.json created
echo.

:: ---------- INITIALIZE NPM ----------
echo Initializing Node project...
npm init -y
echo ✅ package.json created
echo.

:: ---------- INSTALL PROJECT DEPENDENCIES ----------
echo Installing project dependencies...
npm install
echo ✅ Dependencies installed
echo.

:: ---------- FINAL MESSAGE ----------
echo ✅ ✅ ✅ PROJECT SETUP COMPLETED ✅ ✅ ✅
echo.
echo Now place your .ts files under the /app folder
echo and your HTML files in /pages.
echo.
echo When you're ready to compile:
echo    npx tsc
echo.
echo Output will appear in /dist.
echo.
pause