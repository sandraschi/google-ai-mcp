@echo off
echo Installing Gemini Tools UI dependencies...
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed or not in PATH
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

echo Installing npm dependencies...
call npm install --save @mui/material @emotion/react @emotion/styled
call npm install --save @mui/icons-material
call npm install --save react-router-dom
call npm install --save axios
call npm install --save socket.io-client
call npm install --save @types/react @types/react-dom @types/node
call npm install --save @types/react-router-dom
call npm install --save typescript @types/node
call npm install --save @testing-library/react @testing-library/jest-dom @testing-library/user-event

echo.
echo Installing development dependencies...
call npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
echo.

echo Dependencies installed successfully!
pause
