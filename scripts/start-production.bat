@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Restaurant Order System in Production Mode...

REM Check if .env file exists
if not exist .env (
    echo ❌ Error: .env file not found. Please copy .env.example to .env and configure it.
    exit /b 1
)

REM Create necessary directories
if not exist logs mkdir logs
if not exist backups mkdir backups
if not exist uploads mkdir uploads

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not running. Please start Docker first.
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: docker-compose is not installed.
    exit /b 1
)

REM Build and start services
echo 📦 Building Docker images...
docker-compose -f docker-compose.prod.yml build --no-cache

echo 🔧 Starting services...
docker-compose -f docker-compose.prod.yml up -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be healthy...
timeout /t 30 /nobreak >nul

REM Show service status
echo 📊 Service Status:
docker-compose -f docker-compose.prod.yml ps

REM Show logs
echo 📝 Recent logs:
docker-compose -f docker-compose.prod.yml logs --tail=20

echo 🎉 Restaurant Order System is now running in production mode!
echo 📖 API Documentation: http://localhost/api/docs
echo 🏥 Health Check: http://localhost/api/health
echo.
echo 📋 Useful commands:
echo   View logs: docker-compose -f docker-compose.prod.yml logs -f
echo   Stop services: docker-compose -f docker-compose.prod.yml down
echo   Restart services: docker-compose -f docker-compose.prod.yml restart
echo   Scale app: docker-compose -f docker-compose.prod.yml up -d --scale app=3

pause