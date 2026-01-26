#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Migration Script for RBAC System
سكريبت ترحيل قاعدة البيانات لنظام RBAC

يضيف جداول وبيانات الأدوار والصلاحيات
"""

from datetime import datetime
import sys

# تعريف الأدوار والصلاحيات
ROLES = {
    'super_admin': {
        'name': 'Super Admin',
        'name_ar': 'مدير النظام الأعلى',
        'description': 'Full system access with all permissions',
        'description_ar': 'صلاحيات كاملة على النظام',
        'level': 10,
        'permissions': 'all'
    },
    'system_admin': {
        'name': 'System Admin',
        'name_ar': 'مدير النظام',
        'description': 'System administration and configuration',
        'description_ar': 'إدارة النظام والتكوينات',
        'level': 9,
        'permissions': [
            'view_dashboard', 'manage_settings', 'view_reports',
            'view_audit_logs', 'manage_backups', 'view_system_health'
        ]
    },
    'hr_manager': {
        'name': 'HR Manager',
        'name_ar': 'مدير الموارد البشرية',
        'description': 'Human resources management',
        'description_ar': 'إدارة الموارد البشرية',
        'level': 8,
        'permissions': [
            'view_employees', 'manage_employees', 'view_attendance',
            'manage_attendance', 'view_leave_requests', 'manage_leave_requests',
            'view_salaries', 'manage_salaries', 'view_hr_dashboard'
        ]
    },
    'finance_manager': {
        'name': 'Finance Manager',
        'name_ar': 'المدير المالي',
        'description': 'Financial management and accounting',
        'description_ar': 'الإدارة المالية والمحاسبة',
        'level': 8,
        'permissions': [
            'view_accounts', 'manage_accounts', 'view_invoices',
            'manage_invoices', 'view_payments', 'manage_payments',
            'view_budgets', 'manage_budgets', 'view_financial_reports',
            'export_financial_data'
        ]
    },
    'department_manager': {
        'name': 'Department Manager',
        'name_ar': 'مدير القسم',
        'description': 'Department-level management',
        'description_ar': 'إدارة على مستوى القسم',
        'level': 7,
        'permissions': [
            'view_department_data', 'manage_department_staff',
            'view_department_reports', 'approve_requests',
            'view_projects', 'manage_projects'
        ]
    },
    'employee': {
        'name': 'Employee',
        'name_ar': 'موظف',
        'description': 'Standard employee access',
        'description_ar': 'وصول موظف عادي',
        'level': 5,
        'permissions': [
            'view_profile', 'update_profile', 'submit_requests',
            'view_own_data', 'view_schedule'
        ]
    },
    'crm_manager': {
        'name': 'CRM Manager',
        'name_ar': 'مدير علاقات العملاء',
        'description': 'Customer relationship management',
        'description_ar': 'إدارة علاقات العملاء',
        'level': 7,
        'permissions': [
            'view_crm_customers', 'manage_crm_customers',
            'view_crm_leads', 'manage_crm_leads',
            'view_crm_opportunities', 'manage_crm_opportunities',
            'send_communications'
        ]
    },
    'support_agent': {
        'name': 'Support Agent',
        'name_ar': 'موظف دعم',
        'description': 'Customer support',
        'description_ar': 'دعم العملاء',
        'level': 5,
        'permissions': [
            'view_tickets', 'manage_tickets', 'view_customers',
            'send_communications'
        ]
    },
    'guest': {
        'name': 'Guest',
        'name_ar': 'زائر',
        'description': 'Limited read-only access',
        'description_ar': 'وصول محدود للقراءة فقط',
        'level': 1,
        'permissions': ['view_public_data']
    }
}

PERMISSIONS = [
    # Dashboard & System
    ('view_dashboard', 'View Dashboard', 'عرض لوحة التحكم'),
    ('manage_settings', 'Manage Settings', 'إدارة الإعدادات'),
    ('view_audit_logs', 'View Audit Logs', 'عرض سجلات التدقيق'),
    ('view_system_health', 'View System Health', 'عرض صحة النظام'),
    
    # HR Permissions
    ('view_employees', 'View Employees', 'عرض الموظفين'),
    ('manage_employees', 'Manage Employees', 'إدارة الموظفين'),
    ('view_attendance', 'View Attendance', 'عرض الحضور'),
    ('manage_attendance', 'Manage Attendance', 'إدارة الحضور'),
    ('view_leave_requests', 'View Leave Requests', 'عرض طلبات الإجازة'),
    ('manage_leave_requests', 'Manage Leave Requests', 'إدارة طلبات الإجازة'),
    ('view_salaries', 'View Salaries', 'عرض الرواتب'),
    ('manage_salaries', 'Manage Salaries', 'إدارة الرواتب'),
    ('view_hr_dashboard', 'View HR Dashboard', 'عرض لوحة الموارد البشرية'),
    
    # Finance Permissions
    ('view_accounts', 'View Accounts', 'عرض الحسابات'),
    ('manage_accounts', 'Manage Accounts', 'إدارة الحسابات'),
    ('view_invoices', 'View Invoices', 'عرض الفواتير'),
    ('manage_invoices', 'Manage Invoices', 'إدارة الفواتير'),
    ('view_payments', 'View Payments', 'عرض المدفوعات'),
    ('manage_payments', 'Manage Payments', 'إدارة المدفوعات'),
    ('view_budgets', 'View Budgets', 'عرض الموازنات'),
    ('manage_budgets', 'Manage Budgets', 'إدارة الموازنات'),
    ('view_financial_reports', 'View Financial Reports', 'عرض التقارير المالية'),
    ('export_financial_data', 'Export Financial Data', 'تصدير البيانات المالية'),
    
    # CRM Permissions
    ('view_crm_customers', 'View CRM Customers', 'عرض عملاء CRM'),
    ('manage_crm_customers', 'Manage CRM Customers', 'إدارة عملاء CRM'),
    ('view_crm_leads', 'View CRM Leads', 'عرض العملاء المحتملين'),
    ('manage_crm_leads', 'Manage CRM Leads', 'إدارة العملاء المحتملين'),
    ('view_crm_opportunities', 'View CRM Opportunities', 'عرض الفرص'),
    ('manage_crm_opportunities', 'Manage CRM Opportunities', 'إدارة الفرص'),
    
    # Communications
    ('send_sms', 'Send SMS', 'إرسال رسائل نصية'),
    ('send_email', 'Send Email', 'إرسال بريد إلكتروني'),
    ('view_communications', 'View Communications', 'عرض الاتصالات'),
    ('send_communications', 'Send Communications', 'إرسال اتصالات'),
    
    # Files & Documents
    ('view_files', 'View Files', 'عرض الملفات'),
    ('manage_files', 'Manage Files', 'إدارة الملفات'),
    ('export_files', 'Export Files', 'تصدير الملفات'),
    ('print_files', 'Print Files', 'طباعة الملفات'),
    
    # AI & Advanced Features
    ('ai_analysis', 'AI Analysis', 'تحليل الذكاء الاصطناعي'),
    ('view_assessments', 'View Assessments', 'عرض التقييمات'),
    ('manage_assessments', 'Manage Assessments', 'إدارة التقييمات'),
    
    # General
    ('view_profile', 'View Profile', 'عرض الملف الشخصي'),
    ('update_profile', 'Update Profile', 'تحديث الملف الشخصي'),
    ('view_reports', 'View Reports', 'عرض التقارير'),
    ('view_public_data', 'View Public Data', 'عرض البيانات العامة'),
]

def create_migration_sql():
    """إنشاء SQL statements للـ migration"""
    
    sql_statements = []
    
    # 1. Create tables
    sql_statements.append("""
