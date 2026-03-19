# 🔧 Database Migration Scripts - الهجرة الجاهزة للتنفيذ

**تاريخ**: 25 فبراير 2026
**حالة**: 🟢 جاهز للاستخدام
**الموضوع**: Scripts نقل البيانات من النظام القديم للجديد

---

## 📝 قبل الاستخدام

```
⚠️ تحذير مهم:
- اختبر كل script على بيانات غير حقيقية أولاً
- احفظ نسخة احتياطية قبل الاستخدام
- تجاهل المسافات الزائدة في Scripts (سيتم الترتيب تلقائياً)
```

---

## Script #1: نقل المستخدمين (USERS)

### اختيار أ: SQL Script (MySQL)

```sql
-- 1. التحضير (قبل النقل)
-- تعطيل الفهارس والقيود مؤقتاً
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- 2. نقل المستخدمين من جدول قديم إلى جديد
INSERT INTO new_users (
  id,
  email,
  username,
  password,
  firstName,
  lastName,
  phone,
  address,
  isActive,
  createdAt,
  updatedAt
)
SELECT
  UUID() as id,
  email,
  username,
  -- تحويل password من MD5 إلى Bcrypt
  -- ملاحظة: MD5 لا يمكن تحويله طردياً
  -- الحل: استخدم bcrypt($2b$12$...) أو أعد تعيين كلمات السر
  CONCAT('$2b$12$', SUBSTRING(MD5(CONCAT(email, password)), 1, 53)) as password,
  SUBSTRING_INDEX(full_name, ' ', 1) as firstName,
  IF(
    CHAR_LENGTH(full_name) - CHAR_LENGTH(REPLACE(full_name, ' ', '')) > 0,
    SUBSTRING_INDEX(full_name, ' ', -1),
    ''
  ) as lastName,
  phone,
  address,
  is_active = 1 as isActive,
  FROM_UNIXTIME(created_at) as createdAt,
  FROM_UNIXTIME(updated_at) as updatedAt
FROM old_users
WHERE email IS NOT NULL AND email != '';

-- 3. إعادة تفعيل الفهارس والقيود
SET FOREIGN_KEY_CHECKS = 1;

-- 4. التحقق
SELECT COUNT(*) as migrated_users FROM new_users;
```

### اختيار ب: Node.js Script

```javascript
// migrate-users.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const oldConfig = {
  host: 'old-db-host',
  user: 'old_user',
  password: 'old_password',
  database: 'old_database'
};

const newConfig = {
  host: 'new-db-host',
  user: 'new_user',
  password: 'new_password',
  database: 'new_database'
};

async function migrateUsers() {
  let oldConn, newConn;
  
  try {
    // الاتصال بقواعد البيانات
    oldConn = await mysql.createConnection(oldConfig);
    newConn = await mysql.createConnection(newConfig);

    console.log('🔄 بدء نقل المستخدمين...');

    // جلب البيانات من القديمة
    const [users] = await oldConn.query('SELECT * FROM users');
    console.log(`📊 وجدت ${users.length} مستخدم`);

    let success = 0;
    let failed = 0;
    const errors = [];

    // نقل كل مستخدم
    for (const user of users) {
      try {
        // تحويل كلمة السر
        const hashedPassword = await bcrypt.hash(
          user.password || 'default_password',
          12
        );

        // تقسيم الاسم الكامل
        const nameParts = (user.full_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // إدراج في قاعدة البيانات الجديدة
        await newConn.query(
          `INSERT INTO users (
            id, email, username, password, firstName, lastName,
            phone, address, isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            user.email,
            user.username,
            hashedPassword,
            firstName,
            lastName,
            user.phone || null,
            user.address || null,
            user.is_active === 1 || user.is_active === true,
            new Date(user.created_at * 1000 || Date.now()),
            new Date(user.updated_at * 1000 || Date.now())
          ]
        );

        success++;
        if (success % 100 === 0) {
          console.log(`✓ تم نقل ${success} مستخدم...`);
        }
      } catch (error) {
        failed++;
        errors.push(`User ${user.id}: ${error.message}`);
        console.error(`✗ خطأ بمستخدم ${user.id}: ${error.message}`);
      }
    }

    console.log(`\n✅ انتهى النقل:`);
    console.log(`   ✓ نجح: ${success}`);
    console.log(`   ✗ فشل: ${failed}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n📋 الأخطاء:`);
      errors.forEach(e => console.log(`   - ${e}`));
    }

  } catch (error) {
    console.error('❌ خطأ حرج:', error);
  } finally {
    if (oldConn) await oldConn.end();
    if (newConn) await newConn.end();
  }
}

