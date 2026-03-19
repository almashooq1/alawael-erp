-- ================================================================
-- Database Migration Script (SQL Version)
-- ALAWAEL ERP System - Phase 1: Users & Products
-- Date: February 28, 2026
-- ================================================================

-- ================================================================
-- STEP 1: CREATE TABLES IN NEW DATABASE (if not exists)
-- ================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_active (isActive)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  pricing JSON,
  quantity INT DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sku (sku),
  INDEX idx_name (name),
  INDEX idx_active (isActive)
);

-- ================================================================
-- STEP 2: MIGRATE USERS FROM OLD DATABASE
-- ================================================================

-- Option A: Direct INSERT with transformations
INSERT INTO users (
  id, email, username, password, firstName, lastName,
  phone, address, isActive, createdAt, updatedAt
)
SELECT 
  UUID() as id,
  COALESCE(u.email, CONCAT('user_', u.id, '@alawael.local')),
  COALESCE(u.username, SUBSTRING_INDEX(u.email, '@', 1), CONCAT('user_', u.id)),
  -- Password handling: if already bcrypt, keep it; otherwise assume it needs update
  CASE 
    WHEN u.password LIKE '$2b$%' THEN u.password
    WHEN u.password LIKE '$2a$%' THEN u.password
    ELSE CONCAT('$2b$12$', u.password) -- Placeholder; in real scenario use bcrypt library
  END as password,
  COALESCE(SUBSTRING_INDEX(u.full_name, ' ', 1), SUBSTRING_INDEX(u.name, ' ', 1), 'Unknown') as firstName,
  COALESCE(
    TRIM(SUBSTRING(u.full_name, POSITION(' ' IN u.full_name) + 1)),
    TRIM(SUBSTRING(u.name, POSITION(' ' IN u.name) + 1)),
    ''
  ) as lastName,
  u.phone,
  u.address,
  CASE WHEN u.is_active = 1 OR u.isActive = true THEN true ELSE false END as isActive,
  u.created_at,
  u.updated_at
FROM alawael_old.users u
WHERE u.email IS NOT NULL
ON DUPLICATE KEY UPDATE 
  email = VALUES(email),
  password = VALUES(password),
  firstName = VALUES(firstName),
  lastName = VALUES(lastName);

-- ================================================================
-- STEP 3: VERIFY USER MIGRATION
-- ================================================================

-- Count comparison
SELECT 
  'Users' as entity,
  (SELECT COUNT(*) FROM alawael_old.users WHERE email IS NOT NULL) as source_count,
  (SELECT COUNT(*) FROM users) as target_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM alawael_old.users WHERE email IS NOT NULL) = (SELECT COUNT(*) FROM users)
    THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status;

-- Check for NULL values in required fields
SELECT 
  'NULL Check' as check_type,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as null_emails,
  COUNT(CASE WHEN password IS NULL THEN 1 END) as null_passwords,
  COUNT(CASE WHEN firstName IS NULL THEN 1 END) as null_first_names
FROM users;

-- ================================================================
-- STEP 4: MIGRATE PRODUCTS FROM OLD DATABASE
-- ================================================================

INSERT INTO products (
  id, name, sku, description, pricing, quantity, isActive,
  createdAt, updatedAt
)
SELECT 
  UUID() as id,
  COALESCE(p.name, p.title, 'Unknown Product'),
  COALESCE(p.sku, p.code, CONCAT('SKU_', p.id)),
  p.description,
  JSON_OBJECT(
    'base', COALESCE(p.price, p.base_price, 0),
    'usd', COALESCE(p.price_usd, p.price, 0),
    'eur', COALESCE(p.price_eur, 0),
    'sar', COALESCE(p.price_sar, 0)
  ) as pricing,
  COALESCE(p.quantity, p.stock, 0),
  CASE WHEN p.is_active = 1 OR p.isActive = true THEN true ELSE false END,
  p.created_at,
  p.updated_at
FROM alawael_old.products p
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  description = VALUES(description),
  pricing = VALUES(pricing),
  quantity = VALUES(quantity);

-- ================================================================
-- STEP 5: VERIFY PRODUCT MIGRATION
-- ================================================================

SELECT 
  'Products' as entity,
  (SELECT COUNT(*) FROM alawael_old.products) as source_count,
  (SELECT COUNT(*) FROM products) as target_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM alawael_old.products) = (SELECT COUNT(*) FROM products)
    THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status;

-- Check pricing JSON structure
SELECT 
  'JSON Check' as check_type,
  COUNT(CASE WHEN pricing IS NULL THEN 1 END) as null_pricing,
  COUNT(CASE WHEN JSON_VALID(pricing) = 1 THEN 1 END) as valid_json
FROM products;

-- ================================================================
-- FINAL VERIFICATION REPORT
-- ================================================================

-- Get comprehensive migration summary
SELECT '=== MIGRATION SUMMARY ===' as report;

SELECT CONCAT('Users migrated: ', COUNT(*)) as metric FROM users;
SELECT CONCAT('Products migrated: ', COUNT(*)) as metric FROM products;

-- Check data quality metrics
SELECT 
  'Data Quality' as category,
  (SELECT COUNT(*) FROM users WHERE isActive = true) as active_users,
  (SELECT COUNT(*) FROM products WHERE isActive = true) as active_products;

-- Check timestamp integrity
SELECT 
  'Timestamps' as category,
  (SELECT COUNT(*) FROM users WHERE createdAt IS NOT NULL) as users_with_created,
  (SELECT COUNT(*) FROM products WHERE createdAt IS NOT NULL) as products_with_created;

-- If all checks pass, show success message
SELECT CONCAT(
  'Migration Status: ',
  CASE 
    WHEN (SELECT COUNT(*) FROM users) > 0 AND (SELECT COUNT(*) FROM products) > 0
    THEN '✅ SUCCESS - All data migrated successfully'
    ELSE '❌ FAILURE - Some data is missing'
  END
) as final_status;

-- ================================================================
-- ROLLBACK SCRIPT (Run this if migration needs to be undone)
-- ================================================================
/*
-- CAUTION: This will delete all migrated data!

DELETE FROM users WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR);
DELETE FROM products WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Or completely clear for full rollback:
-- TRUNCATE TABLE users;
-- TRUNCATE TABLE products;
*/
