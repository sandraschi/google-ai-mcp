@echo off
echo Installing missing type definitions...
echo.

:: Install missing type definitions
call npm install --save-dev @types/jest @types/react @types/react-dom @types/node @types/socket.io-client

:: Update TypeScript configuration
echo Updating TypeScript configuration...
(
  echo {
  echo   "compilerOptions": {
  echo     "target": "es5",
  echo     "lib": ["dom", "dom.iterable", "esnext"],
  echo     "allowJs": true,
  echo     "skipLibCheck": true,
  echo     "esModuleInterop": true,
  echo     "allowSyntheticDefaultImports": true,
  echo     "strict": true,
  echo     "forceConsistentCasingInFileNames": true,
  echo     "noFallthroughCasesInSwitch": true,
  echo     "module": "esnext",
  echo     "moduleResolution": "node",
  echo     "resolveJsonModule": true,
  echo     "isolatedModules": true,
  echo     "noEmit": true,
  echo     "jsx": "react-jsx",
  echo     "baseUrl": "./src"
  echo   },
  echo   "include": ["src"],
  echo   "exclude": ["node_modules", "**/node_modules/*"]
  echo }
) > tsconfig.json

echo Type definitions installed and TypeScript configuration updated!
echo.
pause
