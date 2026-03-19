# ALAWAEL Quality System - Phase 3 Cheat Sheet
# Quick Command Reference

## Core Quality Commands

### Quality+ Advanced CLI
```bash
./quality+ quick              # Fast validation (~20 min)
./quality+ full               # Complete validation (~60 min)
./quality+ service <name>     # Single service check
./quality+ monitor            # Performance analysis
./quality+ coverage           # Coverage report
./quality+ report             # View history
./quality+ help               # Show help
```

### Quick by Service
```bash
./quality+ service backend    # Backend API (894 tests)
./quality+ service graphql    # GraphQL service
./quality+ service finance    # Finance module
./quality+ service supply-chain  # Supply chain
```

---

## Monitoring Tools

### Live Scorecard
```bash
./scripts/quality-scorecard.sh              # Single display
./scripts/quality-scorecard.sh --watch      # Live updates (5 sec)
```

### SLA Tracker
```bash
./scripts/quality-sla-tracker.sh dashboard                    # View status
./scripts/quality-sla-tracker.sh update backend 99.95 180 85 99.8  # Update
./scripts/quality-sla-tracker.sh report     # Weekly report
```

### Performance Monitor
```bash
./scripts/quality-performance-monitor.sh
# Outputs timing analysis to .quality-metrics/
```

### Coverage Analyzer
```bash
./scripts/coverage-analyzer.sh
# Outputs coverage percentages by service
```

---

## Traditional Quality Commands (Phase 2)

### Using ./quality CLI
```bash
./quality all                # All services (~60 min)
./quality quick              # Fast path (~20 min)
./quality backend            # Backend only
./quality graphql            # GraphQL only
./quality finance            # Finance only
./quality supply-chain       # Supply chain full
./quality frontend           # Frontend only
./quality status             # System status
./quality help               # Show help
```

### Using npm Directly
```bash
cd backend && npm run quality:ci        # Strict validation
cd backend && npm run quality:push      # Fast feedback
cd backend && npm run quality:guard     # Guard checks only
cd backend && npm test                  # Raw tests
```

### Using Make
```bash
make quality:all             # All services
make quality:backend         # Backend only
make quality:quick           # Quick validation
make quality:graphql         # GraphQL only
make quality:finance         # Finance only
make quality:supply-chain    # Supply chain only
```

---

## Slack Integration

### Setup
```bash
# Create webhook (5 minutes)
# https://api.slack.com/messaging/webhooks

# Store locally
cat > .env.slack << 'EOF'
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
SLACK_CHANNEL="#quality-alerts"
EOF

# Test
source .env.slack
curl -X POST -H 'Content-type: application/json' \
  -d '{"text":"✅ Test"}' $SLACK_WEBHOOK_URL
```

### Send Notifications
```bash
# Success notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ Backend quality check passed"}' \
  $SLACK_WEBHOOK_URL

# Failure alert
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"❌ GraphQL tests failing"}' \
  $SLACK_WEBHOOK_URL
```

---

## Development Workflow

### Before Pushing Code
```bash
./quality+ quick             # Quick validation
./quality+ coverage          # Check coverage
git push                     # Safe to push
```

### Before Merging PR
```bash
./quality+ full              # Complete validation
./scripts/quality-scorecard.sh  # Check health
git merge                    # Safe to merge
```

### Debugging Issues
```bash
./quality+ service <name>    # Get specific error
./quality+ monitor           # Check performance
./quality+ coverage          # Check coverage gaps
./quality+ report            # Review history
```

### Daily Status
```bash
./scripts/quality-scorecard.sh  # Morning check
./scripts/quality-sla-tracker.sh dashboard  # SLA status
```

---

## GitHub Actions Tasks

### List Available Tasks
```bash
# VS Code
Ctrl+Shift+B -> Show Tasks

# Terminal
npm run build
npm test
```

### Run via VS Code
```
Ctrl+Shift+B -> Select Task:
- Test: SCM Frontend (Jest)
- Start Backend
- Run Tests - Backend
- Format Code
- Lint Code
```

---

