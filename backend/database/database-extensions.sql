-- ================================================
-- تطوير قاعدة البيانات - نظام الألوائل ERP
-- Database Development - Alawael ERP System
-- ================================================

-- إنشاء المخططات
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS saudi_compliance;

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- القسم الأول: جداول المستخدمين والأمان
-- ================================================

-- جدول المستخدمين المحسن
CREATE TABLE IF NOT EXISTS erp.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    national_id VARCHAR(10) UNIQUE,
    iqama_number VARCHAR(10) UNIQUE,
    passport_number VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    nationality VARCHAR(100),
    
    -- معلومات الوظيفة
    job_title VARCHAR(255),
    department_id UUID REFERENCES erp.departments(id),
    branch_id UUID REFERENCES erp.branches(id),
    manager_id UUID REFERENCES erp.users(id),
    employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'remote')),
    hire_date DATE,
    termination_date DATE,
    
    -- الحالة والأمان
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    
    -- إعدادات المستخدم
    language VARCHAR(5) DEFAULT 'ar',
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    avatar_url VARCHAR(500),
    
    -- التوقيت
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- جدول الأقسام
CREATE TABLE IF NOT EXISTS erp.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    parent_id UUID REFERENCES erp.departments(id),
    manager_id UUID REFERENCES erp.users(id),
    branch_id UUID REFERENCES erp.branches(id),
    description TEXT,
    budget DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الفروع
CREATE TABLE IF NOT EXISTS erp.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    region VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id UUID REFERENCES erp.users(id),
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    location GEOGRAPHY(POINT),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الثاني: جداول المستفيدين والتأهيل
-- ================================================

-- جدول المستفيدين (ذوي الإعاقة)
CREATE TABLE IF NOT EXISTS erp.beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- البيانات الشخصية
    first_name_ar VARCHAR(255) NOT NULL,
    first_name_en VARCHAR(255),
    last_name_ar VARCHAR(255) NOT NULL,
    last_name_en VARCHAR(255),
    national_id VARCHAR(10) UNIQUE,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    nationality VARCHAR(100),
    
    -- معلومات الإعاقة
    disability_type_id UUID REFERENCES erp.disability_types(id),
    disability_degree VARCHAR(20) CHECK (disability_degree IN ('mild', 'moderate', 'severe', 'profound')),
    disability_date DATE,
    medical_report_number VARCHAR(100),
    medical_report_date DATE,
    medical_report_file VARCHAR(500),
    
    -- معلومات التواصل
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- معلومات الولي/الوصي
    guardian_name VARCHAR(255),
    guardian_relation VARCHAR(50),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(255),
    guardian_national_id VARCHAR(10),
    
    -- معلومات التسجيل
    registration_date DATE DEFAULT CURRENT_DATE,
    branch_id UUID REFERENCES erp.branches(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'suspended')),
    enrollment_status VARCHAR(20) DEFAULT 'pending' CHECK (enrollment_status IN ('pending', 'assessed', 'enrolled', 'on_leave', 'completed')),
    
    -- الخطة التأهيلية
    current_plan_id UUID REFERENCES erp.rehabilitation_plans(id),
    primary_therapist_id UUID REFERENCES erp.users(id),
    
    -- التوقيت
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES erp.users(id)
);

-- جدول أنواع الإعاقة
CREATE TABLE IF NOT EXISTS erp.disability_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    description TEXT,
    services JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول خطط التأهيل
CREATE TABLE IF NOT EXISTS erp.rehabilitation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES erp.beneficiaries(id),
    plan_number VARCHAR(50) UNIQUE,
    plan_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    goals JSONB,
    sessions_per_week INTEGER DEFAULT 3,
    session_duration INTEGER DEFAULT 45, -- بالدقائق
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    approved_by UUID REFERENCES erp.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES erp.users(id)
);

-- جدول جلسات التأهيل
CREATE TABLE IF NOT EXISTS erp.therapy_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number VARCHAR(50) UNIQUE,
    beneficiary_id UUID REFERENCES erp.beneficiaries(id),
    plan_id UUID REFERENCES erp.rehabilitation_plans(id),
    therapist_id UUID REFERENCES erp.users(id),
    session_type VARCHAR(50),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- بالدقائق
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    room_id UUID REFERENCES erp.therapy_rooms(id),
    notes TEXT,
    progress_notes TEXT,
    attendance_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول غرف العلاج
