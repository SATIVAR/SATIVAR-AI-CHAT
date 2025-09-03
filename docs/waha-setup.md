# WAHA (WhatsApp HTTP API) Setup Guide

This guide explains how to set up and configure WAHA for WhatsApp integration with SatiZap.

## Overview

WAHA (WhatsApp HTTP API) is a Docker-based service that provides HTTP API access to WhatsApp Business functionality. It acts as a bridge between WhatsApp and the SatiZap platform.

## Prerequisites

- Docker and Docker Compose installed
- Node.js environment for running management scripts
- WhatsApp Business account (optional for testing)

## Quick Start

### 1. Generate API Keys

First, generate secure API keys for WAHA:

```bash
node scripts/waha-setup.js generate-keys
```

This will output something like:
```
WAHA_API_KEY=a1b2c3d4e5f6...
WAHA_WEBHOOK_SECRET=x1y2z3a4b5c6...
```

### 2. Configure Environment Variables

Add the generated keys to your `.env` file:

```bash
# WAHA Configuration
WAHA_PORT=3000
WAHA_API_KEY=your-generated-api-key-here
WAHA_WEBHOOK_URL=http://host.docker.internal:3001/api/webhooks/whatsapp
WAHA_WEBHOOK_SECRET=your-generated-webhook-secret-here
WAHA_LOG_LEVEL=info
WAHA_MAX_SESSIONS=10
WAHA_SESSION_TIMEOUT=300000
```

### 3. Start WAHA Services

Start the WAHA Docker container:

```bash
# Basic setup
node scripts/waha-setup.js start

# With Redis (recommended for production)
node scripts/waha-setup.js start --redis

# Run in foreground for debugging
node scripts/waha-setup.js start --foreground
```

### 4. Verify Installation

Check if WAHA is running properly:

```bash
# Check service status
node scripts/waha-setup.js status

# Check health
node scripts/waha-setup.js health

# Or use the API endpoint
curl http://localhost:3001/api/health/waha
```

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `WAHA_PORT` | Port for WAHA service | 3000 | No |
| `WAHA_API_KEY` | API key for authentication | - | Yes |
| `WAHA_WEBHOOK_URL` | URL for webhook events | - | Yes |
| `WAHA_WEBHOOK_SECRET` | Secret for webhook verification | - | Yes |
| `WAHA_LOG_LEVEL` | Logging level | info | No |
| `WAHA_MAX_SESSIONS` | Maximum WhatsApp sessions | 10 | No |
| `WAHA_SESSION_TIMEOUT` | Session timeout (ms) | 300000 | No |

### Docker Compose Profiles

- **Default**: Basic WAHA service only
- **Redis**: Includes Redis for session storage (recommended for production)

```bash
# Start with Redis
docker-compose -f docker-compose.waha.yml --profile redis up -d
```

## WhatsApp Session Management

### Creating a Session

1. Start WAHA service
2. Create a new session via API:

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-api-key" \
  -d '{
    "name": "default",
    "config": {
      "webhooks": [{
        "url": "http://host.docker.internal:3001/api/webhooks/whatsapp",
        "events": ["message", "message.ack", "session.status"]
      }]
    }
  }'
```

3. Scan the returned QR code with WhatsApp Business app
4. Session will be active once QR code is scanned

### Session Status

Check session status:

```bash
curl http://localhost:3000/api/sessions \
  -H "X-Api-Key: your-api-key"
```

Possible statuses:
- `STOPPED`: Session not started
- `STARTING`: Session initializing
- `SCAN_QR_CODE`: Waiting for QR code scan
- `WORKING`: Session active and ready
- `FAILED`: Session failed to start

## Health Monitoring

### Built-in Health Checks

WAHA includes Docker health checks that monitor:
- Service responsiveness
- API endpoint availability
- Session connectivity

### SatiZap Health Endpoints

Use SatiZap's health check endpoints:

```bash
# Check WAHA connectivity
GET /api/health/waha

# Test custom WAHA configuration
POST /api/health/waha
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "your-api-key",
  "timeout": 10000
}
```

### Management Commands

```bash
# Show service status
node scripts/waha-setup.js status

# Check health
node scripts/waha-setup.js health

# View logs
node scripts/waha-setup.js logs

# Follow logs in real-time
node scripts/waha-setup.js logs --follow

# Stop services
node scripts/waha-setup.js stop
```

## Troubleshooting

### Common Issues

1. **WAHA not starting**
   - Check Docker is running
   - Verify environment variables are set
   - Check port conflicts (default: 3000)

2. **Webhook not receiving events**
   - Verify `WAHA_WEBHOOK_URL` is accessible from Docker container
   - Use `host.docker.internal` for local development
   - Check webhook secret configuration

3. **QR code not appearing**
   - Ensure session is created successfully
   - Check WAHA logs for errors
   - Verify API key authentication

4. **Session keeps disconnecting**
   - Check WhatsApp Business app is active
   - Verify session timeout settings
   - Monitor WAHA logs for connection issues

### Debug Mode

Run WAHA in foreground mode to see detailed logs:

```bash
node scripts/waha-setup.js start --foreground
```

Set debug logging level:

```bash
# In .env file
WAHA_LOG_LEVEL=debug
```

### Log Analysis

View and analyze WAHA logs:

```bash
# Show recent logs
node scripts/waha-setup.js logs --tail=50

# Follow logs in real-time
node scripts/waha-setup.js logs --follow

# Docker logs directly
docker logs waha-whatsapp
```

## Production Deployment

### Recommendations

1. **Use Redis for session storage**:
   ```bash
   node scripts/waha-setup.js start --redis
   ```

2. **Configure proper webhook URL**:
   ```bash
   WAHA_WEBHOOK_URL=https://yourdomain.com/api/webhooks/whatsapp
   ```

3. **Set up monitoring**:
   - Monitor WAHA container health
   - Set up alerts for session disconnections
   - Monitor webhook delivery success rates

4. **Security considerations**:
   - Use strong API keys
   - Enable webhook signature verification
   - Restrict network access to WAHA container

### Scaling

For multiple associations or high volume:

1. **Multiple WAHA instances**: Each association can have its own WAHA instance
2. **Load balancing**: Use reverse proxy for multiple WAHA containers
3. **Session management**: Use Redis cluster for distributed session storage

## API Reference

### WAHA API Endpoints

- `GET /api/health` - Health check
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `DELETE /api/sessions/{name}` - Delete session
- `POST /api/sendText` - Send text message
- `POST /api/sendImage` - Send image message

### SatiZap Health Endpoints

- `GET /api/health/waha` - Check WAHA connectivity
- `POST /api/health/waha` - Test custom WAHA config

For complete API documentation, see the [WAHA documentation](https://waha.devlike.pro/).