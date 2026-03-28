# دليل التنفيذ التقني - نظام ERP مراكز التأهيل
> **الإصدار:** 1.0 Enterprise | **التاريخ:** 1447هـ / 2026م
> **المرجع:** REHAB_ERP_ENTERPRISE_v3.md | رؤية 2030 | HRSD قرار 291/1443هـ

---

## فهرس المحتويات
1. [هيكل Odoo Custom Addons](#1-هيكل-odoo-custom-addons)
2. [OpenAPI Specification - واجهات API](#2-openapi-specification)
3. [خطة الاختبارات الشاملة](#3-خطة-الاختبارات)
4. [قائمة النشر التفصيلية](#4-قائمة-النشر)
5. [دليل تكامل HRSD / ZATCA / Absher](#5-تكامل-الأنظمة-الحكومية)
6. [خطة الاسترداد من الكوارث (DR)](#6-خطة-الاسترداد)
7. [دليل المستخدم - المعالجون وأولياء الأمور](#7-دليل-المستخدم)
8. [النموذج المالي التفصيلي](#8-النموذج-المالي)
9. [SLA واتفاقية مستوى الخدمة](#9-sla)
10. [خارطة الطريق التقنية 2026-2028](#10-خارطة-الطريق)

---

## 1. هيكل Odoo Custom Addons

### 1.1 بنية الملفات الكاملة

```
custom_addons/
├── rehab_core/                          # الوحدة الأساسية
│   ├── __manifest__.py
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── rehab_beneficiary.py         # نموذج المستفيد الرئيسي
│   │   ├── rehab_program.py             # برامج التأهيل
│   │   ├── rehab_session.py             # الجلسات العلاجية
│   │   ├── rehab_assessment.py          # تقييمات المقاييس
│   │   └── rehab_goal.py               # الأهداف العلاجية (GAS)
│   ├── views/
│   │   ├── beneficiary_views.xml
│   │   ├── program_views.xml
│   │   ├── session_views.xml
│   │   ├── assessment_views.xml
│   │   └── menu_views.xml
│   ├── security/
│   │   ├── ir.model.access.csv
│   │   └── rehab_security.xml
│   ├── data/
│   │   ├── disability_types.xml
│   │   ├── icf_codes.xml
│   │   └── program_templates.xml
│   └── report/
│       ├── beneficiary_report.xml
│       └── assessment_report.xml
│
├── rehab_scheduling/                    # وحدة الجدولة الذكية
│   ├── __manifest__.py
│   ├── models/
│   │   ├── rehab_shift.py              # إدارة الشفتات
│   │   ├── rehab_slot.py              # فترات الجدول
│   │   └── rehab_scheduler.py         # محرك الجدولة OR-Tools
│   ├── services/
│   │   └── ortools_scheduler.py       # خوارزمية CP-SAT
│   └── wizards/
│       └── generate_schedule_wizard.py
│
├── rehab_transport/                    # وحدة النقل
│   ├── __manifest__.py
│   ├── models/
│   │   ├── transport_booking.py
│   │   ├── transport_route.py
│   │   └── transport_vehicle.py
│   ├── services/
│   │   └── vrptw_optimizer.py         # Google OR-Tools VRPTW
│   └── controllers/
│       └── gps_tracking.py            # WebSocket GPS
│
├── rehab_compliance/                   # وحدة الامتثال HRSD
│   ├── __manifest__.py
│   ├── models/
│   │   ├── compliance_report.py
│   │   └── compliance_check.py
│   ├── services/
│   │   ├── hrsd_api_client.py
│   │   ├── zatca_client.py
│   │   └── absher_client.py
│   └── cron/
│       └── monthly_report_cron.xml
│
├── rehab_ai/                           # وحدة الذكاء الاصطناعي
│   ├── __manifest__.py
│   ├── models/
│   │   ├── ai_prediction.py
│   │   └── ai_recommendation.py
│   └── services/
│       ├── progress_predictor.py      # LSTM TensorFlow
│       ├── early_warning.py           # Celery Tasks
│       └── chatbot_client.py          # FastAPI Bridge
│
└── rehab_family_portal/               # بوابة الأسر
    ├── __manifest__.py
    ├── controllers/
    │   └── family_portal.py
    ├── views/
    │   └── portal_templates.xml
    └── static/
        └── src/js/
            └── chatbot_widget.js
```

### 1.2 الـ Manifest الرئيسي

```python
# custom_addons/rehab_core/__manifest__.py
{
    'name':        'Rehab Center ERP - Core',
    'version':     '17.0.3.0.0',
    'summary':     'نظام ERP متكامل لمراكز تأهيل ذوي الإعاقة',
    'description': '''
        نظام إدارة شامل لمراكز تأهيل ذوي الإعاقة في المملكة العربية السعودية
        متوافق مع متطلبات HRSD - قرار 291/1443هـ ورؤية 2030
    ''',
    'author':      'ALAWAEL Technology',
    'category':    'Healthcare/Rehabilitation',
    'license':     'LGPL-3',
    'depends': [
        'base', 'hr', 'project', 'account',
        'fleet', 'stock', 'mail', 'portal',
        'web', 'resource', 'calendar',
    ],
    'data': [
        'security/rehab_security.xml',
        'security/ir.model.access.csv',
        'data/disability_types.xml',
        'data/program_templates.xml',
        'data/icf_codes.xml',
        'views/menu_views.xml',
        'views/beneficiary_views.xml',
        'views/program_views.xml',
        'views/session_views.xml',
        'views/assessment_views.xml',
        'report/beneficiary_report.xml',
        'report/assessment_report.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'rehab_core/static/src/js/rehab_dashboard.js',
            'rehab_core/static/src/css/rehab_styles.css',
        ],
    },
    'installable': True,
    'auto_install': False,
    'application': True,
    'sequence': 1,
}
```

### 1.3 RBAC Security Matrix

```xml
<!-- security/rehab_security.xml -->
<odoo>
  <!-- Groups -->
  <record id="group_rehab_therapist" model="res.groups">
    <field name="name">معالج</field>
    <field name="category_id" ref="base.module_category_hidden"/>
  </record>
  <record id="group_rehab_supervisor" model="res.groups">
    <field name="name">مشرف التأهيل</field>
    <field name="implied_ids" eval="[(4, ref('group_rehab_therapist'))]"/>
  </record>
  <record id="group_rehab_branch_manager" model="res.groups">
    <field name="name">مدير الفرع</field>
    <field name="implied_ids" eval="[(4, ref('group_rehab_supervisor'))]"/>
  </record>
  <record id="group_rehab_hq_admin" model="res.groups">
    <field name="name">مدير المجموعة</field>
    <field name="implied_ids" eval="[(4, ref('group_rehab_branch_manager'))]"/>
  </record>

  <!-- Record Rules - Branch Isolation -->
  <record id="rule_beneficiary_branch" model="ir.rule">
    <field name="name">مستفيدو الفرع فقط</field>
    <field name="model_id" ref="model_rehab_beneficiary"/>
    <field name="groups" eval="[(4, ref('group_rehab_therapist'))]"/>
    <field name="domain_force">
      [('branch_id.id', '=', user.branch_id.id)]
    </field>
  </record>
</odoo>
```

---

## 2. OpenAPI Specification

### 2.1 مواصفة API الرئيسية (OpenAPI 3.1)

```yaml
openapi: "3.1.0"
info:
  title: ALAWAEL Rehab ERP API
  version: "3.0.0"
  description: |
    واجهة برمجية لنظام ERP مراكز التأهيل
    تدعم: REST JSON + WebSocket للبيانات الفورية
  contact:
    name: ALAWAEL Tech Support
    email: api@alawael-rehab.sa
  license:
    name: Proprietary

servers:
  - url: https://api.alawael-rehab.sa/v3
    description: Production - Riyadh Region
  - url: https://staging-api.alawael-rehab.sa/v3
    description: Staging

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Beneficiary:
      type: object
      required: [name_ar, national_id, disability_type, branch_id]
      properties:
        id:              { type: string, format: uuid }
        name_ar:         { type: string, example: "محمد أحمد العمري" }
        national_id:     { type: string, pattern: "^[12][0-9]{9}$" }
        birth_date:      { type: string, format: date }
        gender:          { type: string, enum: [male, female] }
        disability_type:
          type: string
          enum: [physical, sensory, cognitive, autism, speech, multiple]
        disability_degree:
          type: string
          enum: [mild, moderate, severe]
        icf_code:        { type: string, example: "b710" }
        status:
          type: string
          enum: [pending, approved, active, on_hold, graduated, transferred]
        branch_id:       { type: string, format: uuid }
        hrsd_registration_no: { type: string }
        pedi_score:      { type: number, minimum: 0, maximum: 100 }
        gmfm_score:      { type: number, minimum: 0, maximum: 100 }
        created_at:      { type: string, format: date-time }

    Assessment:
      type: object
      required: [beneficiary_id, assessment_date, assessment_type]
      properties:
        id:               { type: string, format: uuid }
        beneficiary_id:   { type: string, format: uuid }
        assessment_date:  { type: string, format: date }
        assessor_id:      { type: string, format: uuid }
        assessment_type:
          type: string
          enum: [initial, quarterly, annual, discharge]
        pedi_daily_activities: { type: number }
        pedi_mobility:         { type: number }
        pedi_social_cognitive: { type: number }
        pedi_responsibility:   { type: number }
        pedi_total:            { type: number }
        gmfm_total:            { type: number }
        gmfcs_level:           { type: integer, minimum: 1, maximum: 5 }
        copm_performance_pre:  { type: number }
        copm_satisfaction_pre: { type: number }
        copm_performance_post: { type: number }
        copm_satisfaction_post:{ type: number }
        whodas_total:          { type: number }

    Session:
      type: object
      properties:
        id:            { type: string, format: uuid }
        beneficiary_id:{ type: string, format: uuid }
        therapist_id:  { type: string, format: uuid }
        program_type:
          type: string
          enum: [PT, OT, ST, psychology, special_education, social_work]
        shift:         { type: string, enum: [morning, evening] }
        scheduled_at:  { type: string, format: date-time }
        duration_min:  { type: integer, minimum: 30, maximum: 120 }
        status:        { type: string, enum: [scheduled, completed, cancelled, no_show] }
        attendance:    { type: boolean }
        notes:         { type: string }
        progress_score:{ type: number, minimum: 1, maximum: 5 }

    TransportBooking:
      type: object
      properties:
        id:            { type: string, format: uuid }
        beneficiary_id:{ type: string, format: uuid }
        session_id:    { type: string, format: uuid }
        pickup_address:{ type: string }
        pickup_lat:    { type: number }
        pickup_lng:    { type: number }
        needs_ramp:    { type: boolean }
        pickup_window_start: { type: string, format: time }
        pickup_window_end:   { type: string, format: time }
        vehicle_id:    { type: string, format: uuid }
        driver_id:     { type: string, format: uuid }
        eta_minutes:   { type: integer }
        status:
          type: string
          enum: [pending, assigned, en_route, arrived, completed, cancelled]

    AIprediction:
      type: object
      properties:
        beneficiary_id:          { type: string, format: uuid }
        goal_achievement_prob:   { type: number, minimum: 0, maximum: 1 }
        risk_level:              { type: string, enum: [low, medium, high] }
        next_pedi_forecast:      { type: number }
        recommended_adjustments: { type: array, items: { type: string } }
        alerts:                  { type: array, items: { type: string } }
        generated_at:            { type: string, format: date-time }

    Error:
      type: object
      properties:
        code:    { type: integer }
        message: { type: string }
        details: { type: object }

paths:
  # ─── Beneficiaries ──────────────────────────────────
  /beneficiaries:
    get:
      summary: قائمة المستفيدين
      tags: [Beneficiaries]
      parameters:
        - name: branch_id
          in: query
          schema: { type: string, format: uuid }
        - name: status
          in: query
          schema: { type: string, enum: [active, pending, graduated] }
        - name: disability_type
          in: query
          schema: { type: string }
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        "200":
          description: قائمة ناجحة
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:  { type: array, items: { $ref: '#/components/schemas/Beneficiary' } }
                  total: { type: integer }
                  page:  { type: integer }
        "401": { description: غير مصرح }
        "403": { description: غير مخول }

    post:
      summary: تسجيل مستفيد جديد
      tags: [Beneficiaries]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Beneficiary' }
      responses:
        "201":
          description: تم التسجيل
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Beneficiary' }
        "400": { description: بيانات غير صحيحة }
        "409": { description: الهوية الوطنية مسجلة مسبقاً }

  /beneficiaries/{id}:
    get:
      summary: تفاصيل مستفيد
      tags: [Beneficiaries]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Beneficiary' }

    patch:
      summary: تحديث بيانات مستفيد
      tags: [Beneficiaries]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Beneficiary' }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Beneficiary' }

  # ─── Assessments ────────────────────────────────────
  /assessments:
    post:
      summary: إضافة تقييم جديد
      tags: [Assessments]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Assessment' }
      responses:
        "201":
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Assessment' }

  /assessments/beneficiary/{beneficiary_id}:
    get:
      summary: تاريخ تقييمات مستفيد
      tags: [Assessments]
      parameters:
        - name: beneficiary_id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: from_date
          in: query
          schema: { type: string, format: date }
        - name: to_date
          in: query
          schema: { type: string, format: date }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Assessment' }

  # ─── Sessions ───────────────────────────────────────
  /sessions/schedule:
    post:
      summary: توليد جدول أسبوعي ذكي
      tags: [Sessions]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [branch_id, week_start]
              properties:
                branch_id:  { type: string, format: uuid }
                week_start: { type: string, format: date }
                force_regenerate: { type: boolean, default: false }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessions:         { type: array, items: { $ref: '#/components/schemas/Session' } }
                  utilization_pct:  { type: number }
                  total_sessions:   { type: integer }
                  solver_status:    { type: string }
                  time_seconds:     { type: number }

  # ─── Transport ──────────────────────────────────────
  /transport/optimize:
    post:
      summary: تحسين مسارات النقل
      tags: [Transport]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [branch_id, date, shift]
              properties:
                branch_id: { type: string, format: uuid }
                date:      { type: string, format: date }
                shift:     { type: string, enum: [morning, evening] }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  routes:             { type: array }
                  total_distance_km:  { type: number }
                  estimated_cost_sar: { type: number }
                  vehicles_used:      { type: integer }

  /transport/track/{vehicle_id}:
    get:
      summary: تتبع مركبة في الوقت الفعلي
      tags: [Transport]
      parameters:
        - name: vehicle_id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  lat:          { type: number }
                  lng:          { type: number }
                  speed_kmh:    { type: number }
                  next_stop:    { type: string }
                  eta_minutes:  { type: integer }
                  delay_minutes:{ type: integer }

  # ─── AI ─────────────────────────────────────────────
  /ai/predict/{beneficiary_id}:
    get:
      summary: تنبؤ تقدم مستفيد
      tags: [AI]
      parameters:
        - name: beneficiary_id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AIprediction' }

  /ai/risk-report/{branch_id}:
    get:
      summary: تقرير المستفيدين في خطر
      tags: [AI]
      parameters:
        - name: branch_id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: risk_level
          in: query
          schema: { type: string, enum: [high, medium, all] }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  high_risk:   { type: array }
                  medium_risk: { type: array }
                  generated_at:{ type: string, format: date-time }

  # ─── Compliance ─────────────────────────────────────
  /compliance/hrsd/monthly-report:
    post:
      summary: توليد وإرسال تقرير HRSD الشهري
      tags: [Compliance]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [branch_id, report_month]
              properties:
                branch_id:    { type: string, format: uuid }
                report_month: { type: string, pattern: "^[0-9]{4}-[0-9]{2}$" }
                dry_run:      { type: boolean, default: false }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:          { type: string, enum: [submitted, incomplete, error] }
                  hrsd_reference:  { type: string }
                  missing_fields:  { type: array, items: { type: string } }
                  submitted_at:    { type: string, format: date-time }

  /compliance/kpi-dashboard/{branch_id}:
    get:
      summary: لوحة KPIs الامتثال
      tags: [Compliance]
      parameters:
        - name: branch_id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: period
          in: query
          schema: { type: string, enum: [weekly, monthly, quarterly] }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  capacity_utilization_pct: { type: number }
                  attendance_rate_pct:      { type: number }
                  therapist_attendance_pct: { type: number }
                  transport_compliance_pct: { type: number }
                  family_satisfaction:      { type: number }
                  hrsd_reports_ontime_pct:  { type: number }
                  alerts:                   { type: array }
```

---

## 3. خطة الاختبارات الشاملة

### 3.1 هرم الاختبارات

```
                    ┌─────────────────┐
                    │   E2E Tests     │  5%  (Cypress/Playwright)
                    │  (سيناريوهات   │
                    │   كاملة)        │
                  ┌─┴─────────────────┴─┐
                  │  Integration Tests   │  25% (Jest + Supertest)
                  │  (تكامل الوحدات     │
                  │   والـ APIs)         │
                ┌─┴─────────────────────┴─┐
                │     Unit Tests           │  70% (Jest + Pytest)
                │  (وحدات منفردة،          │
                │   خوارزميات، حسابات)     │
                └─────────────────────────┘
```

### 3.2 اختبارات الوحدة - Python (Pytest)

```python
# tests/test_scheduling.py
import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from services.ortools_scheduler import AdvancedRehabScheduler


class TestRehabScheduler:
    """اختبارات شاملة لمحرك الجدولة الذكية"""

    @pytest.fixture
    def sample_therapists(self):
        return [
            {'id': f't{i}', 'specialization': 'PT',
             'shift': 'morning', 'max_sessions_day': 8}
            for i in range(1, 6)
        ] + [
            {'id': f't{i}', 'specialization': 'OT',
             'shift': 'morning', 'max_sessions_day': 7}
            for i in range(6, 9)
        ]

    @pytest.fixture
    def sample_beneficiaries(self):
        return [
            {'id': f'b{i}', 'required_specialization': 'PT',
             'weekly_sessions': 3, 'transport_required': True}
            for i in range(1, 21)
        ]

    def test_schedule_generated_within_capacity(
            self, sample_therapists, sample_beneficiaries):
        """التحقق أن الجدول لا يتجاوز الطاقة الاستيعابية"""
        scheduler = AdvancedRehabScheduler(
            therapists=sample_therapists,
            beneficiaries=sample_beneficiaries,
            branch_id='branch_riyadh'
        )
        schedule = scheduler.optimize(
            week_start=date(2026, 3, 1)
        )
        assert schedule is not None
        # لا يتجاوز 8 جلسات/معالج/يوم
        for therapist_id in [t['id'] for t in sample_therapists]:
            for day_sessions in schedule.sessions_by_therapist_day(therapist_id):
                assert len(day_sessions) <= 8

    def test_beneficiary_gets_required_sessions(
            self, sample_therapists, sample_beneficiaries):
        """كل مستفيد يحصل على عدد جلساته المقررة"""
        scheduler = AdvancedRehabScheduler(
            therapists=sample_therapists,
            beneficiaries=sample_beneficiaries,
            branch_id='branch_riyadh'
        )
        schedule = scheduler.optimize(week_start=date(2026, 3, 1))
        for b in sample_beneficiaries:
            actual = schedule.count_sessions_for_beneficiary(b['id'])
            assert actual == b['weekly_sessions'], \
                f"المستفيد {b['id']} يحتاج {b['weekly_sessions']} جلسات، حصل على {actual}"

    def test_specialization_matching(
            self, sample_therapists, sample_beneficiaries):
        """مطابقة التخصص: PT مع PT, OT مع OT"""
        scheduler = AdvancedRehabScheduler(
            therapists=sample_therapists,
            beneficiaries=sample_beneficiaries,
            branch_id='branch_riyadh'
        )
        schedule = scheduler.optimize(week_start=date(2026, 3, 1))
        for session in schedule.sessions:
            therapist = next(t for t in sample_therapists
                             if t['id'] == session.therapist_id)
            beneficiary = next(b for b in sample_beneficiaries
                               if b['id'] == session.beneficiary_id)
            assert therapist['specialization'] == \
                   beneficiary['required_specialization']

    def test_utilization_above_target(
            self, sample_therapists, sample_beneficiaries):
        """الإشغال يجب أن يكون > 85%"""
        scheduler = AdvancedRehabScheduler(
            therapists=sample_therapists,
            beneficiaries=sample_beneficiaries,
            branch_id='branch_riyadh'
        )
        schedule = scheduler.optimize(week_start=date(2026, 3, 1))
        assert schedule.utilization_pct >= 85.0

    @patch('services.ortools_scheduler.cp_model')
    def test_fallback_on_infeasible(self, mock_cp_model, sample_therapists):
        """اختبار الـ Fallback عند استحالة الحل"""
        mock_solver = MagicMock()
        mock_solver.Solve.return_value = 3  # INFEASIBLE
        mock_cp_model.CpSolver.return_value = mock_solver

        scheduler = AdvancedRehabScheduler(
            therapists=sample_therapists,
            beneficiaries=[],  # لا مستفيدين → استحالة
            branch_id='branch_riyadh'
        )
        # يجب أن يرجع جدولاً افتراضياً بدلاً من Exception
        schedule = scheduler.optimize(week_start=date(2026, 3, 1))
        assert schedule is not None
        assert schedule.is_fallback is True


# tests/test_hrsd_compliance.py
class TestHRSDCompliance:
    """اختبارات وحدة الامتثال HRSD"""

    @pytest.fixture
    def complete_report_data(self):
        return {
            'branch_id': 'branch-001',
            'report_period': '2026-03',
            'beneficiaries': {
                'total_active': 450,
                'new_admissions': 23,
                'graduated': 8,
                'by_disability_type': {'physical': 180, 'autism': 120, 'cognitive': 150},
                'by_gender': {'male': 260, 'female': 190},
            },
            'programs': {
                'total_sessions': 2750,
                'attendance_rate': 91.5,
            },
            'staff': {
                'total_therapists': 30,
                'therapist_ratio': 15.0,
                'training_hours': 47,
            }
        }

    def test_complete_report_passes_validation(self, complete_report_data):
        from services.hrsd_reporter import HRSDMonthlyReport
        reporter = HRSDMonthlyReport()
        result = reporter.validate_report(complete_report_data)
        assert result['is_valid'] is True
        assert len(result['missing_fields']) == 0

    def test_missing_beneficiary_data_fails(self):
        from services.hrsd_reporter import HRSDMonthlyReport
        reporter = HRSDMonthlyReport()
        incomplete = {'branch_id': 'branch-001', 'report_period': '2026-03'}
        result = reporter.validate_report(incomplete)
        assert result['is_valid'] is False
        assert 'beneficiaries' in result['missing_fields']

    @patch('services.hrsd_reporter.requests.post')
    def test_submission_records_reference_number(
            self, mock_post, complete_report_data):
        from services.hrsd_reporter import HRSDMonthlyReport
        mock_post.return_value.json.return_value = {
            'reference_number': 'HRSD-2026-03-001-BR001',
            'status': 'accepted'
        }
        mock_post.return_value.raise_for_status = MagicMock()

        reporter = HRSDMonthlyReport()
        result = reporter.submit_to_hrsd_api(complete_report_data)
        assert result['reference_number'].startswith('HRSD-')
```

### 3.3 اختبارات التكامل - Node.js (Jest + Supertest)

```javascript
// backend/__tests__/beneficiary.integration.test.js
const request = require('supertest');
const app = require('../app');
const { createTestToken, seedTestBranch } = require('../test-utils/helpers');

describe('Beneficiary API Integration Tests', () => {
  let authToken;
  let branchId;

  beforeAll(async () => {
    branchId = await seedTestBranch();
    authToken = createTestToken({ role: 'branch_manager', branchId });
  });

  describe('POST /api/v3/beneficiaries', () => {
    it('يجب تسجيل مستفيد جديد بنجاح', async () => {
      const payload = {
        name_ar: 'أحمد محمد السعيد',
        national_id: '1234567890',
        disability_type: 'physical',
        disability_degree: 'moderate',
        birth_date: '2010-05-15',
        gender: 'male',
        branch_id: branchId,
        guardian_name: 'محمد السعيد',
        guardian_phone: '+966501234567'
      };

      const res = await request(app)
        .post('/api/v3/beneficiaries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(201);

      expect(res.body.data).toMatchObject({
        name_ar: payload.name_ar,
        national_id: payload.national_id,
        status: 'pending'
      });
      expect(res.body.data.id).toBeDefined();
    });

    it('يجب رفض الهوية الوطنية المكررة', async () => {
      const payload = {
        name_ar: 'اسم آخر',
        national_id: '1234567890', // نفس الهوية السابقة
        disability_type: 'autism',
        branch_id: branchId
      };

      await request(app)
        .post('/api/v3/beneficiaries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(409);
    });

    it('يجب رفض الطلب بدون توكن', async () => {
      await request(app)
        .post('/api/v3/beneficiaries')
        .send({ name_ar: 'أي اسم' })
        .expect(401);
    });

    it('يجب رفض المعالج الوصول لفرع آخر', async () => {
      const therapistToken = createTestToken({
        role: 'therapist',
        branchId: 'other-branch-id'
      });
      const payload = {
        name_ar: 'اسم',
        national_id: '9999999999',
        disability_type: 'cognitive',
        branch_id: branchId // فرع مختلف
      };

      await request(app)
        .post('/api/v3/beneficiaries')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send(payload)
        .expect(403);
    });
  });

  describe('GET /api/v3/beneficiaries', () => {
    it('يجب إرجاع قائمة مرقّمة', async () => {
      const res = await request(app)
        .get('/api/v3/beneficiaries')
        .query({ branch_id: branchId, page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.page).toBe(1);
    });

    it('يجب الفلترة حسب نوع الإعاقة', async () => {
      const res = await request(app)
        .get('/api/v3/beneficiaries')
        .query({ branch_id: branchId, disability_type: 'physical' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      res.body.data.forEach(b => {
        expect(b.disability_type).toBe('physical');
      });
    });
  });
});
```

### 3.4 اختبارات E2E (Playwright)

```typescript
// e2e/tests/beneficiary-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('تسجيل مستفيد جديد - رحلة كاملة', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://staging.alawael-rehab.sa');
    await page.fill('[data-testid="username"]', 'manager@riyadh.branch');
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD!);
    await page.click('[data-testid="login-btn"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('تسجيل مستفيد جديد - سيناريو كامل', async ({ page }) => {
    // الانتقال لصفحة التسجيل
    await page.click('text=المستفيدون');
    await page.click('text=مستفيد جديد');

    // ملء نموذج التسجيل
    await page.fill('[name="name_ar"]', 'عبدالله فهد النجدي');
    await page.fill('[name="national_id"]', '1098765432');
    await page.selectOption('[name="disability_type"]', 'autism');
    await page.selectOption('[name="disability_degree"]', 'moderate');
    await page.fill('[name="birth_date"]', '2015-08-20');
    await page.selectOption('[name="gender"]', 'male');
    await page.fill('[name="guardian_name"]', 'فهد النجدي');
    await page.fill('[name="guardian_phone"]', '+966507654321');

    // رفع وثيقة التشخيص
    const fileInput = page.locator('[data-testid="medical-doc-upload"]');
    await fileInput.setInputFiles('e2e/fixtures/sample_medical_report.pdf');

    // حفظ
    await page.click('[data-testid="save-beneficiary"]');

    // التحقق من النجاح
    await expect(page.locator('.success-notification')).toContainText('تم تسجيل المستفيد بنجاح');
    await expect(page.locator('[data-testid="beneficiary-status"]')).toHaveText('قيد المراجعة');

    // التحقق من ظهوره في القائمة
    await page.click('text=المستفيدون');
    await expect(page.locator('text=عبدالله فهد النجدي')).toBeVisible();
  });

  test('لا يمكن تسجيل نفس الهوية مرتين', async ({ page }) => {
    // تسجيل أول مرة
    await page.click('text=مستفيد جديد');
    await page.fill('[name="national_id"]', '1111111111');
    await page.fill('[name="name_ar"]', 'مستفيد اختبار');
    await page.selectOption('[name="disability_type"]', 'physical');
    await page.click('[data-testid="save-beneficiary"]');
    await expect(page.locator('.success-notification')).toBeVisible();

    // محاولة تسجيل ثانية بنفس الهوية
    await page.click('text=مستفيد جديد');
    await page.fill('[name="national_id"]', '1111111111');
    await page.fill('[name="name_ar"]', 'اسم مختلف');
    await page.selectOption('[name="disability_type"]', 'cognitive');
    await page.click('[data-testid="save-beneficiary"]');
    await expect(page.locator('.error-message')).toContainText('رقم الهوية مسجل مسبقاً');
  });
});
```

### 3.5 معايير القبول والتغطية

```yaml
# jest.config.js / pytest.ini
coverage_thresholds:
  unit_tests:
    lines:      80%
    branches:   75%
    functions:  85%
  critical_modules:  # وحدات حرجة: تغطية أعلى
    - rehab_scheduling: lines: 95%
    - hrsd_compliance:  lines: 95%
    - zatca_client:     lines: 90%
    - ai_predictor:     lines: 85%

performance_benchmarks:
  api_response_p95:    200ms
  schedule_generation: 60s
  transport_optimize:  30s
  ai_prediction:       200ms

load_testing:  # k6 / Locust
  concurrent_users:  500
  ramp_up_time:      60s
  target_rps:        1000
  error_rate_max:    0.1%
```

---

## 4. قائمة النشر التفصيلية

### 4.1 مراحل النشر

```
╔══════════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT CHECKLIST v3.0                        ║
╠══════════════════════════════════════════════════════════════════════╣
║  المرحلة 0: ما قبل النشر (Pre-Deployment)                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  □ مراجعة الكود من 2 مطورين (Code Review Approved)                 ║
║  □ اجتياز جميع unit tests (>80% coverage)                          ║
║  □ اجتياز integration tests                                         ║
║  □ مراجعة أمنية (SAST scan - SonarQube)                            ║
║  □ مراجعة OWASP Top 10                                             ║
║  □ تحديث CHANGELOG.md                                              ║
║  □ إنشاء Git Tag مع رقم الإصدار                                    ║
║  □ إشعار فريق الدعم (24 ساعة مسبقاً)                              ║
╠══════════════════════════════════════════════════════════════════════╣
║  المرحلة 1: بيئة Staging                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  □ بناء Docker Images وتوسيمها (tag)                                ║
║    $ docker build -t alawael-rehab/backend:v3.1.0 ./backend        ║
║    $ docker build -t alawael-rehab/ai-engine:v3.1.0 ./ai           ║
║  □ دفع Images لـ ECR (AWS Container Registry)                      ║
║    $ aws ecr get-login-password | docker login --username AWS ...   ║
║    $ docker push $ECR_URI/alawael-rehab/backend:v3.1.0             ║
║  □ تشغيل في Staging                                                 ║
║    $ kubectl set image deployment/backend backend=...:v3.1.0 -n stg║
║  □ تشغيل Smoke Tests على Staging                                    ║
║  □ اختبار تكامل HRSD API (sandbox)                                 ║
║  □ اختبار ZATCA sandbox                                             ║
║  □ اختبار Absher sandbox                                            ║
║  □ مراجعة Grafana - لا أخطاء جديدة                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  المرحلة 2: النشر على Production (Blue-Green)                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  □ تفعيل Maintenance Window (الجمعة 12م - 2م)                      ║
║  □ إيقاف Celery Beat مؤقتاً                                        ║
║  □ نسخ احتياطي للقاعدة (RDS Snapshot)                              ║
║    $ aws rds create-db-snapshot --db-instance-id rehab-prod-db     ║
║  □ تشغيل database migrations على نسخة Blue جديدة                   ║
║    $ kubectl exec -it odoo-pod -- odoo -d rehab_erp -u all         ║
║  □ تبديل Traffic لـ Green (الجديد)                                  ║
║    $ kubectl patch svc rehab-backend -p '{"spec":{"selector":...}}'║
║  □ مراقبة 15 دقيقة - Grafana + Sentry                              ║
║  □ التحقق من API health checks                                      ║
║    $ curl https://api.alawael-rehab.sa/health                      ║
║  □ إعادة تشغيل Celery Beat                                         ║
║  □ إشعار المستخدمين بانتهاء الصيانة                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  المرحلة 3: ما بعد النشر (Post-Deployment)                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  □ مراقبة Error Rate (< 0.1%) لمدة ساعة                            ║
║  □ مراقبة Response Times (P95 < 200ms)                             ║
║  □ التحقق من تقارير Celery (المهام الدورية)                         ║
║  □ اختبار وظيفي سريع من مستخدم فعلي                                ║
║  □ تحديث صفحة Status Page                                           ║
║  □ توثيق الـ Deployment في سجل التغييرات                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  في حالة الطوارئ: Rollback                                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  □ تبديل Traffic فوراً للإصدار القديم (Blue)                        ║
║    $ kubectl rollout undo deployment/backend -n production         ║
║  □ Restore قاعدة البيانات إذا لزم                                   ║
║    $ aws rds restore-db-instance-from-db-snapshot ...              ║
║  □ إشعار المطورين + المدير التقني فوراً                             ║
║  □ تحليل Root Cause في 24 ساعة                                     ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 4.2 متغيرات البيئة الإنتاجية

```bash
# .env.production (مشفر في AWS Secrets Manager)

# Database
DATABASE_URL=postgresql://rehab_user:${DB_PASS}@rehab-prod.cluster.rds.amazonaws.com:5432/rehab_erp
REDIS_URL=redis://:${REDIS_PASS}@rehab-redis.cache.amazonaws.com:6379/0

# Security
JWT_SECRET=${JWT_SECRET_256BIT}
JWT_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800
ENCRYPTION_KEY=${AES_256_KEY}

# External APIs
GOOGLE_MAPS_API_KEY=${MAPS_KEY}
OPENAI_API_KEY=${OPENAI_KEY}
HRSD_API_URL=https://api.hrsd.gov.sa/rehab-centers
HRSD_API_TOKEN=${HRSD_TOKEN}
ZATCA_API_URL=https://gw.zatca.gov.sa
ZATCA_CERT=${ZATCA_CERT_BASE64}
ABSHER_API_URL=https://api.absher.sa/v2
ABSHER_CLIENT_ID=${ABSHER_CLIENT}
ABSHER_SECRET=${ABSHER_SECRET}
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_TOKEN=${WHATSAPP_TOKEN}

# AWS
AWS_REGION=me-south-1
S3_BUCKET=alawael-rehab-documents
SES_SENDER=noreply@alawael-rehab.sa
SNS_ALERTS_ARN=arn:aws:sns:me-south-1:${ACCOUNT}:rehab-alerts

# Monitoring
SENTRY_DSN=https://${SENTRY_KEY}@sentry.io/${PROJECT}
GRAFANA_API_KEY=${GRAFANA_KEY}

# Feature Flags
ENABLE_AI_PREDICTIONS=true
ENABLE_CHATBOT=true
ENABLE_GPS_TRACKING=true
ENABLE_ZATCA_LIVE=true
MAINTENANCE_MODE=false
```

---

## 5. تكامل الأنظمة الحكومية

### 5.1 تكامل HRSD API

```python
# services/hrsd_api_client.py
"""
عميل API وزارة الموارد البشرية والتنمية الاجتماعية
نقطة النهاية: https://api.hrsd.gov.sa/rehab-centers
"""
import httpx
import asyncio
from typing import Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class HRSDApiClient:
    BASE_URL = "https://api.hrsd.gov.sa/rehab-centers/v2"
    TOKEN_URL = "https://auth.hrsd.gov.sa/oauth/token"

    def __init__(self, client_id: str, client_secret: str, center_id: str):
        self.client_id     = client_id
        self.client_secret = client_secret
        self.center_id     = center_id
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _get_access_token(self) -> str:
        """الحصول على OAuth2 Token أو تجديده"""
        if self._access_token and datetime.now() < self._token_expiry:
            return self._access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    'grant_type':    'client_credentials',
                    'client_id':     self.client_id,
                    'client_secret': self.client_secret,
                    'scope':         'rehab_center:read rehab_center:write',
                }
            )
            response.raise_for_status()
            token_data = response.json()

        self._access_token = token_data['access_token']
        self._token_expiry = datetime.now() + timedelta(
            seconds=token_data['expires_in'] - 60
        )
        return self._access_token

    async def submit_monthly_report(self, report: dict) -> dict:
        """إرسال التقرير الشهري"""
        token = await self._get_access_token()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/monthly-reports",
                json=report,
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Center-ID':   self.center_id,
                    'X-Request-ID':  self._generate_request_id(),
                }
            )
            if response.status_code == 422:
                # تحليل أخطاء التحقق
                errors = response.json().get('errors', [])
                logger.error(f"HRSD validation errors: {errors}")
                raise HRSDValidationError(errors)
            response.raise_for_status()
            return response.json()

    async def get_center_status(self) -> dict:
        """استعلام عن حالة المركز في سجلات HRSD"""
        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/centers/{self.center_id}/status",
                headers={'Authorization': f'Bearer {token}'}
            )
            response.raise_for_status()
            return response.json()

    async def sync_beneficiary(self, beneficiary_data: dict) -> dict:
        """مزامنة بيانات مستفيد مع HRSD"""
        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.BASE_URL}/beneficiaries/{beneficiary_data['hrsd_registration_no']}",
                json=self._map_to_hrsd_format(beneficiary_data),
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Center-ID':   self.center_id,
                }
            )
            response.raise_for_status()
            return response.json()

    def _map_to_hrsd_format(self, beneficiary: dict) -> dict:
        """تحويل بيانات النظام إلى صيغة HRSD"""
        return {
            'nationalId':       beneficiary['national_id'],
            'disabilityType':   self._map_disability_type(beneficiary['disability_type']),
            'disabilityDegree': beneficiary['disability_degree'],
            'centerCode':       self.center_id,
            'programTypes':     beneficiary.get('program_types', []),
            'enrollmentDate':   beneficiary['admission_date'],
            'status':           self._map_status(beneficiary['status']),
        }

    @staticmethod
    def _map_disability_type(internal_type: str) -> str:
        mapping = {
            'physical':  'PHYSICAL_MOTOR',
            'sensory':   'SENSORY',
            'cognitive': 'INTELLECTUAL',
            'autism':    'AUTISM_SPECTRUM',
            'speech':    'COMMUNICATION',
            'multiple':  'MULTIPLE',
        }
        return mapping.get(internal_type, 'OTHER')

    @staticmethod
    def _generate_request_id() -> str:
        import uuid
        return str(uuid.uuid4())


class HRSDValidationError(Exception):
    def __init__(self, errors: list):
        self.errors = errors
        super().__init__(f"HRSD validation failed: {errors}")
```

### 5.2 تكامل ZATCA Phase 2

```python
# services/zatca_client.py
"""
تكامل ZATCA - الفوترة الإلكترونية المرحلة الثانية
معيار UBL 2.1 + XML Digital Signature
"""
import base64
import hashlib
import xml.etree.ElementTree as ET
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.x509 import load_pem_x509_certificate
import httpx
from datetime import datetime


class ZATCAClient:
    PROD_URL     = "https://gw.zatca.gov.sa/e-invoicing/developer-portal"
    SANDBOX_URL  = "https://gw.zatca.gov.sa/e-invoicing/developer-portal"

    def __init__(self, cert_pem: str, private_key_pem: str,
                 is_production: bool = False):
        self.cert        = load_pem_x509_certificate(cert_pem.encode())
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode(), password=None
        )
        self.base_url = self.PROD_URL if is_production else self.SANDBOX_URL

    def generate_invoice(self, invoice_data: dict) -> dict:
        """توليد فاتورة إلكترونية معتمدة ZATCA"""

        # 1. بناء XML بصيغة UBL 2.1
        xml_invoice = self._build_ubl_xml(invoice_data)

        # 2. حساب Hash للفاتورة
        invoice_hash = self._calculate_hash(xml_invoice)

        # 3. التوقيع الرقمي
        signature = self._sign_invoice(invoice_hash)

        # 4. QR Code (TLV encoding)
        qr_code = self._generate_qr(invoice_data, invoice_hash, signature)

        # 5. تضمين التوقيع في XML
        signed_xml = self._embed_signature(xml_invoice, signature, qr_code)

        return {
            'xml_invoice':  base64.b64encode(signed_xml.encode()).decode(),
            'invoice_hash': invoice_hash,
            'qr_code':      qr_code,
        }

    def report_invoice(self, signed_invoice_b64: str,
                       invoice_hash: str) -> dict:
        """إرسال الفاتورة لـ ZATCA (للفواتير B2C - Reporting)"""
        payload = {
            'invoiceBase64': signed_invoice_b64,
            'invoiceHash':   invoice_hash,
            'uuid':          self._generate_uuid(),
        }
        response = httpx.post(
            f"{self.base_url}/invoices/reporting/single",
            json=payload,
            headers=self._get_auth_headers(),
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    def clear_invoice(self, signed_invoice_b64: str,
                      invoice_hash: str) -> dict:
        """إرسال الفاتورة لـ ZATCA للمقاصة (B2B - Clearance)"""
        payload = {
            'invoiceBase64': signed_invoice_b64,
            'invoiceHash':   invoice_hash,
            'uuid':          self._generate_uuid(),
        }
        response = httpx.post(
            f"{self.base_url}/invoices/clearance/single",
            json=payload,
            headers=self._get_auth_headers(),
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    def _build_ubl_xml(self, data: dict) -> str:
        """بناء XML بمعيار UBL 2.1 المطلوب من ZATCA"""
        template = f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>{data['invoice_number']}</cbc:ID>
  <cbc:IssueDate>{data['issue_date']}</cbc:IssueDate>
  <cbc:IssueTime>{data['issue_time']}Z</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0200000">{data['invoice_type']}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>{data['supplier_name']}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{data['supplier_vat']}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">{data['vat_amount']:.2f}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="SAR">{data['subtotal']:.2f}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">{data['total_with_vat']:.2f}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">{data['total_with_vat']:.2f}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>"""
        return template

    def _calculate_hash(self, xml: str) -> str:
        digest = hashlib.sha256(xml.encode('utf-8')).digest()
        return base64.b64encode(digest).decode()

    def _sign_invoice(self, invoice_hash: str) -> str:
        signature = self.private_key.sign(
            invoice_hash.encode(),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode()

    def _get_auth_headers(self) -> dict:
        cert_b64 = base64.b64encode(
            self.cert.public_bytes(serialization.Encoding.PEM)
        ).decode()
        return {
            'accept':       'application/json',
            'Content-Type': 'application/json',
            'accept-version': 'V2',
            'Authorization': f'Basic {cert_b64}',
        }

    @staticmethod
    def _generate_uuid() -> str:
        import uuid
        return str(uuid.uuid4())
```

### 5.3 تكامل Absher (التحقق من الهوية)

```python
# services/absher_client.py
"""
تكامل Absher - التحقق من الهوية الوطنية
"""
import httpx
import hashlib
from datetime import datetime, timezone


class AbsherClient:
    BASE_URL = "https://api.absher.sa/v2"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id     = client_id
        self.client_secret = client_secret

    def verify_national_id(self, national_id: str,
                           date_of_birth_hijri: str) -> dict:
        """
        التحقق من صحة الهوية الوطنية
        Returns: {'valid': bool, 'name_ar': str, 'gender': str}
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        signature = self._generate_signature(national_id, timestamp)

        response = httpx.post(
            f"{self.BASE_URL}/identity/verify",
            json={
                'nationalId':      national_id,
                'dateOfBirthHijri':date_of_birth_hijri,
                'timestamp':       timestamp,
                'signature':       signature,
            },
            headers={
                'X-Client-ID':     self.client_id,
                'Content-Type':    'application/json',
            },
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            return {
                'valid':   True,
                'name_ar': data.get('fullNameArabic', ''),
                'gender':  'male' if data.get('gender') == 'M' else 'female',
                'status':  data.get('idStatus', 'ACTIVE'),
            }
        elif response.status_code == 404:
            return {'valid': False, 'reason': 'national_id_not_found'}
        else:
            response.raise_for_status()

    def check_iqama_status(self, iqama_number: str) -> dict:
        """التحقق من صحة الإقامة للمقيمين"""
        response = httpx.get(
            f"{self.BASE_URL}/residency/{iqama_number}/status",
            headers={'X-Client-ID': self.client_id},
            timeout=10
        )
        response.raise_for_status()
        return response.json()

    def _generate_signature(self, national_id: str, timestamp: str) -> str:
        message = f"{self.client_id}{national_id}{timestamp}"
        return hashlib.sha256(
            f"{message}{self.client_secret}".encode()
        ).hexdigest()
```

---

## 6. خطة الاسترداد من الكوارث

### 6.1 مستويات الكوارث وأهداف الاسترداد

| المستوى | السيناريو | RTO (وقت الاسترداد) | RPO (نقطة الاسترداد) | الإجراء |
|---------|----------|---------------------|----------------------|---------|
| **P1 - حرج** | توقف قاعدة البيانات الرئيسية | < 15 دقيقة | < 5 دقائق | Automatic Failover RDS Multi-AZ |
| **P1 - حرج** | اختراق أمني | < 30 دقيقة | N/A | Incident Response Plan |
| **P2 - عالٍ** | تعطل خادم التطبيق | < 30 دقيقة | < 15 دقيقة | Kubernetes Auto-restart + HPA |
| **P2 - عالٍ** | فشل منطقة AWS كاملة | < 4 ساعات | < 1 ساعة | Cross-region DR (Jeddah) |
| **P3 - متوسط** | فشل خدمة AI/Chatbot | < 2 ساعة | N/A | Graceful Degradation |
| **P4 - منخفض** | بطء الأداء | < 4 ساعات | N/A | Auto-scaling + Cache |

### 6.2 بنية الـ DR

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRIMARY REGION: me-south-1 (Riyadh)           │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │   AZ-1 (Active)     │    │   AZ-2 (Standby)                │  │
│  │  EKS Node Group     │    │  RDS Read Replica               │  │
│  │  RDS Primary        │    │  Redis Replica                  │  │
│  │  ElastiCache Primary│    └─────────────────────────────────┘  │
│  └─────────────────────┘                                         │
└──────────────┬───────────────────────────────────────────────────┘
               │ Async Replication (lag < 5min)
┌──────────────▼───────────────────────────────────────────────────┐
│                    DR REGION: eu-south-1 (Jeddah/backup)         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  RDS Replica (Read + Standby for failover)                  │ │
│  │  S3 Cross-Region Replication (Documents)                    │ │
│  │  EKS Cluster (Warm Standby - scaled to 25%)                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 إجراءات النسخ الاحتياطي

```bash
#!/bin/bash
# scripts/backup_manager.sh - يعمل يومياً الساعة 2 فجراً

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="s3://alawael-rehab-backups"
RETENTION_DAYS=90

# 1. نسخ احتياطي لـ PostgreSQL
echo "=== Starting PostgreSQL Backup ==="
PGPASSWORD=$DB_PASS pg_dump \
  -h $DB_HOST -U rehab_user -d rehab_erp \
  --format=custom \
  --compress=9 \
  --file="/tmp/rehab_erp_${TIMESTAMP}.dump"

# رفع لـ S3 مع تشفير SSE-KMS
aws s3 cp "/tmp/rehab_erp_${TIMESTAMP}.dump" \
  "${S3_BUCKET}/postgresql/rehab_erp_${TIMESTAMP}.dump" \
  --sse aws:kms \
  --sse-kms-key-id $KMS_KEY_ID

# 2. نسخ احتياطي لـ MongoDB (Logs)
echo "=== Starting MongoDB Backup ==="
mongodump \
  --uri="$MONGO_URI" \
  --out="/tmp/mongodb_${TIMESTAMP}" \
  --gzip

tar -czf "/tmp/mongodb_${TIMESTAMP}.tar.gz" "/tmp/mongodb_${TIMESTAMP}"
aws s3 cp "/tmp/mongodb_${TIMESTAMP}.tar.gz" \
  "${S3_BUCKET}/mongodb/mongodb_${TIMESTAMP}.tar.gz" \
  --sse aws:kms --sse-kms-key-id $KMS_KEY_ID

# 3. نسخ ملفات المستفيدين (S3 Sync)
echo "=== Syncing Documents ==="
aws s3 sync \
  "s3://alawael-rehab-documents" \
  "s3://alawael-rehab-backups/documents/${TIMESTAMP}/" \
  --sse aws:kms

# 4. حذف النسخ القديمة (> 90 يوماً)
echo "=== Cleaning Old Backups ==="
aws s3 ls "${S3_BUCKET}/postgresql/" | \
  awk '{print $4}' | \
  while read file; do
    file_date=$(echo $file | grep -oP '\d{8}')
    if [[ $(date -d "$file_date" +%s) -lt $(date -d "-${RETENTION_DAYS} days" +%s) ]]; then
      aws s3 rm "${S3_BUCKET}/postgresql/$file"
    fi
  done

# 5. إشعار بنتيجة النسخ الاحتياطي
if [ $? -eq 0 ]; then
  aws sns publish \
    --topic-arn $SNS_ALERTS_ARN \
    --message "✅ Backup completed: ${TIMESTAMP} | Size: $(du -sh /tmp/rehab_erp_${TIMESTAMP}.dump | cut -f1)"
else
  aws sns publish \
    --topic-arn $SNS_ALERTS_ARN \
    --message "🚨 BACKUP FAILED: ${TIMESTAMP} - Manual intervention required!"
fi

echo "=== Backup Complete: $TIMESTAMP ==="
```

---

## 7. دليل المستخدم

### 7.1 دليل المعالج - تسجيل جلسة علاجية

```
╔══════════════════════════════════════════════════════╗
║         دليل المعالج - تسجيل الجلسة                  ║
╠══════════════════════════════════════════════════════╣
║  1. تسجيل الدخول                                     ║
║     • افتح تطبيق الجوال أو الموقع                    ║
║     • أدخل بريدك الإلكتروني + كلمة المرور             ║
║     • أكّد الـ OTP المرسل لجوالك                     ║
║                                                      ║
║  2. الجدول اليومي                                    ║
║     • ستظهر جلساتك للشفت الحالي تلقائياً              ║
║     • مرتّبة حسب الوقت مع تفاصيل المستفيد            ║
║                                                      ║
║  3. بدء الجلسة                                       ║
║     • اضغط "بدء الجلسة" عند الحضور                  ║
║     • سيُسجَّل وقت البدء تلقائياً                    ║
║                                                      ║
║  4. تسجيل الحضور                                     ║
║     • حضر ✅ → اضغط "حاضر"                           ║
║     • غائب ❌ → اختر السبب (مرض/نقل/غير معذور)      ║
║                                                      ║
║  5. ملاحظات الجلسة (إلزامي)                          ║
║     • سجّل ملاحظاتك السريرية                         ║
║     • تقييم الأداء (1-5 نجوم)                        ║
║     • الأهداف المحققة في هذه الجلسة                  ║
║     • أي مخاوف أو تنبيهات                           ║
║                                                      ║
║  6. إنهاء الجلسة                                     ║
║     • اضغط "إنهاء الجلسة"                            ║
║     • تأكيد الحفظ                                    ║
║                                                      ║
║  ⚠️ تنبيه: يجب تسجيل الجلسة خلال 2 ساعة من انتهائها  ║
╚══════════════════════════════════════════════════════╝
```

### 7.2 دليل ولي الأمر - تطبيق الجوال

```
دليل تطبيق الأوائل - لأولياء الأمور
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 تحميل التطبيق:
   iOS:     App Store → "الأوائل للتأهيل"
   Android: Google Play → "الأوائل للتأهيل"

🔑 أول مرة:
   1. أدخل رقم الجوال المسجل في المركز
   2. استلم كود التفعيل عبر SMS
   3. أنشئ كلمة مرور (8 أحرف على الأقل)

🏠 الشاشة الرئيسية تُظهر:
   ┌─────────────────────────────────────┐
   │ 👤 اسم المستفيد + صورته             │
   │ 📅 موعد الجلسة القادمة              │
   │    الثلاثاء 12 شعبان - 9:00 صباحاً │
   │ 🚐 حالة النقل: السائق في الطريق    │
   │    الوصول خلال: 8 دقائق            │
   │ 📊 آخر تقرير تقدم: ارتفع بـ 12%   │
   └─────────────────────────────────────┘

🗓 إدارة المواعيد:
   • عرض جدول الأسبوع الكامل
   • طلب تغيير موعد (قبل 24 ساعة)
   • تأكيد الحضور / الغياب

🚐 تتبع النقل:
   • خريطة حية لموقع المركبة
   • وقت الوصول المتوقع (ETA)
   • إشعار عند اقتراب المركبة (5 دقائق)
   • رقم سائق للتواصل المباشر

📊 متابعة التقدم:
   • رسوم بيانية لنتائج المقاييس (PEDI/GMFM)
   • تقارير المعالج الشهرية
   • الأهداف والإنجازات

🤖 المساعد الذكي (Chatbot):
   • متاح 24/7 باللغة العربية
   • أسئلة عن البرنامج والجلسات
   • نصائح للتدريب المنزلي
   • إحالة فورية للمعالج عند الحاجة

📞 التواصل:
   • رسائل مباشرة للمعالج
   • طلب استشارة نفسية اجتماعية
   • تقديم شكاوى ومقترحات
```

---

## 8. النموذج المالي التفصيلي

### 8.1 CAPEX التفصيلي - 5 فروع

| البند | فرع 1 | فرع 2 | فرع 3 | فرع 4 | فرع 5 | الإجمالي |
|-------|--------|--------|--------|--------|--------|---------|
| تجهيزات طبية وتأهيلية | 450,000 | 380,000 | 350,000 | 320,000 | 300,000 | 1,800,000 |
| مركبات مجهزة (10/فرع) | 350,000 | 350,000 | 320,000 | 280,000 | 280,000 | 1,580,000 |
| تجهيزات بنية IT | 80,000 | 60,000 | 55,000 | 50,000 | 45,000 | 290,000 |
| إعداد ERP (مرة واحدة) | 85,000 | 20,000 | 15,000 | 10,000 | 10,000 | 140,000 |
| تراخيص واعتمادات | 25,000 | 25,000 | 25,000 | 25,000 | 25,000 | 125,000 |
| تدريب الكوادر | 40,000 | 30,000 | 28,000 | 25,000 | 22,000 | 145,000 |
| **إجمالي CAPEX** | **1,030,000** | **865,000** | **793,000** | **710,000** | **682,000** | **4,080,000** |

### 8.2 OPEX الشهري - بعد الاستقرار (شهر 6+)

| البند | فرع 1 (ريال) | فرع 2 | فرع 3 | فرع 4 | فرع 5 | إجمالي شبكة |
|-------|-------------|--------|--------|--------|--------|-------------|
| رواتب (30 معالج + إداريون) | 412,500 | 385,000 | 365,000 | 340,000 | 320,000 | 1,822,500 |
| إيجار + مرافق | 112,500 | 95,000 | 85,000 | 75,000 | 70,000 | 437,500 |
| معدات + صيانة | 75,000 | 68,000 | 62,000 | 58,000 | 55,000 | 318,000 |
| نقل (مركبات + سائقون) | 60,000 | 55,000 | 50,000 | 45,000 | 42,000 | 252,000 |
| IT + ERP (سحابة) | 37,500 | 28,000 | 25,000 | 22,000 | 20,000 | 132,500 |
| تدريب متواصل | 30,000 | 25,000 | 22,000 | 20,000 | 18,000 | 115,000 |
| متنوع + احتياطي | 22,500 | 19,000 | 16,000 | 15,000 | 15,000 | 87,500 |
| **إجمالي OPEX/شهر** | **750,000** | **675,000** | **625,000** | **575,000** | **540,000** | **3,165,000** |

### 8.3 إيرادات الشبكة المتوقعة

```
نموذج الإيرادات - شبكة 5 فروع (بعد الاستقرار الكامل - شهر 12)
═══════════════════════════════════════════════════════════════════

  الفرع      │ مستفيدون │ إيراد شهري   │ إيراد سنوي
  ────────────┼──────────┼──────────────┼───────────────
  الرياض     │   2,000  │  1,500,000   │  18,000,000
  جدة        │   1,500  │  1,125,000   │  13,500,000
  الدمام     │   1,000  │    750,000   │   9,000,000
  مكة        │     800  │    600,000   │   7,200,000
  المدينة    │     700  │    525,000   │   6,300,000
  ────────────┼──────────┼──────────────┼───────────────
  الشبكة     │   6,000  │  4,500,000   │  54,000,000

  OPEX سنوي للشبكة:     38,000,000  ريال
  صافي الربح السنوي:    16,000,000  ريال
  هامش الربح الصافي:         29.6%

  ROI على إجمالي الاستثمار (CAPEX):
  CAPEX الكلي = 4,080,000 ريال
  ROI سنة 1:  (16,000,000 - 4,080,000) / 4,080,000 = 292%
  ✅ استرداد الاستثمار خلال 3 أشهر من اكتمال التشغيل
```

---

## 9. SLA - اتفاقية مستوى الخدمة

### 9.1 مؤشرات الأداء المضمونة

```
╔══════════════════════════════════════════════════════════════════╗
║         SERVICE LEVEL AGREEMENT - اتفاقية مستوى الخدمة          ║
║         ALAWAEL Rehab ERP v3.0 - 1447هـ                         ║
╠══════════════════════════════════════════════════════════════════╣
║  التوفر (Availability)                                           ║
║  ├── نظام ERP (Odoo):          99.9% شهرياً (< 44 دقيقة توقف)  ║
║  ├── AI Engine:                99.5% شهرياً (< 3.6 ساعة توقف)  ║
║  ├── GPS Tracking:             99.5% شهرياً                     ║
║  └── Chatbot الأسر:            99.0% شهرياً                     ║
╠══════════════════════════════════════════════════════════════════╣
║  الأداء (Performance)                                            ║
║  ├── وقت استجابة API (P50):    < 100ms                          ║
║  ├── وقت استجابة API (P95):    < 200ms                          ║
║  ├── وقت استجابة API (P99):    < 500ms                          ║
║  ├── توليد جدول أسبوعي:        < 60 ثانية                       ║
║  ├── تحسين مسارات النقل:       < 30 ثانية                       ║
║  ├── تنبؤ AI للمستفيد:         < 200ms                          ║
║  └── تحميل لوحة KPI:           < 2 ثانية                        ║
╠══════════════════════════════════════════════════════════════════╣
║  الدعم (Support)                                                 ║
║  ├── P1 - حرج (نظام متوقف):    استجابة < 15 دقيقة              ║
║  ├── P2 - عالٍ (وظيفة معطلة): استجابة < 2 ساعة                ║
║  ├── P3 - متوسط (بطء/خلل):   استجابة < 8 ساعات               ║
║  └── P4 - منخفض (استفسار):   استجابة < 24 ساعة               ║
╠══════════════════════════════════════════════════════════════════╣
║  الأمان (Security)                                               ║
║  ├── تشفير البيانات at-rest:   AES-256                          ║
║  ├── تشفير البيانات in-transit: TLS 1.3                         ║
║  ├── نسخ احتياطي يومي:         RPO < 5 دقائق                    ║
║  ├── استرداد الكوارث:          RTO < 15 دقيقة (P1)             ║
║  └── فحص أمني:                 ربع سنوي (Penetration Test)      ║
╠══════════════════════════════════════════════════════════════════╣
║  التعويضات (Penalties)                                           ║
║  ├── توفر < 99.9% و > 99.0%:  خصم 10% من الاشتراك الشهري      ║
║  ├── توفر < 99.0% و > 95.0%:  خصم 25% من الاشتراك الشهري      ║
║  └── توفر < 95.0%:            خصم 50% + حق الإنهاء             ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 10. خارطة الطريق التقنية 2026-2028

```mermaid
gantt
    title خارطة الطريق التقنية - ALAWAEL Rehab ERP
    dateFormat  YYYY-MM
    axisFormat  %Y-%m

    section المرحلة الأولى - الأساس
    تثبيت Odoo + الوحدات الأساسية    :done,    p1a, 2026-01, 2026-03
    تكامل HRSD + ZATCA                :done,    p1b, 2026-02, 2026-04
    تطبيق الجوال للمعالجين            :active,  p1c, 2026-03, 2026-05
    نشر فرع الرياض التجريبي           :active,  p1d, 2026-04, 2026-06

    section المرحلة الثانية - التوسع
    تفعيل AI Engine (LSTM)            :         p2a, 2026-05, 2026-07
    Chatbot الأسر (GPT-4 RAG)         :         p2b, 2026-06, 2026-08
    OR-Tools للنقل + GPS              :         p2c, 2026-06, 2026-08
    نشر فروع جدة والدمام              :         p2d, 2026-07, 2026-09

    section المرحلة الثالثة - التعمق
    نشر فروع مكة والمدينة             :         p3a, 2026-09, 2026-11
    لوحة HQ المركزية                  :         p3b, 2026-10, 2026-12
    Computer Vision للجلسات           :         p3c, 2026-11, 2027-02
    تكامل التأمين الصحي               :         p3d, 2026-12, 2027-03

    section المرحلة الرابعة - التطور
    AraBERT NLP للتقارير السريرية     :         p4a, 2027-01, 2027-04
    منصة e-Learning للمعالجين         :         p4b, 2027-02, 2027-05
    Robot-Assisted Therapy Integration:         p4c, 2027-04, 2027-08
    تصدير النظام لمراكز خليجية        :         p4d, 2027-06, 2027-12

    section المرحلة الخامسة - الابتكار
    Digital Twin للمراكز              :         p5a, 2027-09, 2028-03
    Brain-Computer Interface البحث    :         p5b, 2028-01, 2028-06
    منصة SaaS للمراكز الخارجية        :         p5c, 2028-03, 2028-12
```

### 10.1 التقنيات القادمة (Technology Radar)

| التقنية | الحالة | الأفق الزمني | الأثر المتوقع |
|--------|--------|--------------|--------------|
| **Computer Vision للحركة** | تقييم | Q1 2027 | تتبع تقدم GMFM تلقائياً بالكاميرا |
| **Large Language Models محلي** | بحث | Q2 2027 | AraBERT Fine-tuned للملاحظات السريرية |
| **IoT أجهزة استشعار** | بحث | Q3 2027 | مراقبة المستفيدين في الجلسة |
| **Federated Learning** | مفهوم | Q1 2028 | تحسين النماذج بخصوصية عبر الفروع |
| **Digital Twin** | مفهوم | Q2 2028 | محاكاة عمليات المركز كاملاً |
| **Blockchain للسجلات** | بحث | Q4 2028 | ملف طبي لا يمكن تغييره |

---

## خلاصة دليل التنفيذ

> هذا الدليل يُكمل وثيقتَي `REHAB_CENTER_ERP_SYSTEM.md` و`REHAB_ERP_ENTERPRISE_v3.md`
> ويوفر الأدوات العملية التفصيلية للفريق التقني لبناء ونشر وصيانة نظام ERP الأوائل.
>
> **ملخص الضمانات:**
> - ✅ امتثال HRSD 100% مع API تلقائي
> - ✅ ZATCA Phase 2 مدمج مع توقيع رقمي
> - ✅ Absher للتحقق من الهويات
> - ✅ SLA 99.9% uptime مع DR plan
> - ✅ اختبارات شاملة (Unit + Integration + E2E)
> - ✅ نموذج مالي محدث لـ 5 فروع
> - ✅ خارطة طريق تقنية 2026-2028

---

*وُثِّق بواسطة: ALAWAEL Technology Team | الإصدار 1.0 | شعبان 1447هـ / مارس 2026م*