## CI/CD Workflows (GitHub Actions)

### Automatic Triggers
```
Backend Quality Push    → On: git push to main
Backend Quality Gate    → On: Pull Request
GraphQL Quality Gate    → On: PR + push to graphql/
Finance Quality Gate    → On: PR + push to finance-module/
Supply Chain Quality    → On: PR + push to supply-chain-management/
System Quality Gate     → On: PR to main (all services)
```

### Manual Trigger
```bash
# Go to GitHub Actions
# Select workflow
# Click "Run workflow"
```

---

## Data & Reports

### Reports Location
```bash
.quality-reports/          # Quality check reports
.quality-metrics/          # Performance metrics
.quality-sla/              # SLA tracking data
.quality-sla/history/      # Historical SLA data
```

### View Recent Reports
```bash
ls -lh .quality-reports/
ls -lh .quality-metrics/
ls -lh .quality-sla/
```

### Cleanup Old Data
```bash
# Keep last 7 days
find .quality-reports -mtime +7 -delete
find .quality-metrics -mtime +7 -delete
find .quality-sla -mtime +7 -delete
```

---

## Scheduling (Cron)

### Daily Morning Scorecard
```bash
# Add to crontab
0 9 * * * cd /path && ./scripts/quality-scorecard.sh >> /var/log/quality.log
```

### Weekly SLA Report
```bash
# Monday 9 AM
0 9 * * MON cd /path && ./scripts/quality-sla-tracker.sh report >> /var/log/sla.log
```

### Hourly Health Check
```bash
# Every hour
0 * * * * cd /path && ./scripts/quality-scorecard.sh >> /var/log/hourly.log
```

### Setup All Crons
```bash
# Use crontab -e to edit
crontab -e

# Add all three above schedules
# Save and exit
crontab -l  # Verify
```

---

## Environment Variables

### Control Execution
```bash
# Verbose output
VERBOSE=true ./quality+ quick

# Custom timeout (seconds)
TIMEOUT=300 ./quality+ service backend

# Parallel execution (if supported)
PARALLEL=true ./quality+ full

# Custom report directory
REPORT_DIR="/tmp/reports" ./quality+ quick
```

### Slack Configuration
```bash
# Set webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# Set channel
export SLACK_CHANNEL="#quality-alerts"

# Load from file
source .env.slack
```

---

## Help & Documentation

### Command Help
```bash
./quality + help           # All commands
./quality help             # Legacy CLI help
npm --help                 # npm help
make --help                # Make help
```

### Documentation Files
```bash
QUICKSTART_QUALITY.md                    # 5-min start
SYSTEM_QUALITY_GUIDE.md                  # Complete guide
DEVELOPER_WORKFLOW_GUIDE.md              # Team guide
PHASE3_ADVANCED_MONITORING_GUIDE.md      # Phase 3 features
SLACK_INTEGRATION_GUIDE.md               # Slack setup
PHASE2_QUALITY_EXPANSION_COMPLETE.md     # Phase 2 report
PHASE3_COMPLETION_REPORT.md              # Phase 3 report
```

### Quick File Viewing
```bash
cat QUICKSTART_QUALITY.md
head -50 SYSTEM_QUALITY_GUIDE.md
grep -i "slack" PHASE3_ADVANCED_MONITORING_GUIDE.md
```

---

## Troubleshooting Quick Fixes

### Issue: Script Not Found
```bash
chmod +x ./quality+
chmod +x ./scripts/*.sh
ls -la ./quality+  # Should have x flag
```

### Issue: Module Not Found
```bash
cd backend && npm install
cd graphql && npm install
cd finance-module/backend && npm install
cd supply-chain-management/backend && npm install
cd supply-chain-management/frontend && npm install
```

### Issue: Tests Failing
```bash
# Get specific error
./quality+ service backend

# Check individual suite
cd backend && npm test -- --testNamePattern="Auth"

# Full output
cd backend && npm run quality:ci -- --verbose
```

