@echo off
echo Setting up Gemini Tools UI...
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check npm version
for /f "tokens=*" %%a in ('npm --version') do set npm_version=%%a
echo Found npm version: %npm_version%

:: Create package.json if it doesn't exist
if not exist package.json (
    echo Creating package.json...
    call npm init -y
)

echo Installing dependencies...
call npm install --save react@^18.2.0 react-dom@^18.2.0 react-scripts@5.0.1
call npm install --save @mui/material@^5.14.10 @emotion/react@^11.11.1 @emotion/styled@^11.11.0 @mui/icons-material@^5.14.10
call npm install --save react-router-dom@^6.14.2 @types/react-router-dom@^5.3.3
call npm install --save axios@^1.4.0 socket.io-client@^4.7.1 @types/socket.io-client@^3.0.0
call npm install --save-dev typescript@^5.1.6 @types/node@^20.4.1 @types/react@^18.2.15 @types/react-dom@^18.2.7
call npm install --save-dev @typescript-eslint/parser@^6.0.0 @typescript-eslint/eslint-plugin@^6.0.0

echo.
echo Verifying installation...
if exist node_modules (
    echo Dependencies installed successfully in node_modules/
) else (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Running TypeScript type check...
call npx tsc --noEmit
if %ERRORLEVEL% EQU 0 (
    echo TypeScript type check passed!
) else (
    echo Warning: TypeScript found some type errors
)

echo.
echo Setup complete! You can now start the development server with:
echo   npm start
echo.
pause
