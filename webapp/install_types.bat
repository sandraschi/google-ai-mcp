@echo off
echo Installing TypeScript and type definitions...
echo.

:: Install TypeScript and React types
call npm install --save-dev typescript @types/node @types/react @types/react-dom

:: Install MUI types
call npm install --save-dev @types/mui__material

:: Install React Router types
call npm install --save-dev @types/react-router-dom

:: Install Socket.IO client types
call npm install --save-dev @types/socket.io-client

echo.
echo Type definitions installed successfully!
pause
