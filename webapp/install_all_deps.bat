@echo off
echo Installing all required dependencies...
echo.

:: Install core dependencies
call npm install react react-dom react-scripts typescript @types/node @types/react @types/react-dom

:: Install MUI and icons
call npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

:: Install routing
call npm install react-router-dom @types/react-router-dom

:: Install API and state management
call npm install axios socket.io-client @types/socket.io-client

:: Install development dependencies
call npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

echo.
echo All dependencies installed successfully!
pause
