# Load Testing Guide

Complete load testing infrastructure for the HR System using Locust.

## Quick Start

### 1. Install Locust

```bash
pip install locust
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
```

### 3. Run a Test

```bash
# Smoke test (10 users, 1 minute)
locust -f locustfile.py --users 10 --spawn-rate 2 --run-time 60s --host http://localhost:3001
```

## Test Profiles

| Profile         | Users | Duration | Purpose                |
| --------------- | ----- | -------- | ---------------------- |
| **Smoke Test**  | 10    | 1 min    | Verify functionality   |
| **Baseline**    | 50    | 5 min    | Normal load            |
| **Peak Load**   | 250   | 10 min   | Expected peak capacity |
| **Stress Test** | 500   | 15 min   | Find breaking point    |
| **Spike Test**  | 1000  | 10 min   | Sudden traffic surge   |

## Files

- **locustfile.py** - Main load test scenarios
- **load-test-config.py** - Configuration and profiles
- **PERFORMANCE_BENCHMARKS.md** - Detailed targets and results

## Usage Examples

### Web UI (Interactive)

```bash
locust -f locustfile.py --host http://localhost:3001
# Open http://localhost:8089
```

### Command Line Tests

**Baseline Load**

```bash
locust -f locustfile.py \
  --users 50 \
  --spawn-rate 5 \
  --run-time 5m \
  --headless \
  --host http://localhost:3001
```

**Peak Load**

```bash
locust -f locustfile.py \
  --users 250 \
  --spawn-rate 10 \
  --run-time 10m \
  --headless \
  --host http://localhost:3001
```

**Stress Test**

```bash
locust -f locustfile.py \
  --users 500 \
  --spawn-rate 20 \
  --run-time 15m \
  --headless \
  --host http://localhost:3001
```

## Key Metrics

After test completion, check:

- **Response Time**: Average, P95, P99
- **Success Rate**: Should be > 99.5%
- **Throughput**: Requests per second
- **Error Rate**: Should be < 0.5%

## Performance Targets

| Metric            | Target  |
| ----------------- | ------- |
| Avg Response Time | < 100ms |
| P95 Response Time | < 200ms |
| P99 Response Time | < 500ms |
| Success Rate      | > 99.5% |
| Error Rate        | < 0.5%  |

## Optimization Tips

If performance doesn't meet targets:

1. **Check database indexing** - Add indexes on frequently queried fields
2. **Implement caching** - Use Redis for hot data
3. **Optimize queries** - Avoid N+1 queries
4. **Increase resources** - More CPU/memory for backend
5. **Scale horizontally** - Add multiple backend instances

## Production Readiness

Before deploying:

- [ ] Smoke test passes
- [ ] Baseline load passes
- [ ] Peak load test passes (250 users)
- [ ] Stress test identifies graceful degradation
- [ ] All endpoints meet SLA targets
- [ ] Monitoring configured
- [ ] Alerting configured

## Monitoring During Tests

```bash
# Monitor CPU/Memory
top -p $(pgrep -f "node backend")

# Monitor MongoDB
mongostat --rowcount 10

# Monitor Redis
redis-cli INFO stats
```

## Troubleshooting

**Test fails immediately:**

- Verify backend is running on http://localhost:3001
- Check credentials in load-test-config.py

**High error rates:**

- Check backend logs: `tail -f backend/logs/*.log`
- Verify database connection pool size
- Check for memory leaks

**High response times:**

- Profile slow endpoints
- Add database indexes
- Check cache hit rates

## Advanced Usage

### Custom User Behavior

Edit `locustfile.py` to add custom tasks:

```python
@task(2)
def my_endpoint(self):
    with self.client.get(
        "/api/my-endpoint",
        headers=self.headers,
        catch_response=True
    ) as response:
        if response.status_code == 200:
            response.success()
        else:
            response.failure(f"Failed: {response.status_code}")
```

### Export Results

```bash
locust -f locustfile.py \
  --users 50 \
  --run-time 5m \
  --csv=results \
  --host http://localhost:3001
```

Results saved to `results_stats.csv` and `results_failures.csv`

## Documentation

See `PERFORMANCE_BENCHMARKS.md` for:

- Detailed performance targets
- Endpoint-specific SLAs
- Result interpretation guide
- Comprehensive optimization guidelines
- Production readiness checklist

## CI/CD Integration

Run baseline test in CI/CD:

```yaml
# .github/workflows/load-test.yml
- name: Run Load Test
  run: |
    locust -f tests/load-testing/locustfile.py \
      --users 50 \
      --spawn-rate 5 \
      --run-time 5m \
      --headless \
      --host http://localhost:3001
```

---

**Version:** 1.0.0  
**Last Updated:** February 15, 2026  
**Status:** Production Ready
