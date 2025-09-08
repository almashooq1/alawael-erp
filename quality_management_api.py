#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Quality Management and Accreditation API
واجهة برمجة تطبيقات نظام إدارة الجودة والاعتماد
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from quality_management_models import (
    QualityStandard, QualityAudit, AuditFinding, QualityAssessment,
    AccreditationBody, AccreditationCertificate, PerformanceIndicator,
    IndicatorMeasurement, QualityImprovement, ComplianceChecklist,
    ChecklistSubmission, calculate_compliance_percentage, get_performance_status
)
from datetime import datetime, date
import json

quality_bp = Blueprint('quality', __name__, url_prefix='/api/quality')

# Quality Standards Management
@quality_bp.route('/standards', methods=['GET'])
@jwt_required()
def get_quality_standards():
    """الحصول على معايير الجودة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        category = request.args.get('category')
        
        query = QualityStandard.query.filter_by(is_active=True)
        
        if category:
            query = query.filter(QualityStandard.category == category)
        
        standards = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'standards': [{
                'id': s.id,
                'standard_code': s.standard_code,
                'standard_name': s.standard_name,
                'category': s.category,
                'target_score': s.target_score,
                'compliance_level': s.compliance_level,
                'international_standard': s.international_standard,
                'effective_date': s.effective_date.isoformat() if s.effective_date else None
            } for s in standards.items],
            'total': standards.total,
            'pages': standards.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/standards', methods=['POST'])
@jwt_required()
def create_quality_standard():
    """إنشاء معيار جودة جديد"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        standard = QualityStandard(
            standard_code=data['standard_code'],
            standard_name=data['standard_name'],
            category=data['category'],
            description=data.get('description'),
            requirements=data.get('requirements', {}),
            measurement_criteria=data.get('measurement_criteria', {}),
            target_score=data.get('target_score', 85.0),
            compliance_level=data.get('compliance_level', 'mandatory'),
            international_standard=data.get('international_standard'),
            effective_date=datetime.strptime(data['effective_date'], '%Y-%m-%d').date(),
            created_by=current_user
        )
        
        db.session.add(standard)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء معيار الجودة بنجاح',
            'standard_id': standard.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Quality Audits Management
@quality_bp.route('/audits', methods=['GET'])
@jwt_required()
def get_quality_audits():
    """الحصول على تدقيقات الجودة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        audit_type = request.args.get('audit_type')
        
        query = QualityAudit.query
        
        if status:
            query = query.filter(QualityAudit.status == status)
        if audit_type:
            query = query.filter(QualityAudit.audit_type == audit_type)
        
        audits = query.order_by(QualityAudit.planned_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'audits': [{
                'id': a.id,
                'audit_code': a.audit_code,
                'audit_title': a.audit_title,
                'audit_type': a.audit_type,
                'standard_name': a.standard.standard_name,
                'auditor_name': a.auditor_name,
                'planned_date': a.planned_date.isoformat(),
                'status': a.status,
                'overall_score': a.overall_score,
                'compliance_percentage': a.compliance_percentage
            } for a in audits.items],
            'total': audits.total,
            'pages': audits.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/audits', methods=['POST'])
@jwt_required()
def create_quality_audit():
    """إنشاء تدقيق جودة جديد"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        audit = QualityAudit(
            audit_code=data['audit_code'],
            audit_title=data['audit_title'],
            audit_type=data['audit_type'],
            standard_id=data['standard_id'],
            auditor_name=data['auditor_name'],
            planned_date=datetime.strptime(data['planned_date'], '%Y-%m-%d').date(),
            audit_scope=data.get('audit_scope'),
            created_by=current_user
        )
        
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء التدقيق بنجاح',
            'audit_id': audit.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Performance Indicators
@quality_bp.route('/indicators', methods=['GET'])
@jwt_required()
def get_performance_indicators():
    """الحصول على مؤشرات الأداء"""
    try:
        indicators = PerformanceIndicator.query.filter_by(is_active=True).all()
        
        return jsonify({
            'indicators': [{
                'id': i.id,
                'indicator_code': i.indicator_code,
                'indicator_name': i.indicator_name,
                'category': i.category,
                'measurement_unit': i.measurement_unit,
                'target_value': i.target_value,
                'collection_frequency': i.collection_frequency
            } for i in indicators]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Dashboard Analytics
@quality_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_quality_dashboard():
    """لوحة تحكم الجودة"""
    try:
        # إحصائيات عامة
        total_standards = QualityStandard.query.filter_by(is_active=True).count()
        active_audits = QualityAudit.query.filter_by(status='جاري').count()
        completed_audits = QualityAudit.query.filter_by(status='مكتمل').count()
        active_certificates = AccreditationCertificate.query.filter_by(status='active').count()
        
        # تدقيقات حسب النوع
        audit_types = db.session.query(
            QualityAudit.audit_type,
            db.func.count(QualityAudit.id)
        ).group_by(QualityAudit.audit_type).all()
        
        # معايير حسب الفئة
        standard_categories = db.session.query(
            QualityStandard.category,
            db.func.count(QualityStandard.id)
        ).filter_by(is_active=True).group_by(QualityStandard.category).all()
        
        return jsonify({
            'summary': {
                'total_standards': total_standards,
                'active_audits': active_audits,
                'completed_audits': completed_audits,
                'active_certificates': active_certificates
            },
            'audit_types': [{'type': t[0], 'count': t[1]} for t in audit_types],
            'standard_categories': [{'category': c[0], 'count': c[1]} for c in standard_categories]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Compliance Checklists
@quality_bp.route('/checklists', methods=['GET'])
@jwt_required()
def get_compliance_checklists():
    """الحصول على قوائم الامتثال"""
    try:
        checklists = ComplianceChecklist.query.filter_by(is_active=True).all()
        
        return jsonify({
            'checklists': [{
                'id': c.id,
                'checklist_code': c.checklist_code,
                'checklist_name': c.checklist_name,
                'category': c.category,
                'frequency': c.frequency,
                'passing_score': c.passing_score
            } for c in checklists]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/checklists/<int:checklist_id>/submit', methods=['POST'])
@jwt_required()
def submit_checklist(checklist_id):
    """تقديم قائمة امتثال"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        checklist = ComplianceChecklist.query.get_or_404(checklist_id)
        
        # حساب النتائج
        responses = data['responses']
        total_items = len(responses)
        compliant_items = sum(1 for r in responses.values() if r.get('compliant', False))
        not_applicable_items = sum(1 for r in responses.values() if r.get('not_applicable', False))
        
        compliance_percentage = calculate_compliance_percentage(
            compliant_items, total_items, not_applicable_items
        )
        
        submission = ChecklistSubmission(
            submission_code=f"CS-{datetime.now().strftime('%Y%m%d')}-{checklist_id:03d}",
            checklist_id=checklist_id,
            submission_date=date.today(),
            submitted_by=current_user,
            responses=responses,
            total_items=total_items,
            compliant_items=compliant_items,
            not_applicable_items=not_applicable_items,
            compliance_percentage=compliance_percentage,
            overall_status='مطابق' if compliance_percentage >= checklist.passing_score else 'غير مطابق'
        )
        
        db.session.add(submission)
        db.session.commit()
        
        return jsonify({
            'message': 'تم تقديم القائمة بنجاح',
            'submission_id': submission.id,
            'compliance_percentage': compliance_percentage
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
