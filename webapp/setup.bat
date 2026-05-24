@echo off
echo Setting up Gemini Tools UI...
echo.

echo Step 1: Install Node.js dependencies
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Create necessary directories
mkdir src\components
mkdir src\features
mkdir src\features\chat
mkdir src\features\image
mkdir src\features\movie-pipeline

if not exist "src\components\ThemeSwitch.tsx" (
    echo Creating placeholder components...
    echo // Placeholder for ThemeSwitch > src\components\ThemeSwitch.tsx
    echo // Placeholder for ChatInterface > src\features\chat\ChatInterface.tsx
    echo // Placeholder for ImageGenerator > src\features\image\ImageGenerator.tsx
    echo // Placeholder for MoviePipeline > src\features\movie-pipeline\MoviePipeline.tsx
)

echo.
echo Setup completed successfully!
echo Run 'npm start' to start the development server.
pause
