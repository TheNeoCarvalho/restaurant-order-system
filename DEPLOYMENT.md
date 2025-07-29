# Restaurant Order System - Production Deployment Guide

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for development)
- PostgreSQL 15+ (if running without Docker)
- Redis 7+ (optional, for caching)

## 🚀 Quick Start

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Important**: Update the following variables in `.env`:

```env
# Database - Use strong passwords
DB_PASSWORD=your-strong-database-password

# JWT Secrets - Generate strong random strings (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters-long

# Redis Password
REDIS_PASSWORD=your-strong-redis-password

# CORS - Set your frontend URLs
CORS_ORIGIN=https://your-frontend-domain.com,https://admin.your-domain.com

# Production settings
NODE_ENV=production
LOG_LEVEL=warn
```

### 2. Production Deployment

#### Option A: Using Docker Compose (Recommended)

```bash
# Start production services
./scripts/start-production.sh
# or on Windows:
./scripts/start-production.bat
```

#### Option B: Manual Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Verify Deployment

- **API Documentation**: http://localhost/api/docs
- **Health Check**: http://localhost/api/health
- **Application**: http://localhost/api

## 🏗️ Architecture

### Services

1. **Nginx** (Port 80/443): Reverse proxy and load balancer
2. **NestJS App** (Internal): Main application (can be scaled)
3. **PostgreSQL** (Internal): Primary database
4. **Redis** (Internal): Caching and session storage

### Network

All services run in an isolated Docker network (`restaurant-network`) for security.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | `postgres` | ✅ |
| `DB_PORT` | Database port | `5432` | ✅ |
| `DB_USERNAME` | Database username | `postgres` | ✅ |
| `DB_PASSWORD` | Database password | - | ✅ |
| `DB_NAME` | Database name | `restaurant_orders` | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - | ✅ |
| `REDIS_PASSWORD` | Redis password | - | ✅ |
| `CORS_ORIGIN` | Allowed CORS origins | `*` | ❌ |
| `LOG_LEVEL` | Logging level | `warn` | ❌ |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | `60` | ❌ |
| `RATE_LIMIT_LIMIT` | Max requests per window | `100` | ❌ |

### SSL/HTTPS Configuration

1. Place SSL certificates in `./nginx/ssl/`:
   - `restaurant-app.crt` (certificate)
   - `restaurant-app.key` (private key)

2. Update `nginx.conf` to enable HTTPS

3. Set environment variables:
   ```env
   SSL_CERT_PATH=/etc/nginx/ssl/restaurant-app.crt
   SSL_KEY_PATH=/etc/nginx/ssl/restaurant-app.key
   ```

## 📊 Monitoring

### Health Checks

The application provides several health check endpoints:

- `/api/health` - Overall system health
- `/api/health/ready` - Readiness check (for load balancers)
- `/api/health/live` - Liveness check (for Kubernetes)

### Monitoring Script

Run the monitoring script to check system status:

```bash
./scripts/monitor.sh
```

This provides:
- Service status
- Health checks
- Resource usage
- Recent errors
- Database connections
- Log file sizes

### Logs

Logs are stored in the `logs/` directory:

- `app-YYYY-MM-DD.log` - Application logs
- `error-YYYY-MM-DD.log` - Error logs
- `warn-YYYY-MM-DD.log` - Warning logs

View real-time logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

## 🗄️ Database Management

### Backup

Create a database backup:

```bash
./scripts/backup-database.sh
```

Backups are stored in `./backups/` and automatically compressed.

### Restore

To restore from a backup:

```bash
# Stop the application
docker-compose -f docker-compose.prod.yml stop app

# Restore database
gunzip -c ./backups/restaurant_orders_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d restaurant_orders

# Restart application
docker-compose -f docker-compose.prod.yml start app
```

### Migrations

Database migrations run automatically on startup. To run manually:

```bash
docker-compose -f docker-compose.prod.yml exec app npm run migration:run
```

## 🔄 Scaling

### Horizontal Scaling

Scale the application to multiple instances:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Load Balancing

Nginx automatically load balances between multiple app instances.

## 🔒 Security

### Best Practices Implemented

1. **Non-root containers**: All containers run as non-root users
2. **Network isolation**: Services communicate through internal network
3. **Environment secrets**: Sensitive data in environment variables
4. **Rate limiting**: API rate limiting enabled
5. **CORS protection**: Configurable CORS origins
6. **Input validation**: All inputs validated and sanitized
7. **JWT security**: Secure token generation and validation
8. **Database security**: Connection encryption and authentication

### Additional Security Measures

1. **Firewall**: Configure firewall to only allow necessary ports
2. **SSL/TLS**: Use HTTPS in production
3. **Regular updates**: Keep Docker images and dependencies updated
4. **Monitoring**: Set up log monitoring and alerting
5. **Backups**: Regular automated backups with encryption

## 🚨 Troubleshooting

### Common Issues

#### Services won't start
```bash
# Check Docker daemon
docker info

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache
```

#### Database connection issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Check environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep DB_
```

#### High memory usage
```bash
# Check container stats
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Performance Tuning

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('restaurant_orders'));
```

#### Application Optimization
- Monitor memory usage and adjust container limits
- Use Redis for caching frequently accessed data
- Optimize database queries and add indexes
- Enable gzip compression in Nginx

## 📞 Support

### Logs Location
- Application logs: `./logs/`
- Docker logs: `docker-compose logs`
- Nginx logs: Container volume `/var/log/nginx`

### Useful Commands

```bash
# View service status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up unused resources
docker system prune -f

# Database shell
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d restaurant_orders

# Application shell
docker-compose -f docker-compose.prod.yml exec app sh
```

## 🔄 Updates

### Application Updates

1. Pull latest code
2. Build new image: `docker-compose -f docker-compose.prod.yml build app`
3. Update services: `docker-compose -f docker-compose.prod.yml up -d`

### Zero-downtime Updates

For zero-downtime updates, use a blue-green deployment strategy or rolling updates with multiple app instances.

---

For more information, see the main [README.md](README.md) file.