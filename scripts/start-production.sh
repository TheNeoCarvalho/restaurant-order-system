#!/bin/bash

# Production startup script for Restaurant Order System

set -e

echo "🚀 Starting Restaurant Order System in Production Mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("DB_HOST" "DB_NAME" "DB_USERNAME" "DB_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set."
        exit 1
    fi
done

# Create necessary directories
mkdir -p logs
mkdir -p backups
mkdir -p uploads

# Set proper permissions
chmod 755 logs
chmod 755 backups
chmod 755 uploads

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    exit 1
fi

# Build and start services
echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🔧 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        echo "✅ Services are healthy!"
        break
    fi
    
    if [ $counter -eq $timeout ]; then
        echo "❌ Timeout waiting for services to be healthy."
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
    
    sleep 5
    counter=$((counter + 5))
    echo "⏳ Still waiting... ($counter/$timeout seconds)"
done

# Show service status
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo "📝 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "🎉 Restaurant Order System is now running in production mode!"
echo "📖 API Documentation: http://localhost/api/docs"
echo "🏥 Health Check: http://localhost/api/health"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  Scale app: docker-compose -f docker-compose.prod.yml up -d --scale app=3"