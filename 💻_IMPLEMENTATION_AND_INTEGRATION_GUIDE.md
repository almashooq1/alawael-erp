# 💻 دليل التطبيق البرمجي والتكامل

# Implementation & Integration Guide - Backend & Frontend

**الإصدار:** 3.0  
**التاريخ:** 14 يناير 2026  
**الحالة:** جاهز للتطوير الفوري

---

## 🎯 نظرة عامة على التطبيق

### الهيكل المعماري

```
Backend (Flask/SQLAlchemy)
├── Models
│   ├── assessments/ (المقاييس الجديدة)
│   ├── programs/ (البرامج الجديدة)
│   ├── evaluations/ (التقييمات)
│   └── reports/ (التقارير)
├── Services
│   ├── assessment_services.py
│   ├── program_services.py
│   ├── progress_tracking.py
│   └── report_generation.py
├── APIs
│   ├── assessment_routes.py
│   ├── program_routes.py
│   └── report_routes.py
└── Utils
    ├── scoring_algorithms.py
    ├── data_validation.py
    └── normalization_tables.py

Frontend (React)
├── Components
│   ├── AssessmentAdmin/
│   ├── ProgramManagement/
│   ├── ProgressDashboard/
│   └── ReportGeneration/
├── Services
│   ├── api.service.ts
│   └── data.service.ts
└── Pages
    ├── AssessmentPage.jsx
    ├── ProgramPage.jsx
    └── ReportPage.jsx
```

---

## 🔧 ملفات البيانات والنماذج الجديدة

### 1. نموذج المقاييس الجديدة

**الملف:** `backend/models/new_assessments.py`

