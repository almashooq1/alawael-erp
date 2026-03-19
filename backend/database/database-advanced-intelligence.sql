-- ================================================
-- قاعدة البيانات الذكية والمتقدمة - نظام الألوائل ERP
-- Advanced Intelligent Database - Alawael ERP System
-- ================================================

-- ================================================
-- القسم الأول: جداول الذكاء الاصطناعي والتنبؤات
-- ================================================

-- جدول نماذج التعلم الآلي
CREATE TABLE IF NOT EXISTS ai.ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('prediction', 'classification', 'clustering', 'recommendation', 'anomaly_detection')),
    version VARCHAR(50),
    description TEXT,
    algorithm VARCHAR(100),
    parameters JSONB,
    training_data JSONB,
    accuracy_metrics JSONB,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'training', 'validated', 'deployed', 'deprecated')),
    trained_at TIMESTAMP WITH TIME ZONE,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES erp.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول التنبؤات
CREATE TABLE IF NOT EXISTS ai.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES ai.ml_models(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    prediction_type VARCHAR(100) NOT NULL,
    prediction_value JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    features_used JSONB,
    explanation JSONB,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    actual_value JSONB,
    accuracy_score DECIMAL(5,4),
    feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول التوصيات الذكية
CREATE TABLE IF NOT EXISTS ai.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES erp.beneficiaries(id),
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    reasoning TEXT,
    priority INTEGER DEFAULT 5,
    expected_impact JSONB,
    suggested_actions JSONB,
    based_on_predictions UUID[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'implemented')),
    implemented_at TIMESTAMP WITH TIME ZONE,
    outcome_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول اكتشاف الشذوذ
CREATE TABLE IF NOT EXISTS ai.anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_value JSONB,
    expected_range JSONB,
    deviation_score DECIMAL(6,3),
    detection_method VARCHAR(100),
    related_factors JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')),
    resolved_by UUID REFERENCES erp.users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الثاني: جداول التحليلات المتقدمة
-- ================================================

-- جدول مؤشرات الأداء
CREATE TABLE IF NOT EXISTS analytics.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    calculation_formula TEXT,
    unit VARCHAR(50),
    target_value DECIMAL(15,4),
    warning_threshold DECIMAL(15,4),
    critical_threshold DECIMAL(15,4),
    aggregation_period VARCHAR(20) CHECK (aggregation_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    data_sources JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول قيم مؤشرات الأداء
CREATE TABLE IF NOT EXISTS analytics.kpi_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id UUID REFERENCES analytics.kpi_definitions(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    actual_value DECIMAL(15,4),
    target_value DECIMAL(15,4),
    variance DECIMAL(15,4),
    variance_percentage DECIMAL(8,4),
    trend VARCHAR(20) CHECK (trend IN ('improving', 'declining', 'stable')),
    status VARCHAR(20) CHECK (status IN ('on_track', 'warning', 'critical')),
    notes TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kpi_id, period_start)
);

-- جدول لوحات المتابعة المخصصة
CREATE TABLE IF NOT EXISTS analytics.dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    owner_id UUID REFERENCES erp.users(id),
    is_public BOOLEAN DEFAULT FALSE,
    layout JSONB,
    widgets JSONB,
    filters JSONB,
    refresh_interval INTEGER DEFAULT 300,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الثالث: جداول التنبيهات الذكية
-- ================================================

-- جدول قواعد التنبيهات
CREATE TABLE IF NOT EXISTS alerting.alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    entity_type VARCHAR(100),
    condition_type VARCHAR(50) CHECK (condition_type IN ('threshold', 'trend', 'anomaly', 'schedule', 'compound')),
    conditions JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    notification_channels JSONB,
    recipients JSONB,
    cooldown_period INTEGER DEFAULT 3600,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES erp.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل التنبيهات
CREATE TABLE IF NOT EXISTS alerting.alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES alerting.alert_rules(id),
    entity_type VARCHAR(100),
    entity_id UUID,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    severity VARCHAR(20),
    triggered_value JSONB,
    threshold_value JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_by UUID REFERENCES erp.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES erp.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الرابع: جداول التكاملات الذكية
-- ================================================

-- جدول التكاملات النشطة
CREATE TABLE IF NOT EXISTS integration.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    provider VARCHAR(100),
    endpoint_url VARCHAR(500),
    authentication_type VARCHAR(50),
    credentials JSONB ENCRYPTED,
    configuration JSONB,
    sync_schedule VARCHAR(100),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل التكامل
