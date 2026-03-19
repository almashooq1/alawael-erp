-- Phase 13 Week 2: Database Schema Optimizations
-- Migration: Add indexes for performance

-- ============================================================
-- 1. USERS TABLE OPTIMIZATIONS
-- ============================================================

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Composite index for role + active queries
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, active);

-- Partial index for active users only (saves space)
CREATE INDEX IF NOT EXISTS idx_users_active_true ON users (email, role) WHERE active = true;

COMMENT ON INDEX idx_users_email IS 'Speed up login and user lookup by email';
COMMENT ON INDEX idx_users_role IS 'Speed up role-based queries';
COMMENT ON INDEX idx_users_active IS 'Speed up active user filters';


-- ============================================================
-- 2. AUDIT LOGS TABLE (if exists)
-- ============================================================

-- Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  success BOOLEAN DEFAULT true,
  severity VARCHAR(20) DEFAULT 'INFO',
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs (severity);

-- Composite indexes for common filters
CREATE INDEX IF NOT EXISTS idx_audit_category_timestamp ON audit_logs (category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON audit_logs (user_id, timestamp DESC);

-- GIN index for JSONB details search
CREATE INDEX IF NOT EXISTS idx_audit_details_gin ON audit_logs USING GIN (details);

-- Partion by month for better performance
-- CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
-- FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');


-- ============================================================
-- 3. QUALITY METRICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  department VARCHAR(100),
  product_id INTEGER,
  batch_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_metric_name ON quality_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_quality_recorded_at ON quality_metrics (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_recorded_by ON quality_metrics (recorded_by);
CREATE INDEX IF NOT EXISTS idx_quality_department ON quality_metrics (department);
CREATE INDEX IF NOT EXISTS idx_quality_status ON quality_metrics (status);

-- Composite index for time-series queries
CREATE INDEX IF NOT EXISTS idx_quality_name_time ON quality_metrics (metric_name, recorded_at DESC);


-- ============================================================
-- 4. SESSIONS TABLE (for JWT token blacklist)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token_id ON sessions (token_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- Cleanup old sessions automatically
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. PERFORMANCE VIEWS
-- ============================================================

-- View: Active users with role info
CREATE OR REPLACE VIEW v_active_users AS
SELECT
  id,
  email,
  name,
  role,
  created_at,
  last_login_at
FROM users
WHERE active = true
ORDER BY role, name;

-- View: Recent audit events
CREATE OR REPLACE VIEW v_recent_audit_events AS
SELECT
  a.id,
  a.timestamp,
  a.category,
  a.action,
  a.severity,
  u.email as user_email,
  a.resource,
  a.success
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY a.timestamp DESC;

-- View: Quality metrics summary
CREATE OR REPLACE VIEW v_quality_metrics_summary AS
SELECT
  metric_name,
  COUNT(*) as total_records,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  STDDEV(metric_value) as std_dev,
  MAX(recorded_at) as last_recorded
FROM quality_metrics
WHERE status = 'ACTIVE'
GROUP BY metric_name
ORDER BY metric_name;


-- ============================================================
-- 6. STATISTICS & MAINTENANCE
-- ============================================================

-- Analyze tables for query planner
ANALYZE users;
ANALYZE audit_logs;
ANALYZE quality_metrics;
ANALYZE sessions;

-- Vacuum to reclaim space
VACUUM ANALYZE users;
VACUUM ANALYZE audit_logs;

-- Update table statistics
SELECT tablename, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- ============================================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on quality_metrics
DROP TRIGGER IF EXISTS trigger_quality_metrics_updated_at ON quality_metrics;
CREATE TRIGGER trigger_quality_metrics_updated_at
  BEFORE UPDATE ON quality_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    category,
    user_id,
    action,
    resource,
    details
  ) VALUES (
    'USER_ACTIVITY',
    NEW.id,
    TG_OP,
    'users',
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
      'active', NEW.active
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log user changes
DROP TRIGGER IF EXISTS trigger_log_user_changes ON users;
CREATE TRIGGER trigger_log_user_changes
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();


-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================

-- Grant read access to replica user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO alawael_replica;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO alawael_replica;

-- Grant full access to primary user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alawael_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alawael_user;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 13 Week 2 migration completed successfully';
  RAISE NOTICE '   - Indexes created for performance';
  RAISE NOTICE '   - Views created for common queries';
  RAISE NOTICE '   - Triggers set up for auto-updates';
  RAISE NOTICE '   - Permissions granted';
END $$;