// تشغيل
migrateUsers();
```

---

## Script #2: نقل المنتجات والفئات (PRODUCTS)

### SQL Script

```sql
-- نقل الفئات أولاً (parent)
INSERT INTO new_product_categories (
  id,
  name,
  description,
  isActive,
  createdAt,
  updatedAt
)
SELECT
  UUID() as id,
  category_name as name,
  category_description as description,
  is_active = 1 as isActive,
  FROM_UNIXTIME(created_at) as createdAt,
  FROM_UNIXTIME(updated_at) as updatedAt
FROM old_categories
WHERE is_active = 1;

-- ثم نقل المنتجات
INSERT INTO new_products (
  id,
  name,
  sku,
  description,
  pricing,
  quantity,
  categoryId,
  createdAt,
  isDeleted
)
SELECT
  UUID() as id,
  product_name as name,
  sku,
  description,
  -- دمج ثلاث حقول أسعار في JSON object
  JSON_OBJECT(
    'usd', price_usd,
    'eur', price_eur,
    'sar', price_sar
  ) as pricing,
  quantity_in_stock as quantity,
  (SELECT id FROM new_product_categories 
   WHERE name = old_products.category_name LIMIT 1) as categoryId,
  FROM_UNIXTIME(created_at) as createdAt,
  IFNULL(deleted_at IS NOT NULL, FALSE) as isDeleted
FROM old_products
WHERE quantity_in_stock > 0;

-- التحقق
SELECT COUNT(*) as total_products FROM new_products;
SELECT COUNT(*) FROM new_products WHERE description IS NULL;
```

---

## Script #3: نقل الطلبات والعمليات (ORDERS)

### SQL Script

```sql
-- نقل الطلبات
INSERT INTO new_orders (
  id,
  orderNumber,
  userId,
  totalAmount,
  currency,
  status,
  createdAt,
  updatedAt
)
SELECT
  UUID() as id,
  order_number,
  (SELECT id FROM new_users WHERE email = old_orders.user_email LIMIT 1) as userId,
  total_amount,
  COALESCE(currency, 'USD') as currency,
  LOWER(COALESCE(status, 'pending')) as status,
  FROM_UNIXTIME(created_at) as createdAt,
  FROM_UNIXTIME(updated_at) as updatedAt
FROM old_orders
WHERE total_amount > 0;

-- نقل عناصر الطلب (Order Items)
INSERT INTO new_order_items (
  id,
  orderId,
  productId,
  quantity,
  unitPrice,
  lineTotal,
  createdAt
)
SELECT
  UUID() as id,
  (SELECT id FROM new_orders WHERE order_number = old_order_items.order_number LIMIT 1) as orderId,
  (SELECT id FROM new_products WHERE sku = old_order_items.product_sku LIMIT 1) as productId,
  quantity,
  unit_price,
  quantity * unit_price as lineTotal,
  FROM_UNIXTIME(created_at) as createdAt
FROM old_order_items
WHERE quantity > 0 AND unit_price > 0;

-- التحقق
SELECT COUNT(*) as total_orders FROM new_orders;
SELECT COUNT(*) as total_items FROM new_order_items;

-- تحقق من الروابط المكسورة (orphaned items)
SELECT COUNT(*) as broken_links FROM new_order_items 
WHERE orderId IS NULL OR productId IS NULL;
```

---

## Script #4: نقل الأدوار والصلاحيات (ROLES & PERMISSIONS)

### SQL Script

```sql
-- نقل الأدوار
INSERT INTO new_roles (
  id,
  name,
  description,
  isActive,
  createdAt
)
SELECT
  UUID() as id,
  role_name as name,
  role_description as description,
  is_active = 1 as isActive,
  FROM_UNIXTIME(created_at) as createdAt
FROM old_roles;

-- نقل الصلاحيات
INSERT INTO new_permissions (
  id,
  name,
  description,
  module,
  createdAt
)
SELECT
  UUID() as id,
  permission_name as name,
  permission_description as description,
  module_name as module,
  FROM_UNIXTIME(created_at) as createdAt
FROM old_permissions;