CREATE TABLE IF NOT EXISTS integration.sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES integration.connections(id),
    sync_type VARCHAR(50) CHECK (sync_type IN ('full', 'incremental', 'delta')),
    direction VARCHAR(20) CHECK (direction IN ('import', 'export', 'bidirectional')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'running',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم الخامس: جداول إدارة المعرفة
-- ================================================

-- جدول قاعدة المعرفة
CREATE TABLE IF NOT EXISTS knowledge.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_ar VARCHAR(500) NOT NULL,
    title_en VARCHAR(500),
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    author_id UUID REFERENCES erp.users(id),
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES knowledge.articles(id),
    related_articles UUID[],
    attachments JSONB,
    views_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأسئلة الشائعة
CREATE TABLE IF NOT EXISTS knowledge.faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_ar TEXT NOT NULL,
    question_en TEXT,
    answer_ar TEXT NOT NULL,
    answer_en TEXT,
    category VARCHAR(100),
    keywords TEXT[],
    helpful_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- القسم السادس: جداول الجداول الزمنية والمهام
-- ================================================

-- جدول المشاريع
CREATE TABLE IF NOT EXISTS planning.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    project_type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,
    budget DECIMAL(15,2),
    spent DECIMAL(15,2) DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    owner_id UUID REFERENCES erp.users(id),
    department_id UUID REFERENCES erp.departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول المهام
CREATE TABLE IF NOT EXISTS planning.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES planning.projects(id),
    parent_task_id UUID REFERENCES planning.tasks(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES erp.users(id),
    due_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2) DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    tags TEXT[],
    attachments JSONB,
    created_by UUID REFERENCES erp.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- القسم السابع: جداول الرسوم البيانية المعرفية
-- ================================================

-- جدول العلاقات بين الكيانات
CREATE TABLE IF NOT EXISTS graph.entity_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(100) NOT NULL,
    source_id UUID NOT NULL,
    relation_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    properties JSONB,
    weight DECIMAL(5,4) DEFAULT 1.0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, relation_type, target_type, target_id)
);

-- ================================================
-- الفهارس للجداول الذكية
-- ================================================

-- فهارس التنبؤات
CREATE INDEX IF NOT EXISTS idx_predictions_model ON ai.predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_predictions_entity ON ai.predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON ai.predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON ai.predictions(created_at);

-- فهارس الشذوذ
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON ai.anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON ai.anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON ai.anomalies(detected_at);

-- فهارس KPI
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_period ON analytics.kpi_values(kpi_id, period_start);
CREATE INDEX IF NOT EXISTS idx_kpi_values_status ON analytics.kpi_values(status);

-- فهارس التنبيهات
CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alerting.alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alerting.alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alerting.alert_history(triggered_at);

-- فهارس العلاقات
CREATE INDEX IF NOT EXISTS idx_relations_source ON graph.entity_relations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON graph.entity_relations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON graph.entity_relations(relation_type);

-- ================================================
-- الإجراءات المخزنة الذكية
-- ================================================

