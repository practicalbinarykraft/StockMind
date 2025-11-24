# StockMind Monitoring Stack

Prometheus + Grafana monitoring setup for production observability.

## Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3000
# Login: admin / admin (change on first login)

# Access Prometheus
open http://localhost:9090

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Stop monitoring
docker-compose -f docker-compose.monitoring.yml down
```

## Components

### Prometheus (port 9090)
- **Purpose:** Metrics collection and storage
- **Scrape interval:** 15 seconds
- **Retention:** 30 days
- **Configuration:** `prometheus.yml`

**Targets:**
- StockMind App (production: 5000, staging: 5001)
- Node Exporter (system metrics)
- cAdvisor (container metrics)
- Prometheus itself

### Grafana (port 3000)
- **Purpose:** Visualization and dashboards
- **Default login:** admin / admin
- **Dashboards:** Auto-loaded from `grafana/dashboards/`

### Node Exporter (port 9100)
- **Purpose:** System-level metrics (CPU, memory, disk, network)

### cAdvisor (port 8080)
- **Purpose:** Container-level metrics (Docker resource usage)

## Alert Rules

Configured in `alerts.yml`:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| ApplicationDown | 2 minutes | Critical |
| HighErrorRate | >5% errors | Warning |
| HighResponseTime | >2s (p95) | Warning |
| HighMemoryUsage | >85% | Warning |
| HighCPUUsage | >80% | Warning |
| DiskSpaceLow | <15% free | Warning |
| ContainerRestartLoop | Frequent restarts | Warning |

## Configuration

### Change Grafana Password

1. **Via Environment:**
   ```bash
   export GRAFANA_ADMIN_PASSWORD=your_secure_password
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Via Grafana UI:**
   - Login → Profile → Change Password

### Add Custom Dashboards

1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `monitoring/grafana/dashboards/`
4. Restart Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`

### Configure Alerts (Email/Slack)

Edit `docker-compose.monitoring.yml`:

```yaml
grafana:
  environment:
    # Email alerts
    GF_SMTP_ENABLED: true
    GF_SMTP_HOST: smtp.gmail.com:587
    GF_SMTP_USER: your-email@gmail.com
    GF_SMTP_PASSWORD: your-app-password
    GF_SMTP_FROM_ADDRESS: alerts@stockmind.com
```

Then configure alert channels in Grafana UI:
- Settings → Alert → Notification channels

## Metrics Available

### Application Metrics
- Health status (`up`)
- HTTP requests
- Response times
- Error rates
- Active connections

### System Metrics
- CPU usage (%)
- Memory usage (MB)
- Disk space (GB)
- Network I/O (MB/s)
- Load average

### Container Metrics
- CPU per container
- Memory per container
- Network per container
- Restart count

## Queries Examples

### Prometheus Queries

```promql
# CPU usage
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk space
(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100

# Application uptime
up{job="stockmind-app"}

# Request rate
rate(http_requests_total[5m])
```

## Troubleshooting

### Prometheus can't reach application

**Error:** "context deadline exceeded" or "connection refused"

**Solution:**
- Check app is running: `curl http://localhost:5000/health`
- Update `prometheus.yml` target to correct host
- If using Docker: use `host.docker.internal` instead of `localhost`

### Grafana shows "no data"

**Solution:**
1. Check Prometheus is scraping: http://localhost:9090/targets
2. Check data source in Grafana: Settings → Data Sources
3. Verify time range in dashboard (default: Last 6 hours)

### High memory usage by Prometheus

**Solution:**
- Reduce retention: Change `--storage.tsdb.retention.time` in docker-compose.yml
- Reduce scrape frequency in `prometheus.yml`
- Clean old data: `docker-compose -f docker-compose.monitoring.yml down -v`

## Production Recommendations

### 1. Persistent Storage
Mount volumes to persistent locations:
```yaml
volumes:
  prometheus_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/monitoring/prometheus
```

### 2. Secure Grafana
- Change default password immediately
- Enable HTTPS (reverse proxy)
- Configure authentication (OAuth, LDAP)
- Restrict network access

### 3. Alert Configuration
- Setup Alertmanager for advanced routing
- Configure multiple notification channels
- Test alerts regularly
- Define escalation policies

### 4. Regular Maintenance
- Backup Grafana dashboards monthly
- Review and update alert thresholds
- Check Prometheus disk usage
- Rotate logs

## Integration with Application

To expose custom metrics from StockMind:

1. **Install prom-client:**
   ```bash
   npm install prom-client
   ```

2. **Add metrics endpoint:**
   ```typescript
   import client from 'prom-client';

   // Collect default metrics
   client.collectDefaultMetrics();

   // Custom metrics
   const httpRequestDuration = new client.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status_code']
   });

   // Expose /metrics endpoint
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', client.register.contentType);
     res.end(await client.register.metrics());
   });
   ```

3. **Update prometheus.yml:**
   ```yaml
   - job_name: 'stockmind-app'
     metrics_path: '/metrics'  # Change from /health
   ```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Gallery](https://grafana.com/grafana/dashboards/)