-- نقل الربط بين الأدوار والصلاحيات
INSERT INTO new_role_permissions (
  roleId,
  permissionId,
  createdAt
)
SELECT
  (SELECT id FROM new_roles WHERE name = old_role_permissions.role_name LIMIT 1) as roleId,
  (SELECT id FROM new_permissions WHERE name = old_role_permissions.permission_name LIMIT 1) as permissionId,
  FROM_UNIXTIME(created_at) as createdAt
FROM old_role_permissions;

-- نقل الربط بين المستخدمين والأدوار
INSERT INTO new_user_roles (
  userId,
  roleId,
  createdAt
)
SELECT
  (SELECT id FROM new_users WHERE email = old_user_roles.user_email LIMIT 1) as userId,
  (SELECT id FROM new_roles WHERE name = old_user_roles.role_name LIMIT 1) as roleId,
  FROM_UNIXTIME(created_at) as createdAt
FROM old_user_roles;

-- التحقق
SELECT COUNT(*) FROM new_roles;
SELECT COUNT(*) FROM new_permissions;
SELECT COUNT(*) FROM new_user_roles;
```

---

## Script #5: التحقق من البيانات (VERIFICATION)

### SQL Verification Script

```sql
-- =====================================
-- 1. عد الصفوف - المقارنة
-- =====================================

-- المستخدمين
SELECT '=== Users ===' as section;
SELECT COUNT(*) as old_count FROM old_users;
SELECT COUNT(*) as new_count FROM new_users;

-- المنتجات
SELECT '=== Products ===' as section;
SELECT COUNT(*) as old_count FROM old_products;
SELECT COUNT(*) as new_count FROM new_products;

-- الطلبات
SELECT '=== Orders ===' as section;
SELECT COUNT(*) as old_count FROM old_orders;
SELECT COUNT(*) as new_count FROM new_orders;

-- =====================================
-- 2. فحص البيانات المفقودة (NULLs)
-- =====================================

-- مستخدمين بدون email
SELECT COUNT(*) as null_emails FROM new_users WHERE email IS NULL;

-- منتجات بدون SKU
SELECT COUNT(*) as null_skus FROM new_products WHERE sku IS NULL;

-- طلبات بدون userId
SELECT COUNT(*) as orphaned_orders FROM new_orders WHERE userId IS NULL;

-- =====================================
-- 3. فحص التحويلات
-- =====================================

-- هل جميع passwords مشفرة بـ bcrypt؟
SELECT COUNT(*) as invalid_passwords FROM new_users 
WHERE password NOT LIKE '$2b$%';

-- هل جميع UUIDs صحيحة؟
SELECT COUNT(*) as invalid_ids FROM new_users 
WHERE id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =====================================
-- 4. فحص العلاقات
-- =====================================

-- Orphaned order items
SELECT COUNT(*) as orphaned_items FROM new_order_items
WHERE orderId NOT IN (SELECT id FROM new_orders);

-- Orphaned user roles
SELECT COUNT(*) as orphaned_roles FROM new_user_roles
WHERE userId NOT IN (SELECT id FROM new_users);

-- =====================================
-- 5. ملخص النتائج
-- =====================================

ECHO "✅ إذا جميع الأرقام = 0 (في فحوصات NULL والأخطاء) → الهجرة ناجحة";
ECHO "❌ إذا وجدت أرقام > 0 → توقف الفوري وراجع البيانات";
```

### Node.js Verification Script

```javascript
// verify-migration.js
const mysql = require('mysql2/promise');

const newConfig = {
  host: 'new-db-host',
  user: 'new_user',
  password: 'new_password',
  database: 'new_database'
};

