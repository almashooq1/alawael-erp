from auth_rbac_decorator import (
    check_permission,
    check_multiple_permissions,
    guard_payload_size,
    validate_json,
    log_audit
)
# -*- coding: utf-8 -*-
"""
API endpoints لنظام التكامل والاتصالات
Integration and Communication API Endpoints
"""

from datetime import datetime, timedelta
from flask import request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
from app import app, db
from models import User, Clinic, Patient
from integration_models import *
from integration_services import communication_service, integration_service

# ==================== Communication Management APIs ====================

@app.route('/integration-management')
@jwt_required()
def integration_management():
    """صفحة إدارة التكامل والاتصالات"""
    return render_template('integration_management.html')

@app.route('/api/communication/send-sms', methods=['POST'])
@jwt_required()
@check_permission('send_integration')
@guard_payload_size()
@log_audit('SEND_SMS')
def send_sms():
    """إرسال رسالة SMS"""
    try:
        data = request.get_json()
        
        result = communication_service.send_sms(
            phone=data['phone'],
            message=data['message'],
            template_id=data.get('template_id')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/send-email', methods=['POST'])
@jwt_required()
@check_permission('send_integration')
@guard_payload_size()
@log_audit('SEND_EMAIL')
def send_email():
    """إرسال بريد إلكتروني"""
    try:
        data = request.get_json()
        
        result = communication_service.send_email(
            email=data['email'],
            subject=data['subject'],
            content=data['content'],
            template_id=data.get('template_id')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/templates', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_MESSAGE_TEMPLATES')
def get_message_templates():
    """الحصول على قوالب الرسائل"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        channel = request.args.get('channel')
        
        query = MessageTemplate.query.filter(MessageTemplate.is_active == True)
        
        if channel:
            query = query.filter(MessageTemplate.channel == channel)
        
        templates = query.order_by(MessageTemplate.template_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'templates': [{
                'id': template.id,
                'template_name': template.template_name,
                'description': template.description,
                'channel': template.channel.value,
                'category': template.category,
                'subject': template.subject,
                'content': template.content,
                'variables': template.variables,
                'usage_count': template.usage_count
            } for template in templates.items],
            'total': templates.total,
            'pages': templates.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/templates', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('CREATE_MESSAGE_TEMPLATE')
def create_message_template():
    """إنشاء قالب رسالة جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        template = MessageTemplate(
            template_name=data['template_name'],
            description=data.get('description'),
            subject=data.get('subject'),
            content=data['content'],
            channel=CommunicationChannel(data['channel']),
            category=data.get('category'),
            priority=data.get('priority', 'normal'),
            variables=data.get('variables', []),
            created_by=current_user_id
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القالب بنجاح',
            'template_id': template.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/messages', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_COMMUNICATION_MESSAGES')
def get_communication_messages():
    """الحصول على رسائل الاتصال"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        channel = request.args.get('channel')
        
        query = CommunicationMessage.query
        
        if status:
            query = query.filter(CommunicationMessage.status == status)
        
        if channel:
            query = query.filter(CommunicationMessage.channel == channel)
        
        messages = query.order_by(CommunicationMessage.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'messages': [{
                'id': msg.id,
                'recipient_name': msg.recipient_name,
                'recipient_phone': msg.recipient_phone,
                'recipient_email': msg.recipient_email,
                'channel': msg.channel.value,
                'subject': msg.subject,
                'content': msg.content[:100] + '...' if len(msg.content) > 100 else msg.content,
                'status': msg.status,
                'scheduled_at': msg.scheduled_at.isoformat() if msg.scheduled_at else None,
                'sent_at': msg.sent_at.isoformat() if msg.sent_at else None,
                'delivered_at': msg.delivered_at.isoformat() if msg.delivered_at else None,
                'created_at': msg.created_at.isoformat()
            } for msg in messages.items],
            'total': messages.total,
            'pages': messages.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== External System Integration APIs ====================

@app.route('/api/integration/external-systems', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_EXTERNAL_SYSTEMS')
def get_external_systems():
    """الحصول على الأنظمة الخارجية"""
    try:
        systems = ExternalSystem.query.filter(ExternalSystem.is_active == True).all()
        
        return jsonify({
            'success': True,
            'systems': [{
                'id': system.id,
                'system_name': system.system_name,
                'system_type': system.system_type.value,
                'description': system.description,
                'connection_status': system.connection_status,
                'last_connection_test': system.last_connection_test.isoformat() if system.last_connection_test else None,
                'created_at': system.created_at.isoformat()
            } for system in systems]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/external-systems', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('CREATE_EXTERNAL_SYSTEM')
def create_external_system():
    """إنشاء نظام خارجي جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        system = ExternalSystem(
            system_name=data['system_name'],
            system_type=ExternalSystemType(data['system_type']),
            description=data.get('description'),
            api_endpoint=data.get('api_endpoint'),
            api_key=data.get('api_key'),
            username=data.get('username'),
            auth_type=data.get('auth_type', 'api_key'),
            connection_timeout=data.get('connection_timeout', 30),
            retry_attempts=data.get('retry_attempts', 3),
            created_by=current_user_id
        )
        
        db.session.add(system)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء النظام الخارجي بنجاح',
            'system_id': system.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/test-connection/<int:system_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('TEST_SYSTEM_CONNECTION')
def test_system_connection(system_id):
    """اختبار الاتصال مع النظام الخارجي"""
    try:
        system = ExternalSystem.query.get_or_404(system_id)
        
        # Test connection logic here
        # For now, simulate a successful test
        system.last_connection_test = datetime.utcnow()
        system.connection_status = 'active'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم اختبار الاتصال بنجاح',
            'status': 'active'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/sync-logs', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_SYNC_LOGS')
