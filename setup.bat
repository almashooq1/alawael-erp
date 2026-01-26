@echo off
REM Setup and Run Script for Windows
REM سكريبت الإعداد والتشغيل لـ Windows

echo 🚀 ERP System - Setup Script for Windows
echo ========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8 or higher.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 14 or higher.
    exit /b 1
)

echo ✅ Prerequisites found

REM Setup Backend
echo.
echo Setting up Backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

if not exist ".env" (
    copy .env.example .env
    echo ⚠️  Created .env file. Please update it with your configuration.
)

echo ✅ Backend setup complete

REM Setup Frontend
echo.
echo Setting up Frontend...
cd ..\frontend

echo Installing Node dependencies...
call npm install

if not exist ".env" (
    copy .env.example .env
    echo ⚠️  Created .env file. Please update it with your configuration.
)

echo ✅ Frontend setup complete

REM Summary
echo.
echo ========================================
echo 🎉 Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo Backend (Terminal 1):
echo   cd backend
echo   venv\Scripts\activate.bat
echo   python app.py
echo.
echo Frontend (Terminal 2):
echo   cd frontend
echo   npm start
echo.
echo 📍 Access the application:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:3001
echo   API Docs: http://localhost:3001/api
echo.
echo 🔐 Default Login:
echo   Email: admin@example.com
echo   Password: admin123
echo.
