#!/bin/bash
# ===================================================================
# AlAwael ERP - Load Testing Script
# Uses Apache Bench with realistic scenarios
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${1:-http://localhost:5000}"
TEST_DURATION="${2:-300}"  # 5 minutes default
CONCURRENT_USERS="${3:-100}"
RAMP_UP_TIME=30  # seconds

# Test results
RESULTS_DIR="./load-test-results-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ===================================================================
# TEST ENDPOINTS
# ===================================================================

# Health Check
test_health() {
    log_info "Testing health endpoint..."
    ab -n 100 -c 10 -t 30 \
        -g "$RESULTS_DIR/health.tsv" \
        "$API_URL/health" > "$RESULTS_DIR/health.txt" 2>&1
    log_success "Health check completed"
}

# Authentication (Login)
test_authentication() {
    log_info "Testing authentication (login)..."
    ab -n 500 -c 20 -t 60 \
        -p <(echo '{"email":"test@example.com","password":"TestPassword123!"}') \
        -T application/json \
        -g "$RESULTS_DIR/auth.tsv" \
        "$API_URL/api/v1/auth/login" > "$RESULTS_DIR/auth.txt" 2>&1
    log_success "Authentication test completed"
}

# API Read Operations
test_api_read() {
    log_info "Testing API read operations..."
    
    # List users endpoint
    ab -n 1000 -c 50 -t 120 \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -g "$RESULTS_DIR/api-read.tsv" \
        "$API_URL/api/v1/users" > "$RESULTS_DIR/api-read.txt" 2>&1
    
    log_success "API read test completed"
}

# API Write Operations
test_api_write() {
    log_info "Testing API write operations..."
    
    ab -n 200 -c 20 -t 60 \
        -p <(echo '{"email":"test-'$RANDOM'@example.com","firstName":"Test","lastName":"User","role":"user"}') \
        -T application/json \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -g "$RESULTS_DIR/api-write.tsv" \
        "$API_URL/api/v1/users" > "$RESULTS_DIR/api-write.txt" 2>&1
    
    log_success "API write test completed"
}

# Database Query
test_database() {
    log_info "Testing database queries..."
    
    ab -n 500 -c 30 -t 120 \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -g "$RESULTS_DIR/database.tsv" \
        "$API_URL/api/v1/attendance?startDate=2026-01-01&endDate=2026-02-08" > "$RESULTS_DIR/database.txt" 2>&1
    
    log_success "Database test completed"
}

# Cache Operations
test_cache() {
    log_info "Testing cache operations (repeated requests)..."
    
    # First request (cache miss)
    ab -n 100 -c 10 -t 60 \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -g "$RESULTS_DIR/cache-miss.tsv" \
        "$API_URL/api/v1/users/profile" > "$RESULTS_DIR/cache-miss.txt" 2>&1
    
    log_warning "Cache miss test completed (check if times decrease on second run)"
    
    # Second request (should be cached)
    sleep 2
    ab -n 100 -c 10 -t 60 \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -g "$RESULTS_DIR/cache-hit.tsv" \
        "$API_URL/api/v1/users/profile" > "$RESULTS_DIR/cache-hit.txt" 2>&1
    
    log_success "Cache hit test completed"
}

# Concurrent Load Test
test_concurrent_load() {
    log_info "Running concurrent load test ($CONCURRENT_USERS users, $TEST_DURATION seconds)..."
    
    ab -n $((CONCURRENT_USERS * (TEST_DURATION / 10))) \
       -c "$CONCURRENT_USERS" \
       -t "$TEST_DURATION" \
       -H "Authorization: Bearer $TEST_TOKEN" \
       -g "$RESULTS_DIR/concurrent-load.tsv" \
       "$API_URL/api/v1/users" > "$RESULTS_DIR/concurrent-load.txt" 2>&1
    
    log_success "Concurrent load test completed"
}

# Error Rate Test (invalid requests)
test_error_handling() {
    log_info "Testing error handling..."
    
    # Invalid request
    ab -n 100 -c 10 -t 30 \
        "$API_URL/api/v1/invalid-endpoint" > "$RESULTS_DIR/error-handling.txt" 2>&1
    
    log_success "Error handling test completed"
}

# ===================================================================
# PERFORMANCE ANALYSIS
# ===================================================================

analyze_results() {
    log_info "Analyzing test results..."
    
    echo -e "\n${BLUE}=== PERFORMANCE ANALYSIS ===${NC}" > "$RESULTS_DIR/ANALYSIS.txt"
    
    # Extract key metrics from each test
    for test_file in "$RESULTS_DIR"/*.txt; do
        if [ -f "$test_file" ]; then
            test_name=$(basename "$test_file" .txt)
            echo -e "\n${BLUE}Test: $test_name${NC}" >> "$RESULTS_DIR/ANALYSIS.txt"
            
            # Extract metrics
            grep -E "Requests per second|Time per request|Failed requests|Total" "$test_file" \
                >> "$RESULTS_DIR/ANALYSIS.txt" 2>/dev/null || true
        fi
    done
    
    log_success "Analysis complete"
}

# ===================================================================
# PERFORMANCE THRESHOLDS
# ===================================================================

check_thresholds() {
    log_info "Checking performance thresholds..."
    
    # Extract metrics from concurrent load test
    local rps=$(grep "Requests per second" "$RESULTS_DIR/concurrent-load.txt" | awk '{print $4}')
    local response_time=$(grep "Time per request" "$RESULTS_DIR/concurrent-load.txt" | awk 'NR==1 {print $4}')
    local failed=$(grep "Failed requests" "$RESULTS_DIR/concurrent-load.txt" | awk '{print $3}')
    
    log_info "Results:
        - Requests/sec: $rps
        - Response time: ${response_time}ms
        - Failed requests: $failed"
    
    # Thresholds (adjustable)
    local min_rps=100        # minimum requests per second
    local max_response_time=1000  # milliseconds
    local max_failures=0     # allow 0 failures
    
    if (( $(echo "$rps < $min_rps" | bc -l) )); then
        log_error "❌ Request rate too low: $rps (expected: >$min_rps)"
    else
        log_success "✓ Request rate acceptable: $rps"
    fi
    
    if (( $(echo "$response_time > $max_response_time" | bc -l) )); then
        log_error "❌ Response time too high: ${response_time}ms (expected: <$max_response_time)"
    else
        log_success "✓ Response time acceptable: ${response_time}ms"
    fi
    
    if [ "$failed" -gt "$max_failures" ]; then
        log_error "❌ Too many failures: $failed (expected: 0)"
    else
        log_success "✓ No failures detected"
    fi
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

main() {
    log_info "API Load Testing Started"
    log_info "Target: $API_URL"
    log_info "Duration: $TEST_DURATION seconds"
    log_info "Concurrent Users: $CONCURRENT_USERS"
    log_info "Results Directory: $RESULTS_DIR"
    
    # Pre-flight checks
    log_info "Running pre-flight checks..."
    
    if ! command -v ab &> /dev/null; then
        log_error "Apache Bench (ab) is not installed"
        echo "Install with: sudo apt-get install apache2-utils"
        exit 1
    fi
    
    if ! curl -f "$API_URL/health" > /dev/null 2>&1; then
        log_error "API is not responding at $API_URL/health"
        exit 1
    fi
    
    log_success "All checks passed"
    
    # Run tests in sequence
    test_health
    # test_authentication
    # test_api_read
    # test_api_write
    # test_database
    # test_cache
    test_concurrent_load
    test_error_handling
    
    # Analyze results
    analyze_results
    check_thresholds
    
    log_success "Load testing completed!"
    log_info "Results saved to: $RESULTS_DIR"
    
    # Generate HTML report
    cat > "$RESULTS_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Results</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f0f0f0; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Load Test Results</h1>
    <p>Test Date: $(date)</p>
    <div id="results"></div>
    <script>
        const results = JSON.parse(localStorage.getItem('loadTestResults') || '{}');
        document.getElementById('results').innerHTML = Object.entries(results).map(([key, value]) => 
            `<div class="metric">${key}: ${value}</div>`
        ).join('');
    </script>
</body>
</html>
EOF
    
    log_success "HTML report generated"
}

# Execute main
main "$@"
