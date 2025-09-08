from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from risk_management_models import (
    RiskCategory, RiskAssessment, EmergencyPlan, IncidentReport,
    SafetyInspection, PreventiveMeasure, RiskMitigation
)
from datetime import datetime, date, time
import json
import uuid

risk_management_bp = Blueprint('risk_management', __name__)

# ==================== Risk Categories API ====================

@risk_management_bp.route('/api/risk-categories', methods=['GET'])
@jwt_required()
def get_risk_categories():
    """استرجاع فئات المخاطر"""
    try:
        categories = RiskCategory.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'categories': [{
                'id': cat.id,
                'name': cat.name,
                'description': cat.description,
                'color_code': cat.color_code,
                'icon': cat.icon,
                'risks_count': len(cat.risks)
            } for cat in categories]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@risk_management_bp.route('/api/risk-categories', methods=['POST'])
@jwt_required()
def create_risk_category():
    """إنشاء فئة مخاطر جديدة"""
    try:
        data = request.get_json()
        
        category = RiskCategory(
            name=data['name'],
            description=data.get('description'),
            color_code=data.get('color_code', '#007bff'),
            icon=data.get('icon', 'fas fa-exclamation-triangle')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء فئة المخاطر بنجاح',
            'category_id': category.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Risk Assessment API ====================

@risk_management_bp.route('/api/risk-assessments', methods=['GET'])
@jwt_required()
def get_risk_assessments():
    """استرجاع تقييمات المخاطر"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        risk_level = request.args.get('risk_level', '')
        status = request.args.get('status', '')
        category_id = request.args.get('category_id', type=int)
        
        query = RiskAssessment.query
        
        if risk_level:
            query = query.filter(RiskAssessment.risk_level == risk_level)
        if status:
            query = query.filter(RiskAssessment.status == status)
        if category_id:
            query = query.filter(RiskAssessment.category_id == category_id)
            
        risks = query.order_by(RiskAssessment.risk_score.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'risks': [{
                'id': risk.id,
                'risk_code': risk.risk_code,
                'title': risk.title,
                'description': risk.description[:200] + '...' if len(risk.description) > 200 else risk.description,
                'category_name': risk.category.name if risk.category else None,
                'location': risk.location,
                'department': risk.department,
                'probability': risk.probability,
                'impact': risk.impact,
                'risk_level': risk.risk_level,
                'risk_score': risk.risk_score,
                'status': risk.status,
                'priority': risk.priority,
                'identified_date': risk.identified_date.isoformat() if risk.identified_date else None,
                'risk_owner': risk.risk_owner_user.name if risk.risk_owner_user else None,
                'assigned_to': risk.assigned_user.name if risk.assigned_user else None
            } for risk in risks.items],
            'pagination': {
                'page': risks.page,
                'pages': risks.pages,
                'per_page': risks.per_page,
                'total': risks.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@risk_management_bp.route('/api/risk-assessments', methods=['POST'])
@jwt_required()
def create_risk_assessment():
    """إنشاء تقييم مخاطر جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رمز المخاطر
        risk_code = f"RISK-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # حساب نتيجة المخاطر
        probability = data['probability']
        impact = data['impact']
        risk_score = probability * impact
        
        # تحديد مستوى المخاطر
        if risk_score <= 5:
            risk_level = 'low'
        elif risk_score <= 10:
            risk_level = 'medium'
        elif risk_score <= 15:
            risk_level = 'high'
        else:
            risk_level = 'critical'
        
        risk = RiskAssessment(
            risk_code=risk_code,
            title=data['title'],
            description=data['description'],
            category_id=data['category_id'],
            location=data.get('location'),
            department=data.get('department'),
            probability=probability,
            impact=impact,
            risk_level=risk_level,
            risk_score=risk_score,
            affected_groups=json.dumps(data.get('affected_groups', [])),
            estimated_affected_count=data.get('estimated_affected_count', 0),
            current_controls=data.get('current_controls'),
            control_effectiveness=data.get('control_effectiveness'),
            recommended_actions=data.get('recommended_actions'),
            required_resources=data.get('required_resources'),
            estimated_cost=data.get('estimated_cost', 0.0),
            risk_owner=data.get('risk_owner'),
            assigned_to=data.get('assigned_to'),
            created_by=current_user_id
        )
        
        db.session.add(risk)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تقييم المخاطر بنجاح',
            'risk_id': risk.id,
            'risk_code': risk.risk_code,
            'risk_level': risk_level,
            'risk_score': risk_score
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@risk_management_bp.route('/api/risk-assessments/<int:risk_id>', methods=['GET'])
@jwt_required()
def get_risk_assessment(risk_id):
    """استرجاع تقييم مخاطر محدد"""
    try:
        risk = RiskAssessment.query.get_or_404(risk_id)
        
        return jsonify({
            'success': True,
            'risk': {
                'id': risk.id,
                'risk_code': risk.risk_code,
                'title': risk.title,
                'description': risk.description,
                'category_id': risk.category_id,
                'category_name': risk.category.name if risk.category else None,
                'location': risk.location,
                'department': risk.department,
                'probability': risk.probability,
                'impact': risk.impact,
                'risk_level': risk.risk_level,
                'risk_score': risk.risk_score,
                'affected_groups': json.loads(risk.affected_groups or '[]'),
                'estimated_affected_count': risk.estimated_affected_count,
                'identified_date': risk.identified_date.isoformat() if risk.identified_date else None,
                'last_review_date': risk.last_review_date.isoformat() if risk.last_review_date else None,
                'next_review_date': risk.next_review_date.isoformat() if risk.next_review_date else None,
                'status': risk.status,
                'priority': risk.priority,
                'current_controls': risk.current_controls,
                'control_effectiveness': risk.control_effectiveness,
                'recommended_actions': risk.recommended_actions,
                'required_resources': risk.required_resources,
                'estimated_cost': risk.estimated_cost,
                'risk_owner': risk.risk_owner,
                'assigned_to': risk.assigned_to,
                'attachments': json.loads(risk.attachments or '[]'),
                'photos': json.loads(risk.photos or '[]'),
                'documents': json.loads(risk.documents or '[]')
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Emergency Plans API ====================

@risk_management_bp.route('/api/emergency-plans', methods=['GET'])
@jwt_required()
def get_emergency_plans():
    """استرجاع خطط الطوارئ"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        emergency_type = request.args.get('emergency_type', '')
        approval_status = request.args.get('approval_status', '')
        
        query = EmergencyPlan.query.filter_by(is_active=True)
        
        if emergency_type:
            query = query.filter(EmergencyPlan.emergency_type == emergency_type)
        if approval_status:
            query = query.filter(EmergencyPlan.approval_status == approval_status)
            
        plans = query.order_by(EmergencyPlan.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'plans': [{
                'id': plan.id,
                'plan_code': plan.plan_code,
                'title': plan.title,
                'emergency_type': plan.emergency_type,
                'scope': plan.scope,
                'version': plan.version,
                'approval_status': plan.approval_status,
                'coordinator': plan.coordinator.name if plan.coordinator else None,
                'last_drill_date': plan.last_drill_date.isoformat() if plan.last_drill_date else None,
                'next_drill_date': plan.next_drill_date.isoformat() if plan.next_drill_date else None,
                'last_review_date': plan.last_review_date.isoformat() if plan.last_review_date else None,
                'next_review_date': plan.next_review_date.isoformat() if plan.next_review_date else None
            } for plan in plans.items],
            'pagination': {
                'page': plans.page,
                'pages': plans.pages,
                'per_page': plans.per_page,
                'total': plans.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@risk_management_bp.route('/api/emergency-plans', methods=['POST'])
@jwt_required()
def create_emergency_plan():
    """إنشاء خطة طوارئ جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رمز الخطة
        plan_code = f"EP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        plan = EmergencyPlan(
            plan_code=plan_code,
            title=data['title'],
            description=data.get('description'),
            emergency_type=data['emergency_type'],
            scope=data.get('scope'),
            objectives=data.get('objectives'),
            activation_criteria=data.get('activation_criteria'),
            procedures=json.dumps(data.get('procedures', [])),
            evacuation_routes=json.dumps(data.get('evacuation_routes', [])),
            assembly_points=json.dumps(data.get('assembly_points', [])),
            emergency_coordinator=data.get('emergency_coordinator'),
            team_members=json.dumps(data.get('team_members', [])),
            external_contacts=json.dumps(data.get('external_contacts', [])),
            required_equipment=json.dumps(data.get('required_equipment', [])),
            emergency_supplies=json.dumps(data.get('emergency_supplies', [])),
            communication_tools=json.dumps(data.get('communication_tools', [])),
            training_schedule=json.dumps(data.get('training_schedule', [])),
            drill_frequency=data.get('drill_frequency'),
            review_frequency=data.get('review_frequency', 'annually'),
            created_by=current_user_id
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء خطة الطوارئ بنجاح',
            'plan_id': plan.id,
            'plan_code': plan.plan_code
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Incident Reports API ====================

@risk_management_bp.route('/api/incident-reports', methods=['GET'])
@jwt_required()
def get_incident_reports():
    """استرجاع تقارير الحوادث"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        incident_type = request.args.get('incident_type', '')
        severity = request.args.get('severity', '')
        status = request.args.get('status', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        query = IncidentReport.query
        
        if incident_type:
            query = query.filter(IncidentReport.incident_type == incident_type)
        if severity:
            query = query.filter(IncidentReport.severity == severity)
        if status:
            query = query.filter(IncidentReport.status == status)
        if date_from:
            query = query.filter(IncidentReport.incident_date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        if date_to:
            query = query.filter(IncidentReport.incident_date <= datetime.strptime(date_to, '%Y-%m-%d').date())
            
        incidents = query.order_by(IncidentReport.incident_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'incidents': [{
                'id': incident.id,
                'incident_number': incident.incident_number,
                'title': incident.title,
                'incident_type': incident.incident_type,
                'severity': incident.severity,
                'incident_date': incident.incident_date.isoformat(),
                'incident_time': incident.incident_time.strftime('%H:%M'),
                'location': incident.location,
                'injured_count': incident.injured_count,
                'fatality_count': incident.fatality_count,
                'estimated_damage_cost': incident.estimated_damage_cost,
                'investigation_status': incident.investigation_status,
                'status': incident.status,
                'reported_by': incident.reported_by_user.name if incident.reported_by_user else None,
                'reported_at': incident.reported_at.isoformat()
            } for incident in incidents.items],
            'pagination': {
                'page': incidents.page,
                'pages': incidents.pages,
                'per_page': incidents.per_page,
                'total': incidents.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@risk_management_bp.route('/api/incident-reports', methods=['POST'])
@jwt_required()
def create_incident_report():
    """إنشاء تقرير حادث جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رقم الحادث
        incident_number = f"INC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        incident = IncidentReport(
            incident_number=incident_number,
            title=data['title'],
            description=data['description'],
            incident_type=data['incident_type'],
            severity=data['severity'],
            incident_date=datetime.strptime(data['incident_date'], '%Y-%m-%d').date(),
            incident_time=datetime.strptime(data['incident_time'], '%H:%M').time(),
            location=data['location'],
            weather_conditions=data.get('weather_conditions'),
            people_involved=json.dumps(data.get('people_involved', [])),
            witnesses=json.dumps(data.get('witnesses', [])),
            injured_count=data.get('injured_count', 0),
            fatality_count=data.get('fatality_count', 0),
            injury_details=data.get('injury_details'),
            medical_treatment=data.get('medical_treatment'),
            hospital_transport=data.get('hospital_transport', False),
            property_damage=data.get('property_damage'),
            estimated_damage_cost=data.get('estimated_damage_cost', 0.0),
            environmental_impact=data.get('environmental_impact'),
            immediate_actions=data.get('immediate_actions'),
            emergency_services_called=data.get('emergency_services_called', False),
            emergency_services_details=data.get('emergency_services_details'),
            reported_by=current_user_id
        )
        
        db.session.add(incident)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تقرير الحادث بنجاح',
            'incident_id': incident.id,
            'incident_number': incident.incident_number
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Safety Inspections API ====================

@risk_management_bp.route('/api/safety-inspections', methods=['GET'])
@jwt_required()
def get_safety_inspections():
    """استرجاع تفتيشات السلامة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        inspection_type = request.args.get('inspection_type', '')
        status = request.args.get('status', '')
        
        query = SafetyInspection.query
        
        if inspection_type:
            query = query.filter(SafetyInspection.inspection_type == inspection_type)
        if status:
            query = query.filter(SafetyInspection.status == status)
            
        inspections = query.order_by(SafetyInspection.inspection_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'inspections': [{
                'id': inspection.id,
                'inspection_number': inspection.inspection_number,
                'title': inspection.title,
                'inspection_type': inspection.inspection_type,
                'inspection_date': inspection.inspection_date.isoformat(),
                'overall_rating': inspection.overall_rating,
                'compliance_percentage': inspection.compliance_percentage,
                'lead_inspector': inspection.lead_inspector_user.name if inspection.lead_inspector_user else None,
                'status': inspection.status,
                'approval_status': inspection.approval_status,
                'follow_up_required': inspection.follow_up_required,
                'follow_up_date': inspection.follow_up_date.isoformat() if inspection.follow_up_date else None
            } for inspection in inspections.items],
            'pagination': {
                'page': inspections.page,
                'pages': inspections.pages,
                'per_page': inspections.per_page,
                'total': inspections.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Preventive Measures API ====================

@risk_management_bp.route('/api/preventive-measures', methods=['GET'])
@jwt_required()
def get_preventive_measures():
    """استرجاع التدابير الوقائية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category', '')
        status = request.args.get('status', '')
        
        query = PreventiveMeasure.query
        
        if category:
            query = query.filter(PreventiveMeasure.category == category)
        if status:
            query = query.filter(PreventiveMeasure.status == status)
            
        measures = query.order_by(PreventiveMeasure.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'measures': [{
                'id': measure.id,
                'measure_code': measure.measure_code,
                'title': measure.title,
                'category': measure.category,
                'type': measure.type,
                'status': measure.status,
                'priority': measure.priority,
                'responsible_person': measure.responsible_user.name if measure.responsible_user else None,
                'implementation_date': measure.implementation_date.isoformat() if measure.implementation_date else None,
                'target_completion_date': measure.target_completion_date.isoformat() if measure.target_completion_date else None,
                'effectiveness_rating': measure.effectiveness_rating,
                'estimated_cost': measure.estimated_cost,
                'actual_cost': measure.actual_cost
            } for measure in measures.items],
            'pagination': {
                'page': measures.page,
                'pages': measures.pages,
                'per_page': measures.per_page,
                'total': measures.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Dashboard API ====================

@risk_management_bp.route('/api/risk-management-dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """استرجاع بيانات لوحة التحكم"""
    try:
        # إحصائيات المخاطر
        total_risks = RiskAssessment.query.count()
        critical_risks = RiskAssessment.query.filter_by(risk_level='critical').count()
        high_risks = RiskAssessment.query.filter_by(risk_level='high').count()
        medium_risks = RiskAssessment.query.filter_by(risk_level='medium').count()
        low_risks = RiskAssessment.query.filter_by(risk_level='low').count()
        
        # إحصائيات الحوادث
        total_incidents = IncidentReport.query.count()
        this_month_incidents = IncidentReport.query.filter(
            IncidentReport.incident_date >= date.today().replace(day=1)
        ).count()
        
        # إحصائيات خطط الطوارئ
        total_emergency_plans = EmergencyPlan.query.filter_by(is_active=True).count()
        approved_plans = EmergencyPlan.query.filter_by(approval_status='approved').count()
        
        # إحصائيات التفتيش
        total_inspections = SafetyInspection.query.count()
        pending_inspections = SafetyInspection.query.filter_by(status='scheduled').count()
        
        # إحصائيات التدابير الوقائية
        total_measures = PreventiveMeasure.query.count()
        active_measures = PreventiveMeasure.query.filter_by(status='active').count()
        
        # توزيع المخاطر حسب الفئة
        risk_by_category = db.session.query(
            RiskCategory.name,
            db.func.count(RiskAssessment.id).label('count')
        ).outerjoin(RiskAssessment).group_by(RiskCategory.name).all()
        
        # اتجاه الحوادث الشهرية (آخر 6 أشهر)
        incidents_trend = []
        for i in range(6):
            month_start = date.today().replace(day=1)
            if i > 0:
                if month_start.month > i:
                    month_start = month_start.replace(month=month_start.month - i)
                else:
                    year = month_start.year - 1
                    month = 12 - (i - month_start.month)
                    month_start = month_start.replace(year=year, month=month)
            
            month_end = month_start.replace(day=28)  # Safe day for all months
            
            count = IncidentReport.query.filter(
                IncidentReport.incident_date >= month_start,
                IncidentReport.incident_date <= month_end
            ).count()
            
            incidents_trend.append({
                'month': month_start.strftime('%Y-%m'),
                'count': count
            })
        
        return jsonify({
            'success': True,
            'statistics': {
                'risks': {
                    'total': total_risks,
                    'critical': critical_risks,
                    'high': high_risks,
                    'medium': medium_risks,
                    'low': low_risks
                },
                'incidents': {
                    'total': total_incidents,
                    'this_month': this_month_incidents
                },
                'emergency_plans': {
                    'total': total_emergency_plans,
                    'approved': approved_plans
                },
                'inspections': {
                    'total': total_inspections,
                    'pending': pending_inspections
                },
                'preventive_measures': {
                    'total': total_measures,
                    'active': active_measures
                }
            },
            'charts': {
                'risk_by_category': [{'name': name, 'count': count} for name, count in risk_by_category],
                'incidents_trend': incidents_trend
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Risk Matrix API ====================

@risk_management_bp.route('/api/risk-matrix', methods=['GET'])
@jwt_required()
def get_risk_matrix():
    """استرجاع مصفوفة المخاطر"""
    try:
        risks = RiskAssessment.query.all()
        
        matrix = {}
        for risk in risks:
            key = f"{risk.probability}-{risk.impact}"
            if key not in matrix:
                matrix[key] = []
            matrix[key].append({
                'id': risk.id,
                'title': risk.title,
                'risk_code': risk.risk_code,
                'risk_level': risk.risk_level
            })
        
        return jsonify({
            'success': True,
            'matrix': matrix
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