CREATE TABLE IF NOT EXISTS erp.therapy_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    branch_id UUID REFERENCES erp.branches(id),
    room_type VARCHAR(50),
    capacity INTEGER DEFAULT 1,
    equipment JSONB,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الثالث: جداول الموارد البشرية
-- ================================================

-- جدول الحضور والانصراف
CREATE TABLE IF NOT EXISTS erp.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES erp.users(id),
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    break_duration INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'early_leave', 'leave', 'holiday', 'remote')),
    location_check_in GEOGRAPHY(POINT),
    location_check_out GEOGRAPHY(POINT),
    ip_check_in VARCHAR(45),
    ip_check_out VARCHAR(45),
    notes TEXT,
    approved_by UUID REFERENCES erp.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- جدور الإجازات
CREATE TABLE IF NOT EXISTS erp.leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES erp.users(id),
    leave_type_id UUID REFERENCES erp.leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES erp.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول أنواع الإجازات
CREATE TABLE IF NOT EXISTS erp.leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    annual_allowance DECIMAL(4,1),
    is_paid BOOLEAN DEFAULT TRUE,
    carry_over BOOLEAN DEFAULT TRUE,
    max_carry_over DECIMAL(4,1) DEFAULT 0,
    requires_approval BOOLEAN DEFAULT TRUE,
    gender_restriction VARCHAR(10),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الرواتب
CREATE TABLE IF NOT EXISTS erp.salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES erp.users(id),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    basic_salary DECIMAL(12,2) NOT NULL,
    housing_allowance DECIMAL(12,2) DEFAULT 0,
    transport_allowance DECIMAL(12,2) DEFAULT 0,
    other_allowances DECIMAL(12,2) DEFAULT 0,
    overtime_amount DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    gosi_employee DECIMAL(12,2) DEFAULT 0,
    gosi_employer DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,
    working_days INTEGER,
    absent_days DECIMAL(4,1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(20),
    bank_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month, year)
);

-- ================================================
-- القسم الرابع: جداول النقل
-- ================================================

-- جدول المركبات
CREATE TABLE IF NOT EXISTS erp.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    seats_capacity INTEGER,
    fuel_type VARCHAR(20),
    branch_id UUID REFERENCES erp.branches(id),
    driver_id UUID REFERENCES erp.users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service', 'sold')),
    registration_expiry DATE,
    insurance_expiry DATE,
    fitness_expiry DATE,
    current_mileage INTEGER,
    last_service_date DATE,
    next_service_date DATE,
    gps_device_id VARCHAR(100),
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الرحلات
CREATE TABLE IF NOT EXISTS erp.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number VARCHAR(50) UNIQUE,
    vehicle_id UUID REFERENCES erp.vehicles(id),
    driver_id UUID REFERENCES erp.users(id),
    trip_type VARCHAR(20) CHECK (trip_type IN ('pickup', 'dropoff', 'transfer', 'other')),
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    start_location GEOGRAPHY(POINT),
    end_location GEOGRAPHY(POINT),
    route JSONB,
    distance_km DECIMAL(6,2),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول ركاب الرحلات
CREATE TABLE IF NOT EXISTS erp.trip_passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES erp.trips(id),
    beneficiary_id UUID REFERENCES erp.beneficiaries(id),
    pickup_location GEOGRAPHY(POINT),
    pickup_time TIME,
    dropoff_location GEOGRAPHY(POINT),
    dropoff_time TIME,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'picked_up', 'dropped_off', 'absent', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الخامس: الامتثال السعودي
-- ================================================

-- جدول الزكاة والضريبة
CREATE TABLE IF NOT EXISTS saudi_compliance.tax_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_type VARCHAR(20) CHECK (tax_type IN ('vat', 'zakat', 'withholding', 'other')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    taxable_amount DECIMAL(15,2),
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'filed', 'paid', 'verified')),
    filing_date DATE,
    payment_date DATE,
    reference_number VARCHAR(100),
    zatca_reference VARCHAR(100),
    notes TEXT,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تكامل Qiwa
