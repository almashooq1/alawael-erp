# Database initialization script
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Riyadh';

-- Create main schema
CREATE SCHEMA IF NOT EXISTS erp;

-- Users table
CREATE TABLE IF NOT EXISTS erp.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS erp.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES erp.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS erp.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES erp.users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS erp.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE IF NOT EXISTS erp.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS erp.role_permissions (
    role_id UUID REFERENCES erp.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES erp.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Create indexes
CREATE INDEX idx_users_email ON erp.users(email);
CREATE INDEX idx_users_role ON erp.users(role);
CREATE INDEX idx_sessions_user_id ON erp.sessions(user_id);
CREATE INDEX idx_sessions_token ON erp.sessions(token);
CREATE INDEX idx_audit_logs_user_id ON erp.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON erp.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON erp.audit_logs(action);

-- Full-text search indexes
CREATE INDEX idx_users_full_name_trgm ON erp.users USING gin(full_name gin_trgm_ops);

-- Insert default admin user (password: Admin@123456)
INSERT INTO erp.users (email, password_hash, full_name, role, status)
VALUES (
    'admin@alawael.com',
    '$2b$10$9xQK8J9qJxGQXGvJ8pQZxO5HQJ8J9qJxGQXGvJ8pQZxO5HQJ8J9qJ',
    'System Administrator',
    'admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Insert default roles
INSERT INTO erp.roles (name, description, level) VALUES
    ('admin', 'System Administrator', 10),
    ('hr_manager', 'HR Manager', 8),
    ('finance', 'Finance Manager', 8),
    ('teacher', 'Teacher', 5),
    ('driver', 'Driver', 3)
ON CONFLICT (name) DO NOTHING;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA erp TO erp_admin;
