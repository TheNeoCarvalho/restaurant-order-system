#!/bin/bash

# Monitoring script for Restaurant Order System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Restaurant Order System - Health Monitor${NC}"
echo "=================================================="

# Check if services are running
echo -e "\n${BLUE}📊 Service Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Check health endpoints
echo -e "\n${BLUE}🏥 Health Checks:${NC}"

# Application health
APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")
if [ "$APP_HEALTH" = "200" ]; then
    echo -e "✅ Application: ${GREEN}Healthy${NC}"
else
    echo -e "❌ Application: ${RED}Unhealthy (HTTP $APP_HEALTH)${NC}"
fi

# Database health
DB_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres 2>/dev/null && echo "ready" || echo "not ready")
if [ "$DB_HEALTH" = "ready" ]; then
    echo -e "✅ Database: ${GREEN}Connected${NC}"
else
    echo -e "❌ Database: ${RED}Disconnected${NC}"
fi

# Redis health
REDIS_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>/dev/null || echo "FAIL")
if [ "$REDIS_HEALTH" = "PONG" ]; then
    echo -e "✅ Redis: ${GREEN}Connected${NC}"
else
    echo -e "❌ Redis: ${RED}Disconnected${NC}"
fi

# Resource usage
echo -e "\n${BLUE}💻 Resource Usage:${NC}"

# Docker stats
echo -e "${YELLOW}Container Stats:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker-compose -f docker-compose.prod.yml ps -q)

# Disk usage
echo -e "\n${YELLOW}Disk Usage:${NC}"
df -h | grep -E "(Filesystem|/dev/)"

# Memory usage
echo -e "\n${YELLOW}System Memory:${NC}"
free -h

# Log analysis
echo -e "\n${BLUE}📝 Recent Errors (last 10):${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=100 | grep -i error | tail -10 || echo "No recent errors found"

# Database connections
echo -e "\n${BLUE}🔗 Database Connections:${NC}"
DB_CONNECTIONS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d restaurant_orders -c "SELECT count(*) FROM pg_stat_activity;" -t 2>/dev/null | xargs || echo "N/A")
echo "Active connections: $DB_CONNECTIONS"

# Application metrics (if available)
echo -e "\n${BLUE}📈 Application Metrics:${NC}"
METRICS=$(curl -s http://localhost:9090/metrics 2>/dev/null || echo "Metrics not available")
if [ "$METRICS" != "Metrics not available" ]; then
    echo "✅ Metrics endpoint accessible"
    # Extract some basic metrics
    echo "$METRICS" | grep -E "(http_requests_total|nodejs_heap_size_used_bytes)" | head -5
else
    echo "⚠️ Metrics endpoint not accessible"
fi

# Check log file sizes
echo -e "\n${BLUE}📁 Log File Sizes:${NC}"
if [ -d "logs" ]; then
    du -sh logs/* 2>/dev/null || echo "No log files found"
else
    echo "Logs directory not found"
fi

# Summary
echo -e "\n${BLUE}📋 Summary:${NC}"
TOTAL_ISSUES=0

if [ "$APP_HEALTH" != "200" ]; then
    ((TOTAL_ISSUES++))
fi

if [ "$DB_HEALTH" != "ready" ]; then
    ((TOTAL_ISSUES++))
fi

if [ "$REDIS_HEALTH" != "PONG" ]; then
    ((TOTAL_ISSUES++))
fi

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo -e "✅ ${GREEN}All systems operational${NC}"
else
    echo -e "⚠️ ${YELLOW}$TOTAL_ISSUES issue(s) detected${NC}"
fi

echo -e "\n${BLUE}🕐 Monitor completed at: $(date)${NC}"