```python
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات للمقاييس الجديدة
New Assessment Models for Database
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, JSON, Enum, Text
)
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# ==========================================
# مقاييس التقييم الجديدة
# ==========================================

class PediCatAssessment(Base):
    """نموذج PEDI-CAT للتقييم الشامل للأطفال"""
    __tablename__ = 'pedi_cat_assessments'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))

    # النتائج حسب المجالات
    mobility_score = Column(Float)
    social_score = Column(Float)
    self_care_score = Column(Float)
    communication_score = Column(Float)
    responsibility_score = Column(Float)

    # النتائج المركبة
    overall_functioning = Column(Float)
    t_score = Column(Float)
    percentile = Column(Float)

    # التفاصيل الإضافية
    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessor_name = Column(String(100))
    notes = Column(Text)

    # التوصيات
    recommendations = Column(JSON)

    # المراجعة التالية
    next_review_date = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GMFM_Assessment(Base):
    """نموذج GMFM للوظائف الحركية الإجمالية"""
    __tablename__ = 'gmfm_assessments'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))

    # درجات الأبعاد الخمسة
    dimension_a_score = Column(Float)  # الاستلقاء والتدحرج
    dimension_b_score = Column(Float)  # الجلوس
    dimension_c_score = Column(Float)  # الزحف والتنقل
    dimension_d_score = Column(Float)  # الوقوف
    dimension_e_score = Column(Float)  # المشي والقفز والجري

    # الدرجة الإجمالية
    gmfm_percent = Column(Float)
    gmfcs_level = Column(Integer)  # 1-5
    impairment_level = Column(String(50))

    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessor_name = Column(String(100))

    # المقترحات
    clinical_recommendations = Column(JSON)
    prognosis = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CARSAssessment(Base):
    """نموذج CARS لمقياس التوحد"""
    __tablename__ = 'cars_assessments'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))

    # 15 مجال تقييم
    domain_scores = Column(JSON)  # {'domain_1': score, 'domain_2': score, ...}

    # النتائج المركبة
    total_score = Column(Float)
    severity_classification = Column(String(100))
    severity_level = Column(Integer)  # 0-4

    # المناطق المقلقة
    areas_of_concern = Column(JSON)

    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessor_name = Column(String(100))

    # التوصيات
    recommendation = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BASC3Assessment(Base):
    """نموذج BASC-3 لنظام التقييم السلوكي"""
    __tablename__ = 'basc3_assessments'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))
    age_group = Column(String(20))

    # المقاييس المركبة (T-Scores)
    externalizing_problems_t_score = Column(Float)
    internalizing_problems_t_score = Column(Float)
    school_problems_t_score = Column(Float)
    adaptive_scales_t_score = Column(Float)

    # الدرجات الفرعية
    subscale_scores = Column(JSON)

    # المؤشرات السريرية
    clinical_indicators = Column(JSON)

    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessor_name = Column(String(100))

    # التوصيات العلاجية
    treatment_recommendations = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BRIEFAssessment(Base):
    """نموذج BRIEF-2 للوظائف التنفيذية"""
    __tablename__ = 'brief_assessments'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))

    # مؤشرات T-Score الرئيسية
    inhibition_t_score = Column(Float)
    flexibility_t_score = Column(Float)
    emotion_control_t_score = Column(Float)

    # مؤشرات المركبة
    global_executive_composite = Column(Float)

    # التصنيفات
    inhibition_category = Column(String(50))
    flexibility_category = Column(String(50))
    emotion_control_category = Column(String(50))

    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessor_name = Column(String(100))

    # التقييم التفصيلي
    detailed_analysis = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==========================================
# البرامج التأهيلية الجديدة
# ==========================================

class PhysicalTherapyProgram(Base):
    """برنامج العلاج الطبيعي المتقدم"""
    __tablename__ = 'physical_therapy_programs'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))
    therapist_id = Column(Integer, ForeignKey('therapists.id'))

    # معلومات البرنامج
    program_name = Column(String(200))
    disability_type = Column(String(100))

    # المراحل
    current_phase = Column(String(50))  # phase_1, phase_2, phase_3, phase_4
    phase_start_date = Column(DateTime)

    # الأهداف
    short_term_goals = Column(JSON)
    long_term_goals = Column(JSON)

    # القياسات الأساسية
    baseline_measurements = Column(JSON)
    current_measurements = Column(JSON)

    # الجدول الأسبوعي
    weekly_schedule = Column(JSON)

    # برنامج البيت
    home_exercises = Column(JSON)

    # مراقبة التقدم
    progress_tracking_data = Column(JSON)

    # الحالة
    program_status = Column(Enum('active', 'paused', 'completed', 'discontinued'))

    # التواريخ
    start_date = Column(DateTime, default=datetime.utcnow)
    expected_end_date = Column(DateTime)
    actual_end_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SpeechLanguageTherapyProgram(Base):
    """برنامج النطق واللغة المتقدم"""
    __tablename__ = 'speech_language_programs'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))
    therapist_id = Column(Integer, ForeignKey('therapists.id'))

    # المجالات المتأثرة
    affected_language_domains = Column(JSON)  # ['phonology', 'semantics', ...]

    # الأهداف حسب المجالات
    domain_goals = Column(JSON)

    # الأنشطة العلاجية
    therapy_activities = Column(JSON)

    # برنامج البيت
    home_practice_program = Column(JSON)

    # تدريب الأسرة
    family_training_plan = Column(JSON)

    # قياسات اللغة
    baseline_language_measures = Column(JSON)
    current_language_measures = Column(JSON)

    # الحالة
    program_status = Column(Enum('active', 'paused', 'completed', 'discontinued'))

    # التواريخ
    start_date = Column(DateTime, default=datetime.utcnow)
    expected_end_date = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OccupationalTherapyProgram(Base):
    """برنامج العلاج الوظيفي المتقدم"""
    __tablename__ = 'occupational_therapy_programs'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))
    therapist_id = Column(Integer, ForeignKey('therapists.id'))

    # مجالات الأداء الوظيفي
    occupational_domains = Column(JSON)

    # الأنشطة المقلقة (حسب COPM)
    copm_activities = Column(JSON)

    # خطة التدخل
    intervention_strategies = Column(JSON)
    adaptations_and_modifications = Column(JSON)

    # الأجهزة المساعدة المطلوبة
    assistive_devices = Column(JSON)

    # التعديلات البيئية
    environmental_modifications = Column(JSON)

    # برنامج البيت
    home_program = Column(JSON)

    # تدريب الأسرة
    family_training = Column(JSON)

    # القياسات
    baseline_occupational_measures = Column(JSON)
    current_occupational_measures = Column(JSON)

    # الحالة
    program_status = Column(Enum('active', 'paused', 'completed', 'discontinued'))

    start_date = Column(DateTime, default=datetime.utcnow)
    expected_end_date = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==========================================
# تتبع التقدم والتقييمات الدورية
# ==========================================

class ProgressTracking(Base):
    """تتبع التقدم الدوري"""
    __tablename__ = 'progress_tracking'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))
    program_id = Column(String(100))  # ID البرنامج

    # البيانات الأسبوعية
    week_number = Column(Integer)
    measurement_date = Column(DateTime, default=datetime.utcnow)

    # النتائج المقاسة
    measurement_data = Column(JSON)

    # التقدم المحرز
    progress_notes = Column(Text)

    # التحديات والعوائق
    challenges = Column(JSON)

    # الأنشطة المنزلية الالتزام
    home_program_compliance = Column(Float)  # 0-100%

    # ملاحظات الآباء
    parent_observations = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ComprehensiveAssessmentReport(Base):
    """التقرير الشامل للتقييم والبرامج"""
    __tablename__ = 'comprehensive_reports'

    id = Column(Integer, primary_key=True)
    beneficiary_id = Column(Integer, ForeignKey('beneficiaries.id'))

    # فترة التقرير
    reporting_period_start = Column(DateTime)
    reporting_period_end = Column(DateTime)

    # البرامج المستلمة
    programs_received = Column(JSON)

    # ملخص التقييمات
    assessment_summary = Column(JSON)

    # التقدم المحرز
    progress_summary = Column(JSON)

    # الأهداف المنجزة
    achieved_goals = Column(JSON)

    # الاحتياجات المستمرة
    continuing_needs = Column(JSON)

    # التوصيات
    recommendations = Column(JSON)

    # تغذية راجعة من الأسرة
    family_feedback = Column(Text)

    # التخطيط للفترة القادمة
    next_period_planning = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 🔌 API Routes الجديدة

**الملف:** `backend/apis/assessment_routes.py`

```python
# -*- coding: utf-8 -*-
"""
API Routes للمقاييس الجديدة
Assessment API Routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..services import assessment_services
from ..models import new_assessments

assessment_bp = Blueprint('assessments', __name__, url_prefix='/api/assessments')

# ==========================================
# PEDI-CAT Assessment APIs
# ==========================================

@assessment_bp.route('/pedi-cat', methods=['POST'])
@jwt_required()
def create_pedi_cat_assessment():
    """إنشاء تقييم PEDI-CAT"""
    try:
        data = request.json
        beneficiary_id = data.get('beneficiary_id')
        responses = data.get('responses')  # استجابات العناصر

        # حساب النتائج
        results = assessment_services.calculate_pedi_cat_score(responses)

        # حفظ في قاعدة البيانات
        assessment = new_assessments.PediCatAssessment(
            beneficiary_id=beneficiary_id,
            mobility_score=results['scores']['mobility']['scaledScore'],
            social_score=results['scores']['social']['scaledScore'],
            self_care_score=results['scores']['selfCare']['scaledScore'],
            communication_score=results['scores']['communication']['scaledScore'],
            responsibility_score=results['scores']['responsibility']['scaledScore'],
            overall_functioning=results['summary']['overallFunctioning'],
            t_score=results['summary']['tScore'],
            percentile=results['summary']['percentile'],
            recommendations=results['recommendations']
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'assessment_id': assessment.id,
            'results': results
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


@assessment_bp.route('/pedi-cat/<int:assessment_id>', methods=['GET'])
@jwt_required()
def get_pedi_cat_assessment(assessment_id):
    """الحصول على نتائج PEDI-CAT"""
    assessment = new_assessments.PediCatAssessment.query.get(assessment_id)

    if not assessment:
        return jsonify({'status': 'error', 'message': 'Assessment not found'}), 404

    return jsonify({
        'status': 'success',
        'data': {
            'id': assessment.id,
            'beneficiary_id': assessment.beneficiary_id,
            'scores': {
                'mobility': assessment.mobility_score,
                'social': assessment.social_score,
                'self_care': assessment.self_care_score,
                'communication': assessment.communication_score,
                'responsibility': assessment.responsibility_score
            },
            'overall_functioning': assessment.overall_functioning,
            'assessment_date': assessment.assessment_date.isoformat(),
            'recommendations': assessment.recommendations
        }
    })


# ==========================================
# GMFM Assessment APIs
# ==========================================

@assessment_bp.route('/gmfm', methods=['POST'])
@jwt_required()
def create_gmfm_assessment():
    """إنشاء تقييم GMFM"""
    try:
        data = request.json
        beneficiary_id = data.get('beneficiary_id')
        dimension_responses = data.get('dimension_responses')  # استجابات الأبعاد

        # حساب النتائج
        results = assessment_services.calculate_gmfm_score(dimension_responses)

        # حفظ في قاعدة البيانات
        assessment = new_assessments.GMFM_Assessment(
            beneficiary_id=beneficiary_id,
            dimension_a_score=results['dimensionScores']['A']['percentScore'],
            dimension_b_score=results['dimensionScores']['B']['percentScore'],
            dimension_c_score=results['dimensionScores']['C']['percentScore'],
            dimension_d_score=results['dimensionScores']['D']['percentScore'],
            dimension_e_score=results['dimensionScores']['E']['percentScore'],
            gmfm_percent=results['gmfmPercent'],
            gmfcs_level=results['gmfcsLevel']['level'],
            impairment_level=results['gmfcsLevel']['description'],
            clinical_recommendations=results['interpretation'],
            prognosis=results['prognosis']
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'assessment_id': assessment.id,
            'results': results
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


# ==========================================
# CARS Assessment APIs
# ==========================================

@assessment_bp.route('/cars', methods=['POST'])
@jwt_required()
def create_cars_assessment():
    """إنشاء تقييم CARS للتوحد"""
    try:
        data = request.json
        beneficiary_id = data.get('beneficiary_id')
        domain_scores = data.get('domain_scores')  # درجات 15 مجال

        # حساب النتائج
        results = assessment_services.calculate_cars_score(domain_scores)

        # حفظ في قاعدة البيانات
        assessment = new_assessments.CARSAssessment(
            beneficiary_id=beneficiary_id,
            domain_scores=domain_scores,
            total_score=results['total_score'],
            severity_classification=results['severity_classification'],
            severity_level=results['severity_level'],
            areas_of_concern=results['areas_of_concern'],
            recommendation=results['recommendation']
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'assessment_id': assessment.id,
            'results': results
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


# ==========================================
# BASC-3 Assessment APIs
# ==========================================

@assessment_bp.route('/basc-3', methods=['POST'])
@jwt_required()
def create_basc3_assessment():
    """إنشاء تقييم BASC-3"""
    try:
        data = request.json
        beneficiary_id = data.get('beneficiary_id')
        age_group = data.get('age_group')
        raw_scores = data.get('raw_scores')

        # حساب T-Scores
        t_scores = assessment_services.calculate_basc3_scores(raw_scores, age_group)

        # حفظ في قاعدة البيانات
        assessment = new_assessments.BASC3Assessment(
            beneficiary_id=beneficiary_id,
            age_group=age_group,
            externalizing_problems_t_score=t_scores['externalizing']['t_score'],
            internalizing_problems_t_score=t_scores['internalizing']['t_score'],
            school_problems_t_score=t_scores['school_problems']['t_score'],
            adaptive_scales_t_score=t_scores['adaptive']['t_score'],
            subscale_scores=t_scores,
            clinical_indicators=assessment_services.identify_clinical_indicators(t_scores),
            treatment_recommendations=assessment_services.generate_basc3_recommendations(t_scores)
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'assessment_id': assessment.id,
            't_scores': t_scores
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


# ==========================================
# Progress Tracking APIs
# ==========================================

@assessment_bp.route('/progress/<int:beneficiary_id>', methods=['POST'])
@jwt_required()
def track_progress(beneficiary_id):
    """تسجيل تقدم أسبوعي"""
    try:
        data = request.json
        program_id = data.get('program_id')
        measurements = data.get('measurements')

        # حفظ بيانات التقدم
        progress = new_assessments.ProgressTracking(
            beneficiary_id=beneficiary_id,
            program_id=program_id,
            week_number=data.get('week_number'),
            measurement_data=measurements,
            progress_notes=data.get('notes'),
            home_program_compliance=data.get('compliance'),
            parent_observations=data.get('parent_feedback')
        )

        db.session.add(progress)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'progress_id': progress.id
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


@assessment_bp.route('/progress/<int:beneficiary_id>', methods=['GET'])
@jwt_required()
def get_progress_history(beneficiary_id):
    """الحصول على سجل التقدم"""
    progress_records = new_assessments.ProgressTracking.query.filter_by(
        beneficiary_id=beneficiary_id
    ).all()

    return jsonify({
        'status': 'success',
        'count': len(progress_records),
        'data': [
            {
                'id': p.id,
                'week': p.week_number,
                'date': p.measurement_date.isoformat(),
                'measurements': p.measurement_data,
                'compliance': p.home_program_compliance
            }
            for p in progress_records
        ]
    })


# ==========================================
# Comprehensive Report APIs
# ==========================================

@assessment_bp.route('/comprehensive-report', methods=['POST'])
@jwt_required()
def generate_comprehensive_report():
    """إنشاء تقرير شامل"""
    try:
        data = request.json
        beneficiary_id = data.get('beneficiary_id')
        period_start = data.get('period_start')
        period_end = data.get('period_end')

        # جمع البيانات من جميع البرامج والتقييمات
        report_data = assessment_services.compile_comprehensive_report(
            beneficiary_id, period_start, period_end
        )

        # حفظ التقرير
        report = new_assessments.ComprehensiveAssessmentReport(
            beneficiary_id=beneficiary_id,
            reporting_period_start=period_start,
            reporting_period_end=period_end,
            programs_received=report_data['programs'],
            assessment_summary=report_data['assessments'],
            progress_summary=report_data['progress'],
            achieved_goals=report_data['achieved_goals'],
            continuing_needs=report_data['needs'],
            recommendations=report_data['recommendations'],
            family_feedback=data.get('family_feedback'),
            next_period_planning=data.get('next_period_plan')
        )

        db.session.add(report)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'report_id': report.id,
            'report_data': report_data
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
```

---

## 🎨 مكونات Frontend

**الملف:** `frontend/src/components/AssessmentAdmin/PediCatForm.jsx`

```jsx
import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';

const PediCatForm = ({ beneficiaryId, onSuccess }) => {
  const [formData, setFormData] = useState({
    mobility_items: {},
    social_items: {},
    selfcare_items: {},
    communication_items: {},
    responsibility_items: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const domains = {
    mobility: {
      name: 'مجال الحركة والتنقل',
      items: [
        { id: 1, text: 'يزحف على الأرض' },
        { id: 2, text: 'يمشي بدون مساعدة' },
        { id: 3, text: 'يصعد السلالم' },
        { id: 4, text: 'يركض ويتوازن' },
        { id: 5, text: 'يقفز برجليه' },
        // ... more items
      ],
    },
    social: {
      name: 'المهارات الاجتماعية',
      items: [
        // ... items
      ],
    },
    selfcare: {
      name: 'العناية الذاتية',
      items: [
        // ... items
      ],
    },
    communication: {
      name: 'التواصل',
      items: [
        // ... items
      ],
    },
    responsibility: {
      name: 'تحمل المسؤولية',
      items: [
        // ... items
      ],
    },
  };

  const handleItemChange = (domain, itemId, score) => {
    setFormData(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [itemId]: score,
      },
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/assessments/pedi-cat',
        {
          beneficiary_id: beneficiaryId,
          responses: formData,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );

      setResults(response.data.results);
      onSuccess(response.data.assessment_id);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إرسال البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rtl" dir="rtl">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">📊 تقييم PEDI-CAT</h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            {Object.entries(domains).map(([domain, domainInfo]) => (
              <div key={domain} className="mb-4">
                <h5 className="text-primary mb-3">{domainInfo.name}</h5>

                {domainInfo.items.map(item => (
                  <Form.Group key={item.id} className="mb-3">
                    <Form.Label>{item.text}</Form.Label>
                    <Form.Check
                      type="radio"
                      name={`${domain}_${item.id}`}
                      label="لا يستطيع"
                      value="0"
                      onChange={e => handleItemChange(domain, item.id, 0)}
                    />
                    <Form.Check
                      type="radio"
                      name={`${domain}_${item.id}`}
                      label="يستطيع بمساعدة"
                      value="1"
                      onChange={e => handleItemChange(domain, item.id, 1)}
                    />
                    <Form.Check
                      type="radio"
                      name={`${domain}_${item.id}`}
                      label="يستطيع بشكل مستقل"
                      value="2"
                      onChange={e => handleItemChange(domain, item.id, 2)}
                    />
                  </Form.Group>
                ))}
              </div>
            ))}

            <Button variant="success" type="submit" disabled={loading} className="w-100">
              {loading ? 'جاري المعالجة...' : 'حفظ وحساب النتائج'}
            </Button>
          </Form>

          {results && (
            <Alert variant="success" className="mt-4">
              <h5>📈 النتائج:</h5>
              <ul>
                <li>الوظيفة الإجمالية: {results.summary.overallFunctioning.toFixed(1)}%</li>
                <li>الفئة: {results.summary.category}</li>
                <li>التوصيات: {results.recommendations.join(' | ')}</li>
              </ul>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PediCatForm;
```

---

## 🚀 نقاط التكامل والتطبيق

```
✅ نماذج قاعدة البيانات (Database Models)
✅ خوارزميات الحساب والتصحيح (Scoring Algorithms)
✅ API Routes للاتصال بين Frontend و Backend
✅ مكونات واجهة المستخدم (React Components)
✅ جداول التحويل والمعايرة (Normalization Tables)
✅ نظام التقارير الشامل (Report System)
✅ نظام تتبع التقدم (Progress Tracking)
✅ تدريب المستخدمين والتوثيق
```

---

**التاريخ:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتطوير الفوري
