@echo off
echo Setting up Gemini Tools UI project structure...
echo.

:: Create directories
mkdir src\components\layout
mkdir src\components\common
mkdir src\features\chat
mkdir src\features\image
mkdir src\features\movie
mkdir src\services
mkdir src\hooks
mkdir src\utils

:: Create empty files for components
echo. > src\components\layout\Layout.tsx
echo. > src\components\layout\Header.tsx
echo. > src\components\layout\Sidebar.tsx
echo. > src\components\common\LoadingSpinner.tsx
echo. > src\components\common\ErrorBoundary.tsx
echo. > src\components\common\NotFound.tsx
echo. > src\features\chat\ChatInterface.tsx
echo. > src\features\image\ImageGenerator.tsx
echo. > src\features\movie\MoviePipeline.tsx
echo. > src\services\api.ts
echo. > src\services\socket.ts
echo. > src\hooks\useTheme.ts
echo. > src\utils\constants.ts
echo. > src\utils\helpers.ts

echo.
echo Project structure created successfully!
pause