CREATE TABLE IF NOT EXISTS saudi_compliance.qiwa_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تكامل أبشر/الجوازات
CREATE TABLE IF NOT EXISTS saudi_compliance.moi_integration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(50) NOT NULL,
    national_id VARCHAR(10),
    iqama_number VARCHAR(10),
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reference_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم السادس: سجل التدقيق
-- ================================================

-- جدول سجل التدقيق الشامل
CREATE TABLE IF NOT EXISTS audit.logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    module VARCHAR(50),
    sub_module VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تاريخ التعديلات
CREATE TABLE IF NOT EXISTS audit.change_history (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT
);

-- ================================================
-- القسم السابع: الفهارس
-- ================================================

-- فهارس المستخدمين
CREATE INDEX IF NOT EXISTS idx_users_email ON erp.users(email);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON erp.users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON erp.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON erp.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON erp.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON erp.users(status);
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON erp.users USING gin(full_name_ar gin_trgm_ops);

-- فهارس المستفيدين
CREATE INDEX IF NOT EXISTS idx_beneficiaries_number ON erp.beneficiaries(beneficiary_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_national_id ON erp.beneficiaries(national_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_branch ON erp.beneficiaries(branch_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON erp.beneficiaries(status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name_trgm ON erp.beneficiaries USING gin(first_name_ar gin_trgm_ops, last_name_ar gin_trgm_ops);

-- فهارس الحضور
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON erp.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON erp.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON erp.attendance(status);

-- فهارس الجلسات
CREATE INDEX IF NOT EXISTS idx_sessions_beneficiary ON erp.therapy_sessions(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist ON erp.therapy_sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON erp.therapy_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON erp.therapy_sessions(status);

-- فهارس التدقيق
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit.logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit.logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit.logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit.logs(module);

-- فهارس النقل
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON erp.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON erp.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON erp.trips(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON erp.vehicles(branch_id);

-- ================================================
-- القسم الثامن: الإجراءات المخزنة
-- ================================================

-- إجراء حساب صافي الراتب
CREATE OR REPLACE FUNCTION erp.calculate_net_salary(
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_basic DECIMAL(12,2);
    v_allowances DECIMAL(12,2);
    v_overtime DECIMAL(12,2);
    v_deductions DECIMAL(12,2);
    v_gosi DECIMAL(12,2);
    v_net DECIMAL(12,2);
BEGIN
    SELECT basic_salary, housing_allowance + transport_allowance + other_allowances
    INTO v_basic, v_allowances
    FROM erp.employee_contracts
    WHERE employee_id = p_employee_id AND status = 'active';
    
    -- حساب الإضافي
    SELECT COALESCE(SUM(overtime_hours * hourly_rate), 0)
    INTO v_overtime
    FROM erp.overtime_records
    WHERE employee_id = p_employee_id
    AND EXTRACT(MONTH FROM overtime_date) = p_month
    AND EXTRACT(YEAR FROM overtime_date) = p_year;
    
    -- حساب الخصومات
    SELECT COALESCE(SUM(amount), 0)
    INTO v_deductions
    FROM erp.deductions
    WHERE employee_id = p_employee_id
    AND EXTRACT(MONTH FROM deduction_date) = p_month
    AND EXTRACT(YEAR FROM deduction_date) = p_year;
    
    -- حساب التأمينات (10% من الموظف)
    v_gosi := (v_basic + v_allowances) * 0.10;
    
    -- حساب صافي الراتب
    v_net := v_basic + v_allowances + v_overtime - v_deductions - v_gosi;
    
    RETURN v_net;
END;
$$ LANGUAGE plpgsql;

-- إجراء توليد رقم المستفيد
CREATE OR REPLACE FUNCTION erp.generate_beneficiary_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_sequence INTEGER;
    v_number VARCHAR(50);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(beneficiary_number FROM 9 FOR 6) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM erp.beneficiaries
    WHERE beneficiary_number LIKE 'BEN' || v_year || '%';
    
    v_number := 'BEN' || v_year || LPAD(v_sequence::TEXT, 6, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

--_TRIGGER لتحديث التوقيت
CREATE OR REPLACE FUNCTION erp.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ trigger على الجداول
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON erp.users
FOR EACH ROW EXECUTE FUNCTION erp.update_timestamp();

CREATE TRIGGER update_beneficiaries_timestamp
BEFORE UPDATE ON erp.beneficiaries
FOR EACH ROW EXECUTE FUNCTION erp.update_timestamp();

CREATE TRIGGER update_departments_timestamp
BEFORE UPDATE ON erp.departments
FOR EACH ROW EXECUTE FUNCTION erp.update_timestamp();

CREATE TRIGGER update_branches_timestamp
BEFORE UPDATE ON erp.branches
FOR EACH ROW EXECUTE FUNCTION erp.update_timestamp();

-- ================================================
-- القسم التاسع: البيانات الأولية
-- ================================================

-- إدخال أنواع الإعاقة الافتراضية
INSERT INTO erp.disability_types (name_ar, name_en, code, category) VALUES
('إعاقة حركية', 'Motor Disability', 'MD', 'physical'),
('إعاقة سمعية', 'Hearing Disability', 'HD', 'sensory'),
('إعاقة بصرية', 'Visual Disability', 'VD', 'sensory'),
('إعاقة ذهنية', 'Intellectual Disability', 'ID', 'cognitive'),
('اضطراب طيف التوحد', 'Autism Spectrum Disorder', 'ASD', 'developmental'),
('اضطراب فرط الحركة وتشتت الانتباه', 'ADHD', 'ADHD', 'developmental'),
('شلل دماغي', 'Cerebral Palsy', 'CP', 'physical'),
('متلازمة داون', 'Down Syndrome', 'DS', 'genetic'),
('إعاقة متعددة', 'Multiple Disabilities', 'MLD', 'multiple'),
('اضطرابات النطق واللغة', 'Speech & Language Disorders', 'SLD', 'communication')
ON CONFLICT (code) DO NOTHING;

-- إدخال أنواع الإجازات الافتراضية
INSERT INTO erp.leave_types (name_ar, name_en, code, annual_allowance, is_paid, carry_over, max_carry_over) VALUES
('إجازة سنوية', 'Annual Leave', 'ANNUAL', 30, TRUE, TRUE, 10),
('إجازة مرضية', 'Sick Leave', 'SICK', 120, TRUE, FALSE, 0),
('إجازة طارئة', 'Emergency Leave', 'EMERGENCY', 4, TRUE, FALSE, 0),
('إجازة زواج', 'Marriage Leave', 'MARRIAGE', 5, TRUE, FALSE, 0),
('إجازة أمومة', 'Maternity Leave', 'MATERNITY', 90, TRUE, FALSE, 0),
('إجازة أبوة', 'Paternity Leave', 'PATERNITY', 3, TRUE, FALSE, 0),
('إجازة حج', 'Hajj Leave', 'HAJJ', 10, TRUE, FALSE, 0),
('إجازة عزاء', 'Bereavement Leave', 'BEREAVEMENT', 5, TRUE, FALSE, 0)
ON CONFLICT (code) DO NOTHING;

-- إدخال الأدوار الافتراضية
INSERT INTO erp.roles (name, name_ar, level, permissions) VALUES
('admin', 'مدير النظام', 100, '{"all": true}'),
('hr_manager', 'مدير الموارد البشرية', 80, '{"hr": true, "employees": true, "attendance": true}'),
('finance_manager', 'مدير المالية', 80, '{"finance": true, "payroll": true, "reports": true}'),
('branch_manager', 'مدير فرع', 70, '{"branch": true, "beneficiaries": true, "sessions": true}'),
('therapist', 'أخصائي تأهيل', 50, '{"sessions": true, "beneficiaries": true, "plans": true}'),
('teacher', 'معلم', 50, '{"students": true, "classes": true}'),
('driver', 'سائق', 30, '{"trips": true, "vehicles": true}'),
('receptionist', 'موظف استقبال', 30, '{"appointments": true, "beneficiaries": true}')
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- القسم العاشر: الصلاحيات
-- ================================================

-- منح الصلاحيات للمستخدمين
GRANT USAGE ON SCHEMA erp TO erp_admin;
GRANT USAGE ON SCHEMA audit TO erp_admin;
GRANT USAGE ON SCHEMA saudi_compliance TO erp_admin;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO erp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA saudi_compliance TO erp_admin;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO erp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA saudi_compliance TO erp_admin;

-- ================================================
-- نهاية ملف تطوير قاعدة البيانات
-- ================================================