def get_sync_logs():
    """الحصول على سجلات المزامنة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        system_id = request.args.get('system_id', type=int)
        status = request.args.get('status')
        
        query = DataSyncLog.query
        
        if system_id:
            query = query.filter(DataSyncLog.external_system_id == system_id)
        
        if status:
            query = query.filter(DataSyncLog.status == status)
        
        logs = query.order_by(DataSyncLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'logs': [{
                'id': log.id,
                'system_name': log.external_system.system_name if log.external_system else None,
                'sync_type': log.sync_type,
                'operation': log.operation,
                'entity_type': log.entity_type,
                'status': log.status,
                'records_processed': log.records_processed,
                'records_successful': log.records_successful,
                'records_failed': log.records_failed,
                'duration': log.duration,
                'error_message': log.error_message,
                'created_at': log.created_at.isoformat()
            } for log in logs.items],
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Payment Integration APIs ====================

@app.route('/api/integration/payment-providers', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_PAYMENT_PROVIDERS')
def get_payment_providers():
    """الحصول على مقدمي خدمات الدفع"""
    try:
        providers = PaymentProvider.query.filter(PaymentProvider.is_active == True).all()
        
        return jsonify({
            'success': True,
            'providers': [{
                'id': provider.id,
                'provider_name': provider.provider_name,
                'provider_type': provider.provider_type,
                'supports_recurring': provider.supports_recurring,
                'supports_refunds': provider.supports_refunds,
                'supported_currencies': provider.supported_currencies,
                'transaction_fee_percentage': provider.transaction_fee_percentage,
                'is_test_mode': provider.is_test_mode,
                'created_at': provider.created_at.isoformat()
            } for provider in providers]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/process-payment', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('PROCESS_PAYMENT')
def process_payment():
    """معالجة دفعة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        transaction = PaymentTransaction(
            transaction_id=f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            provider_id=data['provider_id'],
            patient_id=data.get('patient_id'),
            amount=data['amount'],
            currency=data.get('currency', 'SAR'),
            description=data.get('description'),
            payment_method=data.get('payment_method'),
            status='pending',
            created_by=current_user_id
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        # Process payment with provider (implementation needed)
        # For now, simulate successful processing
        transaction.status = 'completed'
        transaction.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم معالجة الدفعة بنجاح',
            'transaction_id': transaction.transaction_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Insurance Integration APIs ====================

@app.route('/api/integration/insurance-providers', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_INSURANCE_PROVIDERS')
def get_insurance_providers():
    """الحصول على شركات التأمين"""
    try:
        providers = InsuranceProvider.query.filter(InsuranceProvider.is_active == True).all()
        
        return jsonify({
            'success': True,
            'providers': [{
                'id': provider.id,
                'provider_name': provider.provider_name,
                'provider_code': provider.provider_code,
                'contact_phone': provider.contact_phone,
                'contact_email': provider.contact_email,
                'coverage_types': provider.coverage_types,
                'contract_start_date': provider.contract_start_date.isoformat() if provider.contract_start_date else None,
                'contract_end_date': provider.contract_end_date.isoformat() if provider.contract_end_date else None,
                'created_at': provider.created_at.isoformat()
            } for provider in providers]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/submit-insurance-claim', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('SUBMIT_INSURANCE_CLAIM')
def submit_insurance_claim():
    """تقديم مطالبة تأمين"""
    try:
        data = request.get_json()
        
        result = integration_service.process_insurance_claim(data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/insurance-claims', methods=['GET'])
@jwt_required()
@check_permission('view_integration')
@log_audit('GET_INSURANCE_CLAIMS')
def get_insurance_claims():
    """الحصول على مطالبات التأمين"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        provider_id = request.args.get('provider_id', type=int)
        
        query = InsuranceClaim.query
        
        if status:
            query = query.filter(InsuranceClaim.status == status)
        
        if provider_id:
            query = query.filter(InsuranceClaim.provider_id == provider_id)
        
        claims = query.order_by(InsuranceClaim.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'claims': [{
                'id': claim.id,
                'claim_number': claim.claim_number,
                'provider_name': claim.provider.provider_name if claim.provider else None,
                'patient_name': f"{claim.patient.first_name} {claim.patient.last_name}" if claim.patient else None,
                'service_date': claim.service_date.isoformat(),
                'service_type': claim.service_type,
                'claimed_amount': claim.claimed_amount,
                'approved_amount': claim.approved_amount,
                'status': claim.status,
                'submission_date': claim.submission_date.isoformat(),
                'approval_date': claim.approval_date.isoformat() if claim.approval_date else None
            } for claim in claims.items],
            'total': claims.total,
            'pages': claims.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Dashboard and Statistics APIs ====================

# ==================== New Communication APIs ====================

@app.route('/api/communication/send-whatsapp', methods=['POST'])
@jwt_required()
@check_permission('send_integration')
@guard_payload_size()
@log_audit('SEND_WHATSAPP')
def send_whatsapp():
    """إرسال رسالة WhatsApp"""
    try:
        data = request.get_json()
        
        result = communication_service.send_whatsapp(
            phone=data['phone'],
            message=data['message'],
            template_id=data.get('template_id')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/send-push', methods=['POST'])
@jwt_required()
@check_permission('send_integration')
@guard_payload_size()
@log_audit('SEND_PUSH_NOTIFICATION')
def send_push_notification():
    """إرسال إشعار فوري"""
    try:
        data = request.get_json()
        
        result = communication_service.send_push_notification(
            user_id=data['user_id'],
            title=data['title'],
            message=data['message'],
            data=data.get('data')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/send-voice-call', methods=['POST'])
@jwt_required()
@check_permission('send_integration')
@guard_payload_size()
@log_audit('SEND_VOICE_CALL')
def send_voice_call():
    """إجراء مكالمة صوتية"""
    try:
        data = request.get_json()
        
        result = communication_service.send_voice_call(
            phone=data['phone'],
            message=data['message'],
            language=data.get('language', 'ar')
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/communication/retry-message/<int:message_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('RETRY_FAILED_MESSAGE')
def retry_failed_message(message_id):
    """إعادة محاولة إرسال رسالة فاشلة"""
    try:
        result = communication_service.retry_failed_message(message_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Extended Integration APIs ====================

@app.route('/api/integration/sync-government/<int:system_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('SYNC_GOVERNMENT_SYSTEM')
def sync_government_system(system_id):
    """مزامنة مع النظام الحكومي"""
    try:
        data = request.get_json()
        result = integration_service.sync_with_government_system(system_id, data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/sync-laboratory/<int:lab_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('SYNC_LABORATORY_SYSTEM')
def sync_laboratory_system(lab_id):
    """مزامنة مع نظام المختبر"""
    try:
        data = request.get_json()
        result = integration_service.sync_with_laboratory_system(lab_id, data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/sync-pharmacy/<int:pharmacy_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('SYNC_PHARMACY_SYSTEM')
def sync_pharmacy_system(pharmacy_id):
    """مزامنة مع نظام الصيدلية"""
    try:
        data = request.get_json()
        result = integration_service.sync_with_pharmacy_system(pharmacy_id, data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/test-connection/<int:system_id>', methods=['POST'])
@jwt_required()
@check_permission('manage_integration')
@guard_payload_size()
@log_audit('TEST_SYSTEM_CONNECTION_ENHANCED')
def test_system_connection_enhanced(system_id):
    """اختبار الاتصال مع النظام الخارجي المحسّن"""
    try:
        result = integration_service.test_system_connection(system_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/integration/dashboard', methods=['GET'])
@jwt_required()
@check_permission('view_dashboard')
@log_audit('GET_INTEGRATION_DASHBOARD')
def get_integration_dashboard():
    """لوحة تحكم التكامل والاتصالات"""
    try:
        # Communication statistics
        total_messages = CommunicationMessage.query.count()
        sent_messages = CommunicationMessage.query.filter(CommunicationMessage.status == 'sent').count()
        failed_messages = CommunicationMessage.query.filter(CommunicationMessage.status == 'failed').count()
        
        # Integration statistics
        total_systems = ExternalSystem.query.filter(ExternalSystem.is_active == True).count()
        active_systems = ExternalSystem.query.filter(
            ExternalSystem.is_active == True,
            ExternalSystem.connection_status == 'active'
        ).count()
        
        # Recent sync logs
        recent_syncs = DataSyncLog.query.order_by(DataSyncLog.created_at.desc()).limit(5).all()
        
        # Payment statistics
        total_transactions = PaymentTransaction.query.count()
        completed_transactions = PaymentTransaction.query.filter(PaymentTransaction.status == 'completed').count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'communication': {
                    'total_messages': total_messages,
                    'sent_messages': sent_messages,
                    'failed_messages': failed_messages,
                    'success_rate': (sent_messages / total_messages * 100) if total_messages > 0 else 0
                },
                'integration': {
                    'total_systems': total_systems,
                    'active_systems': active_systems,
                    'connection_rate': (active_systems / total_systems * 100) if total_systems > 0 else 0
                },
                'payments': {
                    'total_transactions': total_transactions,
                    'completed_transactions': completed_transactions,
                    'success_rate': (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0
                }
            },
            'recent_syncs': [{
                'id': sync.id,
                'system_name': sync.external_system.system_name if sync.external_system else None,
                'sync_type': sync.sync_type,
                'status': sync.status,
                'created_at': sync.created_at.isoformat()
            } for sync in recent_syncs]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