### Issue: Timeout
```bash
# Increase timeout
TIMEOUT=300 ./quality+ service backend

# Check performance
./quality+ monitor

# Review logs
cat .quality-reports/latest.txt
```

### Issue: Slack Not Working
```bash
# Test webhook
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test"}'

# Expected: ok:true
# Verify webhook URL is correct
# Check channel name
```

---

## Performance Targets

| Service | Target Duration | Current | Status |
|---------|-----------------|---------|--------|
| Backend | 35 min | ~32 min | ✅ Good |
| GraphQL | 5 min | ~2 min | ✅ Good |
| Finance | 5 min | ~3 min | ✅ Good |
| Supply Chain | 10 min | ~8 min | ✅ Good |
| Frontend | 5 min | ~2 min | ✅ Good |

---

## SLA Targets

| Service | Uptime | Response | Coverage | Test Pass |
|---------|--------|----------|----------|-----------|
| Backend | 99.9% | 200ms | 80% | 99.5% |
| GraphQL | 99.5% | 150ms | 75% | 99.0% |
| Finance | 99.95% | 300ms | 85% | 99.8% |
| Supply Chain | 99.0% | 250ms | 70% | 98.5% |

---

## Key Files

```
Core Configuration
├── backend/package.json              (894 tests)
├── graphql/package.json              (quality scripts)
├── finance-module/backend/package.json
├── supply-chain-management/backend/package.json
├── supply-chain-management/frontend/package.json
└── .github/workflows/                (6 GitHub Actions)

Scripts
├── ./quality                         (Phase 2 CLI)
├── ./quality+                        (Phase 3 Advanced)
├── ./scripts/quality-*.sh            (Supporting tools)
└── ./scripts/github/enable-branch-protection.ps1

Documentation
├── QUICKSTART_QUALITY.md             (5-min start)
├── SYSTEM_QUALITY_GUIDE.md           (Complete guide)
├── DEVELOPER_WORKFLOW_GUIDE.md       (Team guide)
├── PHASE3_ADVANCED_MONITORING_GUIDE.md (Phase 3)
├── SLACK_INTEGRATION_GUIDE.md        (Slack setup)
└── PHASE3_COMPLETION_REPORT.md       (Phase 3 report)

Data Directories
├── .quality-reports/                 (Quality check reports)
├── .quality-metrics/                 (Performance metrics)
└── .quality-sla/                     (SLA tracking)
```

---

## Common Scenarios

### Scenario: Code Ready, Need Quick Validation
```bash
./quality+ quick
# If passes: git push
# If fails: ./quality+ service <name> to debug
```

### Scenario: Release Preparation
```bash
./quality+ full
./scripts/quality-scorecard.sh
./scripts/quality-sla-tracker.sh dashboard
# Review all metrics before release
```

### Scenario: Daily Status Check
```bash
./scripts/quality-scorecard.sh
./scripts/quality-sla-tracker.sh dashboard
# Share with team via Slack
```

### Scenario: Performance Issues
```bash
./quality+ monitor
# Check duration trends
# Identify slow services
# Plan optimization
```

### Scenario: Coverage Dropped
```bash
./quality+ coverage
./scripts/coverage-analyzer.sh
# Identify gaps
# Add missing tests
# Verify coverage restored
```

---

## Quick References

```bash
# Start fresh
./quality+ help

# Get system health
./scripts/quality-scorecard.sh

# Check SLA compliance
./scripts/quality-sla-tracker.sh dashboard

# Full validation
./quality+ full

# Get help on specific tool
<command> --help
<command> help

# View documentation
cat <doc>.md
head -100 <doc>.md
grep "keyword" <doc>.md
```

---

## Status Summary

✅ **Phase 1**: Backend stabilization (894 tests passing)
✅ **Phase 2**: 5-service unification (6 workflows, unified scripts)
✅ **Phase 3**: Advanced monitoring (real-time scorecard, SLA tracking)
⏭️  **Phase 4**: Optional enhancements (Web dashboard, ML anomaly detection)

**Current Version**: 2.0.0 (Advanced)
**Status**: Production Ready
**Last Updated**: March 1, 2026