-- إجراء حساب التنبؤ بالحضور
CREATE OR REPLACE FUNCTION ai.predict_attendance(
    p_beneficiary_id UUID,
    p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE (
    prediction_date DATE,
    attendance_probability DECIMAL(5,4),
    confidence DECIMAL(5,4),
    factors JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH historical_data AS (
        SELECT 
            scheduled_date,
            status,
            EXTRACT(DOW FROM scheduled_date) as day_of_week,
            EXTRACT(MONTH FROM scheduled_date) as month
        FROM erp.therapy_sessions
        WHERE beneficiary_id = p_beneficiary_id
        AND scheduled_date >= CURRENT_DATE - INTERVAL '90 days'
    ),
    day_patterns AS (
        SELECT 
            day_of_week,
            COUNT(*) as total_sessions,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
            AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM historical_data
        GROUP BY day_of_week
    )
    SELECT 
        (CURRENT_DATE + (d || ' day')::INTERVAL)::DATE as prediction_date,
        COALESCE(dp.completion_rate, 0.75) as attendance_probability,
        CASE 
            WHEN dp.total_sessions >= 10 THEN 0.9
            WHEN dp.total_sessions >= 5 THEN 0.7
            ELSE 0.5
        END as confidence,
        jsonb_build_object(
            'day_of_week', d,
            'historical_sessions', COALESCE(dp.total_sessions, 0),
            'completion_rate', COALESCE(dp.completion_rate, 0)
        ) as factors
    FROM generate_series(1, p_days_ahead) as d
    LEFT JOIN day_patterns dp ON dp.day_of_week = (CURRENT_DATE + (d || ' day')::INTERVAL)::DATE
    ORDER BY d;
END;
$$ LANGUAGE plpgsql;

-- إجراء حساب مؤشرات الأداء
CREATE OR REPLACE FUNCTION analytics.calculate_kpi(
    p_kpi_code VARCHAR(50),
    p_period_start DATE,
    p_period_end DATE
) RETURNS DECIMAL(15,4) AS $$
DECLARE
    v_formula TEXT;
    v_result DECIMAL(15,4);
BEGIN
    SELECT calculation_formula INTO v_formula
    FROM analytics.kpi_definitions
    WHERE code = p_kpi_code;
    
    -- حسابات مختلفة حسب نوع المؤشر
    CASE p_kpi_code
        WHEN 'ATTENDANCE_RATE' THEN
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 0)
            INTO v_result
            FROM erp.therapy_sessions
            WHERE scheduled_date BETWEEN p_period_start AND p_period_end;
            
        WHEN 'GOAL_ACHIEVEMENT_RATE' THEN
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END)::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 0)
            INTO v_result
            FROM erp.beneficiaries b,
            jsonb_array_elements(b.goals) as goal
            WHERE b.created_at BETWEEN p_period_start AND p_period_end;
            
        WHEN 'BENEFICIARY_SATISFACTION' THEN
            SELECT COALESCE(AVG(satisfaction_score), 0)
            INTO v_result
            FROM erp.satisfaction_surveys
            WHERE survey_date BETWEEN p_period_start AND p_period_end;
            
        ELSE
            v_result := 0;
    END CASE;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Views للتقارير الذكية
-- ================================================

-- عرض ملخص المستفيدين
CREATE OR REPLACE VIEW analytics.beneficiary_summary AS
SELECT 
    b.id,
    b.beneficiary_number,
    b.personal_info->>'firstNameAr' as first_name,
    b.personal_info->>'lastNameAr' as last_name,
    b.enrollment_status,
    b.status,
    (SELECT COUNT(*) FROM erp.therapy_sessions ts WHERE ts.beneficiary_id = b.id) as total_sessions,
    (SELECT COUNT(*) FROM erp.therapy_sessions ts WHERE ts.beneficiary_id = b.id AND ts.status = 'completed') as completed_sessions,
    (SELECT ROUND(
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 0), 2
    ) FROM erp.therapy_sessions ts WHERE ts.beneficiary_id = b.id) as attendance_rate,
    (SELECT jsonb_array_length(b.goals)) as total_goals,
    (SELECT COUNT(*) FROM jsonb_array_elements(b.goals) goal WHERE goal->>'status' = 'achieved') as achieved_goals,
    b.created_at
FROM erp.beneficiaries b;

-- عرض أداء الفروع
CREATE OR REPLACE VIEW analytics.branch_performance AS
SELECT 
    br.id as branch_id,
    br.name_ar as branch_name,
    (SELECT COUNT(*) FROM erp.beneficiaries b WHERE b.registration_info->>'branch' = br.id::text AND b.status = 'active') as active_beneficiaries,
    (SELECT COUNT(*) FROM erp.users u WHERE u.branch_id = br.id AND u.status = 'active') as active_employees,
    (SELECT COUNT(*) FROM erp.therapy_sessions ts 
     JOIN erp.users u ON u.id = ts.therapist_id 
     WHERE u.branch_id = br.id 
     AND ts.scheduled_date >= CURRENT_DATE - INTERVAL '30 days') as sessions_last_30_days,
    (SELECT ROUND(
        COALESCE(SUM(CASE WHEN ts.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 0), 2
    ) FROM erp.therapy_sessions ts 
     JOIN erp.users u ON u.id = ts.therapist_id 
     WHERE u.branch_id = br.id 
     AND ts.scheduled_date >= CURRENT_DATE - INTERVAL '30 days') as completion_rate
FROM erp.branches br
WHERE br.status = 'active';

-- ================================================
-- نهاية ملف قاعدة البيانات الذكية والمتقدمة
-- ================================================