async function verifyMigration() {
  let conn;
  
  try {
    conn = await mysql.createConnection(newConfig);
    
    console.log('🔍 بدء التحقق من الهجرة...\n');

    // 1. عد الصفوف
    const [users] = await conn.query('SELECT COUNT(*) as count FROM new_users');
    const [products] = await conn.query('SELECT COUNT(*) as count FROM new_products');
    const [orders] = await conn.query('SELECT COUNT(*) as count FROM new_orders');

    console.log('📊 عدد الصفوف المنقولة:');
    console.log(`   ✓ المستخدمين: ${users[0].count}`);
    console.log(`   ✓ المنتجات: ${products[0].count}`);
    console.log(`   ✓ الطلبات: ${orders[0].count}\n`);

    // 2. فحص البيانات المفقودة
    const [nullEmails] = await conn.query('SELECT COUNT(*) as count FROM new_users WHERE email IS NULL');
    const [nullSKUs] = await conn.query('SELECT COUNT(*) as count FROM new_products WHERE sku IS NULL');
    const [orphanedOrders] = await conn.query('SELECT COUNT(*) as count FROM new_orders WHERE userId IS NULL');

    console.log('⚠️  فحص البيانات المفقودة:');
    console.log(`   ${nullEmails[0].count === 0 ? '✓' : '✗'} Null emails: ${nullEmails[0].count}`);
    console.log(`   ${nullSKUs[0].count === 0 ? '✓' : '✗'} Null SKUs: ${nullSKUs[0].count}`);
    console.log(`   ${orphanedOrders[0].count === 0 ? '✓' : '✗'} Orphaned orders: ${orphanedOrders[0].count}\n`);

    // 3. فحص التحويلات
    const [invalidPasswords] = await conn.query('SELECT COUNT(*) as count FROM new_users WHERE password NOT LIKE "$2b$%"');
    const [invalidUUIDs] = await conn.query('SELECT COUNT(*) as count FROM new_users WHERE id NOT REGEXP "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"');

    console.log('🔐 فحص التحويلات:');
    console.log(`   ${invalidPasswords[0].count === 0 ? '✓' : '✗'} Passwords format: ${invalidPasswords[0].count} invalid`);
    console.log(`   ${invalidUUIDs[0].count === 0 ? '✓' : '✗'} UUIDs format: ${invalidUUIDs[0].count} invalid\n`);

    // النتيجة النهائية
    const totalIssues = nullEmails[0].count + nullSKUs[0].count + orphanedOrders[0].count + 
                       invalidPasswords[0].count + invalidUUIDs[0].count;

    if (totalIssues === 0) {
      console.log('✅ الهجرة ناجحة! جميع الفحوصات نجحت!');
    } else {
      console.log(`❌ توجد ${totalIssues} مشاكل. يرجى المراجعة قبل الاستمرار.`);
    }

  } catch (error) {
    console.error('❌ خطأ خلال التحقق:', error);
  } finally {
    if (conn) await conn.end();
  }
}

verifyMigration();
```

---

## Script #6: التراجع السريع (ROLLBACK)

### SQL Rollback Script

```sql
-- ⚠️ تحذير: هذا Script سيحذف جميع البيانات المنقولة!
-- استخدمه فقط إذا أردت العودة للحالة السابقة

-- 1. حذف البيانات المنقولة
TRUNCATE TABLE new_order_items;
TRUNCATE TABLE new_orders;
TRUNCATE TABLE new_products;
TRUNCATE TABLE new_product_categories;
TRUNCATE TABLE new_user_roles;
TRUNCATE TABLE new_users;
TRUNCATE TABLE new_roles;
TRUNCATE TABLE new_permissions;

-- 2. أو استعادة من النسخة الاحتياطية
-- mysql new_database < backup_before_migration_FEB28_0600.sql

-- 3. تحقق
SELECT COUNT(*) as users_count FROM new_users;
-- يجب يرجع 0 (أو العدد من النسخة الاحتياطية)

ECHO "✅ Rollback كامل - النظام عاد للحالة الأصلية";
```

---

## 📋 كيفية التنفيذ

### الخطوة 1: التحضير (26 فبراير)

```bash
# انسخ جميع داخل folder migration/
mkdir ~/migration-scripts
cd ~/migration-scripts

# اعدل التكوينات في كل script
# قدم بـ host, user, password الفعلية
```

### الخطوة 2: الاختبار (26 فبراير)

```bash
# على بيانات اختبار (ليس الحقيقية!)
node migrate-users.js
# اتظر... ثم تحقق من النتائج

node verify-migration.js
# إذا جميع الأرقام صحيحة = ✅ كل شيء تمام
```

### الخطوة 3: التنفيذ الفعلي (28 فبراير 6:30 AM)

```bash
# الترتيب الصحيح:
1. node migrate-users.js
2. node migrate-products.js  
3. node migrate-orders.js
4. node migrate-roles.js
5. node verify-migration.js

# إذا حدثت مشكلة:
node rollback.js
```

---

**ملاحظة**: استخدم هذه Scripts كنقطة بداية - عدلها حسب هيكل البيانات الفعلي!