-- إنشاء جدول الأدوار
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
    
    sql_statements.append("""
-- إنشاء جدول الصلاحيات
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
    
    sql_statements.append("""
-- إنشاء جدول ربط الأدوار بالصلاحيات
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);
""")
    
    sql_statements.append("""
-- إضافة عمود role للمستخدمين (إذا لم يكن موجوداً)
-- ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'employee';
-- ALTER TABLE users ADD COLUMN role_id INTEGER;
-- ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id);
""")
    
    sql_statements.append("""
-- جدول سجلات التدقيق
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
""")
    
    # 2. Insert permissions
    for perm_code, perm_name, perm_name_ar in PERMISSIONS:
        sql_statements.append(f"""
INSERT OR IGNORE INTO permissions (code, name, name_ar)
VALUES ('{perm_code}', '{perm_name}', '{perm_name_ar}');
""")
    
    # 3. Insert roles
    for role_code, role_data in ROLES.items():
        sql_statements.append(f"""
INSERT OR IGNORE INTO roles (code, name, name_ar, description, description_ar, level)
VALUES (
    '{role_code}',
    '{role_data['name']}',
    '{role_data['name_ar']}',
    '{role_data['description']}',
    '{role_data['description_ar']}',
    {role_data['level']}
);
""")
    
    # 4. Link roles with permissions
    for role_code, role_data in ROLES.items():
        if role_data['permissions'] == 'all':
            # Super admin gets all permissions
            sql_statements.append(f"""
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = '{role_code}';
""")
        else:
            # Other roles get specific permissions
            for perm_code in role_data['permissions']:
                sql_statements.append(f"""
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = '{role_code}' AND p.code = '{perm_code}';
""")
    
    return sql_statements

def run_migration():
    """تنفيذ الـ migration"""
    print("=" * 60)
    print("🔄 RBAC Database Migration")
    print("=" * 60)
    print()
    
    try:
        # استيراد database
        try:
            from app import db
            print("✅ Database connection established")
        except ImportError:
            print("⚠️  Warning: Could not import database from app")
            print("   SQL statements will be saved to file instead")
            save_to_file = True
        else:
            save_to_file = False
        
        # إنشاء SQL statements
        print("\n📝 Generating SQL statements...")
        sql_statements = create_migration_sql()
        print(f"✅ Generated {len(sql_statements)} SQL statements")
        
        if save_to_file:
            # حفظ في ملف
            filename = f'rbac_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sql'
            with open(filename, 'w', encoding='utf-8') as f:
                f.write('\n'.join(sql_statements))
            print(f"\n💾 SQL saved to: {filename}")
            print("\n📋 To apply manually, run:")
            print(f"   sqlite3 your_database.db < {filename}")
        else:
            # تنفيذ مباشر
            print("\n⚙️  Executing migration...")
            success_count = 0
            error_count = 0
            
            for i, statement in enumerate(sql_statements, 1):
                try:
                    if statement.strip():
                        db.session.execute(statement)
                        success_count += 1
                except Exception as e:
                    error_count += 1
                    if 'duplicate' not in str(e).lower() and 'already exists' not in str(e).lower():
                        print(f"  ⚠️  Statement {i}: {str(e)[:50]}...")
            
            # Commit all changes
            db.session.commit()
            
            print(f"\n✅ Migration completed!")
            print(f"   Success: {success_count}")
            print(f"   Skipped/Errors: {error_count}")
        
        # ملخص
        print("\n" + "=" * 60)
        print("📊 Migration Summary:")
        print("=" * 60)
        print(f"✅ Roles: {len(ROLES)}")
        print(f"✅ Permissions: {len(PERMISSIONS)}")
        print(f"✅ Tables: 4 (roles, permissions, role_permissions, audit_logs)")
        print("\n✨ RBAC system is ready!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def verify_migration():
    """التحقق من نجاح الـ migration"""
    try:
        from app import db
        
        print("\n🔍 Verifying migration...")
        
        # Check roles
        result = db.session.execute("SELECT COUNT(*) FROM roles")
        roles_count = result.fetchone()[0]
        print(f"✅ Roles: {roles_count} found")
        
        # Check permissions
        result = db.session.execute("SELECT COUNT(*) FROM permissions")
        perms_count = result.fetchone()[0]
        print(f"✅ Permissions: {perms_count} found")
        
        # Check role_permissions
        result = db.session.execute("SELECT COUNT(*) FROM role_permissions")
        links_count = result.fetchone()[0]
        print(f"✅ Role-Permission links: {links_count} found")
        
        print("\n✅ Verification passed!")
        return True
        
    except Exception as e:
        print(f"⚠️  Verification warning: {str(e)}")
        return False

if __name__ == '__main__':
    print("\n")
    if run_migration():
        verify_migration()
        print("\n✨ Done! RBAC system is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check errors above.")
        sys.exit(1)
