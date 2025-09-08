#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API endpoints لنظام السجلات التجارية والرخص والإقامات والوثائق
API endpoints for business records, licenses, residencies and documents system
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
import json
import os
from werkzeug.utils import secure_filename

from app import db
from documents_licenses_models import (
    Document, DocumentCategory, DocumentReminder, DocumentRenewal,
    DocumentAttachment, BusinessEntity, VehicleDocument, EmployeeDocument,
    DocumentAlert, DocumentAuditLog, DocumentType, DocumentStatus,
    ReminderType, ReminderStatus, EntityType
)

# إنشاء Blueprint
documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')

# مساعدات عامة
def log_document_action(document_id, action, description=None, old_values=None, new_values=None):
    """تسجيل عملية في سجل المراجعة"""
    try:
        user_id = get_jwt_identity()
        log_entry = DocumentAuditLog(
            document_id=document_id,
            action=action,
            description=description,
            old_values=old_values,
            new_values=new_values,
            user_id=user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:500]
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Error logging document action: {str(e)}")

# إدارة فئات الوثائق
@documents_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_document_categories():
    """الحصول على قائمة فئات الوثائق"""
    try:
        categories = DocumentCategory.query.filter_by(is_active=True).order_by(DocumentCategory.sort_order).all()
        
        result = []
        for category in categories:
            result.append({
                'id': category.id,
                'name': category.name,
                'name_en': category.name_en,
                'description': category.description,
                'icon': category.icon,
                'color': category.color,
                'document_count': category.documents.count()
            })
        
        return jsonify({
            'success': True,
            'categories': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب فئات الوثائق: {str(e)}'
        }), 500

@documents_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_document_category():
    """إنشاء فئة وثائق جديدة"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        category = DocumentCategory(
            name=data.get('name'),
            name_en=data.get('name_en'),
            description=data.get('description'),
            icon=data.get('icon'),
            color=data.get('color'),
            sort_order=data.get('sort_order', 0),
            created_by=user_id
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء فئة الوثائق بنجاح',
            'category_id': category.id
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء فئة الوثائق: {str(e)}'
        }), 500

# إدارة الوثائق الأساسية
@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    """الحصول على قائمة الوثائق مع الفلترة والبحث"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # فلاتر البحث
        search = request.args.get('search', '').strip()
        document_type = request.args.get('document_type')
        status = request.args.get('status')
        entity_type = request.args.get('entity_type')
        category_id = request.args.get('category_id', type=int)
        expiring_soon = request.args.get('expiring_soon', type=bool)
        expired = request.args.get('expired', type=bool)
        
        # بناء الاستعلام
        query = Document.query
        
        # البحث النصي
        if search:
            search_filter = or_(
                Document.title.contains(search),
                Document.document_number.contains(search),
                Document.entity_name.contains(search),
                Document.issuing_authority.contains(search)
            )
            query = query.filter(search_filter)
        
        # فلترة حسب النوع
        if document_type:
            query = query.filter(Document.document_type == document_type)
        
        # فلترة حسب الحالة
        if status:
            query = query.filter(Document.status == status)
        
        # فلترة حسب نوع الكيان
        if entity_type:
            query = query.filter(Document.entity_type == entity_type)
        
        # فلترة حسب الفئة
        if category_id:
            query = query.filter(Document.category_id == category_id)
        
        # فلترة الوثائق المنتهية الصلاحية قريباً
        if expiring_soon:
            soon_date = datetime.now().date() + timedelta(days=30)
            query = query.filter(
                and_(
                    Document.expiry_date <= soon_date,
                    Document.expiry_date >= datetime.now().date()
                )
            )
        
        # فلترة الوثائق المنتهية الصلاحية
        if expired:
            query = query.filter(Document.expiry_date < datetime.now().date())
        
        # ترتيب النتائج
        sort_by = request.args.get('sort_by', 'expiry_date')
        sort_order = request.args.get('sort_order', 'asc')
        
        if sort_order == 'desc':
            query = query.order_by(desc(getattr(Document, sort_by)))
        else:
            query = query.order_by(getattr(Document, sort_by))
        
        # تنفيذ الاستعلام مع الترقيم
        documents = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        for doc in documents.items:
            result.append({
                'id': doc.id,
                'document_number': doc.document_number,
                'document_type': doc.document_type.value,
                'document_type_display': doc.get_type_display(),
                'title': doc.title,
                'entity_type': doc.entity_type.value,
                'entity_name': doc.entity_name,
                'issue_date': doc.issue_date.isoformat() if doc.issue_date else None,
                'expiry_date': doc.expiry_date.isoformat() if doc.expiry_date else None,
                'days_until_expiry': doc.days_until_expiry,
                'status': doc.status.value,
                'status_display': doc.get_status_display(),
                'is_expired': doc.is_expired,
                'is_expiring_soon': doc.is_expiring_soon(),
                'issuing_authority': doc.issuing_authority,
                'priority': doc.priority,
                'category': {
                    'id': doc.category.id,
                    'name': doc.category.name
                } if doc.category else None,
                'has_file': bool(doc.file_path),
                'reminder_enabled': doc.reminder_enabled,
                'created_at': doc.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'documents': result,
            'pagination': {
                'page': documents.page,
                'pages': documents.pages,
                'per_page': documents.per_page,
                'total': documents.total,
                'has_next': documents.has_next,
                'has_prev': documents.has_prev
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب الوثائق: {str(e)}'
        }), 500

@documents_bp.route('/', methods=['POST'])
@jwt_required()
def create_document():
    """إنشاء وثيقة جديدة"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['document_number', 'document_type', 'title', 'entity_type', 'entity_id', 'issue_date', 'expiry_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400
        
        # التحقق من عدم تكرار رقم الوثيقة
        existing = Document.query.filter_by(document_number=data['document_number']).first()
        if existing:
            return jsonify({
                'success': False,
                'message': 'رقم الوثيقة موجود مسبقاً'
            }), 400
        
        # إنشاء الوثيقة
        document = Document(
            document_number=data['document_number'],
            document_type=DocumentType(data['document_type']),
            title=data['title'],
            description=data.get('description'),
            entity_type=EntityType(data['entity_type']),
            entity_id=data['entity_id'],
            entity_name=data.get('entity_name'),
            category_id=data.get('category_id'),
            issue_date=datetime.strptime(data['issue_date'], '%Y-%m-%d').date(),
            expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date(),
            issuing_authority=data.get('issuing_authority'),
            issuing_authority_en=data.get('issuing_authority_en'),
            issuing_location=data.get('issuing_location'),
            cost=data.get('cost'),
            currency=data.get('currency', 'SAR'),
            notes=data.get('notes'),
            tags=data.get('tags'),
            priority=data.get('priority', 1),
            reminder_enabled=data.get('reminder_enabled', True),
            reminder_days_before=data.get('reminder_days_before', [30, 15, 7, 1]),
            created_by=user_id
        )
        
        db.session.add(document)
        db.session.flush()
        
        # تسجيل العملية
        log_document_action(document.id, 'create', 'تم إنشاء وثيقة جديدة')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الوثيقة بنجاح',
            'document_id': document.id
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'خطأ في إنشاء الوثيقة: {str(e)}'
        }), 500

@documents_bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document_details(document_id):
    """الحصول على تفاصيل وثيقة محددة"""
    try:
        document = Document.query.options(
            joinedload(Document.category),
            joinedload(Document.attachments),
            joinedload(Document.renewals),
            joinedload(Document.reminders)
        ).get_or_404(document_id)
        
        # تسجيل عملية العرض
        log_document_action(document_id, 'view', 'تم عرض تفاصيل الوثيقة')
        
        result = {
            'id': document.id,
            'document_number': document.document_number,
            'document_type': document.document_type.value,
            'document_type_display': document.get_type_display(),
            'title': document.title,
            'description': document.description,
            'entity_type': document.entity_type.value,
            'entity_id': document.entity_id,
            'entity_name': document.entity_name,
            'category': {
                'id': document.category.id,
                'name': document.category.name,
                'icon': document.category.icon,
                'color': document.category.color
            } if document.category else None,
            'issue_date': document.issue_date.isoformat() if document.issue_date else None,
            'expiry_date': document.expiry_date.isoformat() if document.expiry_date else None,
            'renewal_date': document.renewal_date.isoformat() if document.renewal_date else None,
            'days_until_expiry': document.days_until_expiry,
            'status': document.status.value,
            'status_display': document.get_status_display(),
            'is_expired': document.is_expired,
            'is_expiring_soon': document.is_expiring_soon(),
            'priority': document.priority,
            'issuing_authority': document.issuing_authority,
            'issuing_authority_en': document.issuing_authority_en,
            'issuing_location': document.issuing_location,
            'cost': float(document.cost) if document.cost else None,
            'currency': document.currency,
            'notes': document.notes,
            'tags': document.tags,
            'file_path': document.file_path,
            'file_name': document.file_name,
            'file_size': document.file_size,
            'reminder_enabled': document.reminder_enabled,
            'reminder_days_before': document.reminder_days_before,
            'attachments': [{
                'id': att.id,
                'file_name': att.file_name,
                'original_name': att.original_name,
                'file_size': att.file_size,
                'file_type': att.file_type,
                'attachment_type': att.attachment_type,
                'title': att.title,
                'uploaded_at': att.uploaded_at.isoformat()
            } for att in document.attachments],
            'renewals': [{
                'id': ren.id,
                'renewal_date': ren.renewal_date.isoformat(),
                'previous_expiry_date': ren.previous_expiry_date.isoformat(),
                'new_expiry_date': ren.new_expiry_date.isoformat(),
                'renewal_cost': float(ren.renewal_cost) if ren.renewal_cost else None,
                'renewed_by_authority': ren.renewed_by_authority
            } for ren in document.renewals],
            'active_reminders': [{
                'id': rem.id,
                'reminder_type': rem.reminder_type.value,
                'days_before': rem.days_before,
                'reminder_date': rem.reminder_date.isoformat(),
                'status': rem.status.value
            } for rem in document.reminders.filter_by(status=ReminderStatus.PENDING)],
            'created_at': document.created_at.isoformat(),
            'updated_at': document.updated_at.isoformat()
        }
        
        return jsonify({
            'success': True,
            'document': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب تفاصيل الوثيقة: {str(e)}'
        }), 500

# إدارة التذكيرات
@documents_bp.route('/reminders', methods=['GET'])
@jwt_required()
def get_document_reminders():
    """الحصول على قائمة التذكيرات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        
        query = DocumentReminder.query.join(Document)
        
        if status:
            query = query.filter(DocumentReminder.status == status)
        
        reminders = query.order_by(DocumentReminder.reminder_date).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        for reminder in reminders.items:
            result.append({
                'id': reminder.id,
                'document': {
                    'id': reminder.document.id,
                    'title': reminder.document.title,
                    'document_number': reminder.document.document_number,
                    'expiry_date': reminder.document.expiry_date.isoformat()
                },
                'reminder_type': reminder.reminder_type.value,
                'days_before': reminder.days_before,
                'reminder_date': reminder.reminder_date.isoformat(),
                'status': reminder.status.value,
                'sent_at': reminder.sent_at.isoformat() if reminder.sent_at else None,
                'delivery_attempts': reminder.delivery_attempts
            })
        
        return jsonify({
            'success': True,
            'reminders': result,
            'pagination': {
                'page': reminders.page,
                'pages': reminders.pages,
                'total': reminders.total
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب التذكيرات: {str(e)}'
        }), 500

# لوحة التحكم والإحصائيات
@documents_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_documents_dashboard():
    """الحصول على إحصائيات لوحة التحكل للوثائق"""
    try:
        today = datetime.now().date()
        next_30_days = today + timedelta(days=30)
        
        # الإحصائيات الأساسية
        total_documents = Document.query.count()
        active_documents = Document.query.filter_by(status=DocumentStatus.ACTIVE).count()
        expired_documents = Document.query.filter(Document.expiry_date < today).count()
        expiring_soon = Document.query.filter(
            and_(Document.expiry_date >= today, Document.expiry_date <= next_30_days)
        ).count()
        
        # الوثائق حسب النوع
        documents_by_type = db.session.query(
            Document.document_type,
            func.count(Document.id).label('count')
        ).group_by(Document.document_type).all()
        
        type_stats = []
        for doc_type, count in documents_by_type:
            type_stats.append({
                'type': doc_type.value,
                'type_display': Document(document_type=doc_type).get_type_display(),
                'count': count
            })
        
        # الوثائق حسب الحالة
        documents_by_status = db.session.query(
            Document.status,
            func.count(Document.id).label('count')
        ).group_by(Document.status).all()
        
        status_stats = []
        for status, count in documents_by_status:
            status_stats.append({
                'status': status.value,
                'status_display': Document(status=status).get_status_display(),
                'count': count
            })
        
        # التذكيرات المعلقة
        pending_reminders = DocumentReminder.query.filter_by(
            status=ReminderStatus.PENDING
        ).count()
        
        # الوثائق الأكثر أولوية المنتهية قريباً
        urgent_documents = Document.query.filter(
            and_(
                Document.expiry_date >= today,
                Document.expiry_date <= next_30_days,
                Document.priority >= 2
            )
        ).order_by(Document.expiry_date, desc(Document.priority)).limit(10).all()
        
        urgent_list = []
        for doc in urgent_documents:
            urgent_list.append({
                'id': doc.id,
                'title': doc.title,
                'document_number': doc.document_number,
                'expiry_date': doc.expiry_date.isoformat(),
                'days_until_expiry': doc.days_until_expiry,
                'priority': doc.priority,
                'document_type_display': doc.get_type_display()
            })
        
        return jsonify({
            'success': True,
            'dashboard': {
                'summary': {
                    'total_documents': total_documents,
                    'active_documents': active_documents,
                    'expired_documents': expired_documents,
                    'expiring_soon': expiring_soon,
                    'pending_reminders': pending_reminders
                },
                'documents_by_type': type_stats,
                'documents_by_status': status_stats,
                'urgent_documents': urgent_list
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في جلب إحصائيات لوحة التحكم: {str(e)}'
        }), 500

# ===== إدارة ملفات الوثائق =====

# رفع ملف للوثيقة
@documents_bp.route('/api/documents/<int:document_id>/upload', methods=['POST'])
@jwt_required()
def upload_document_file(document_id):
    """رفع ملف للوثيقة"""
    try:
        current_user = get_jwt_identity()
        
        # التحقق من وجود الوثيقة
        document = Document.query.get_or_404(document_id)
        
        # التحقق من وجود الملف
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف'}), 400
        
        # التحقق من نوع الملف
        allowed_extensions = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'success': False, 'message': 'نوع الملف غير مدعوم'}), 400
        
        # إنشاء مجلد الرفع إذا لم يكن موجوداً
        upload_folder = os.path.join(current_app.root_path, 'uploads', 'documents')
        os.makedirs(upload_folder, exist_ok=True)
        
        # إنشاء اسم ملف فريد
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{document_id}_{timestamp}_{filename}"
        file_path = os.path.join(upload_folder, unique_filename)
        
        # حفظ الملف
        file.save(file_path)
        
        # حساب حجم الملف
        file_size = os.path.getsize(file_path)
        
        # إنشاء سجل المرفق
        attachment = DocumentAttachment(
            document_id=document_id,
            filename=filename,
            file_path=f'uploads/documents/{unique_filename}',
            file_size=file_size,
            file_type=file.content_type,
            uploaded_by=current_user['id'],
            description=request.form.get('description', ''),
            is_primary=request.form.get('is_primary', 'false').lower() == 'true'
        )
        
        db.session.add(attachment)
        
        # إضافة سجل مراجعة
        audit_log = DocumentAuditLog(
            document_id=document_id,
            action='upload',
            description=f'تم رفع ملف: {filename}',
            new_values={'filename': filename, 'file_size': file_size},
            user_id=current_user['id'],
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم رفع الملف بنجاح',
            'attachment': {
                'id': attachment.id,
                'filename': attachment.filename,
                'file_size': attachment.file_size,
                'file_type': attachment.file_type,
                'upload_date': attachment.upload_date.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في رفع الملف: {str(e)}'}), 500

# عرض مرفقات الوثيقة
@documents_bp.route('/api/documents/<int:document_id>/attachments', methods=['GET'])
@jwt_required()
def get_document_attachments(document_id):
    """عرض مرفقات الوثيقة"""
    try:
        current_user = get_jwt_identity()
        
        # التحقق من وجود الوثيقة
        document = Document.query.get_or_404(document_id)
        
        # جلب المرفقات
        attachments = DocumentAttachment.query.filter_by(
            document_id=document_id,
            is_deleted=False
        ).order_by(DocumentAttachment.is_primary.desc(), DocumentAttachment.upload_date.desc()).all()
        
        attachments_data = []
        for attachment in attachments:
            attachments_data.append({
                'id': attachment.id,
                'filename': attachment.filename,
                'file_size': attachment.file_size,
                'file_type': attachment.file_type,
                'description': attachment.description,
                'is_primary': attachment.is_primary,
                'upload_date': attachment.upload_date.isoformat(),
                'uploaded_by_name': 'المستخدم'
            })
        
        return jsonify({
            'success': True,
            'attachments': attachments_data
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في جلب المرفقات: {str(e)}'}), 500

# تحميل ملف الوثيقة
@documents_bp.route('/api/documents/attachments/<int:attachment_id>/download', methods=['GET'])
@jwt_required()
def download_document_attachment(attachment_id):
    """تحميل ملف الوثيقة"""
    try:
        current_user = get_jwt_identity()
        
        # جلب المرفق
        attachment = DocumentAttachment.query.get_or_404(attachment_id)
        
        # التحقق من وجود الملف
        file_path = os.path.join(current_app.root_path, attachment.file_path)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': 'الملف غير موجود'}), 404
        
        # إضافة سجل مراجعة
        audit_log = DocumentAuditLog(
            document_id=attachment.document_id,
            action='download',
            description=f'تم تحميل ملف: {attachment.filename}',
            user_id=current_user['id'],
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        db.session.commit()
        
        from flask import send_file
        return send_file(file_path, as_attachment=True, download_name=attachment.filename)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في تحميل الملف: {str(e)}'}), 500

# حذف مرفق الوثيقة
@documents_bp.route('/api/documents/attachments/<int:attachment_id>', methods=['DELETE'])
@jwt_required()
def delete_document_attachment(attachment_id):
    """حذف مرفق الوثيقة"""
    try:
        current_user = get_jwt_identity()
        
        # جلب المرفق
        attachment = DocumentAttachment.query.get_or_404(attachment_id)
        
        # حذف الملف من النظام
        file_path = os.path.join(current_app.root_path, attachment.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # تحديث حالة المرفق
        attachment.is_deleted = True
        attachment.deleted_at = datetime.utcnow()
        
        # إضافة سجل مراجعة
        audit_log = DocumentAuditLog(
            document_id=attachment.document_id,
            action='delete_attachment',
            description=f'تم حذف ملف: {attachment.filename}',
            user_id=current_user['id'],
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف المرفق بنجاح'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'خطأ في حذف المرفق: {str(e)}'}), 500

# ===== التقارير والإحصائيات =====

# تقرير الوثائق المنتهية الصلاحية
@documents_bp.route('/api/documents/reports/expired', methods=['GET'])
@jwt_required()
def get_expired_documents_report():
    """تقرير الوثائق المنتهية الصلاحية"""
    try:
        current_user = get_jwt_identity()
        
        # جلب الوثائق المنتهية الصلاحية
        expired_documents = Document.query.filter(
            Document.expiry_date < datetime.now().date()
        ).order_by(Document.expiry_date.desc()).all()
        
        report_data = []
        for doc in expired_documents:
            days_expired = (datetime.now().date() - doc.expiry_date).days
            report_data.append({
                'id': doc.id,
                'document_number': doc.document_number,
                'title': doc.title,
                'document_type': doc.get_type_display(),
                'entity_name': doc.entity_name,
                'expiry_date': doc.expiry_date.isoformat(),
                'days_expired': days_expired,
                'issuing_authority': doc.issuing_authority,
                'status': doc.get_status_display(),
                'priority': doc.priority
            })
        
        return jsonify({
            'success': True,
            'report': {
                'title': 'تقرير الوثائق المنتهية الصلاحية',
                'generated_at': datetime.now().isoformat(),
                'total_count': len(report_data),
                'documents': report_data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء التقرير: {str(e)}'}), 500

# تقرير الوثائق التي تنتهي قريباً
@documents_bp.route('/api/documents/reports/expiring-soon', methods=['GET'])
@jwt_required()
def get_expiring_soon_documents_report():
    """تقرير الوثائق التي تنتهي صلاحيتها قريباً"""
    try:
        current_user = get_jwt_identity()
        
        # تحديد الفترة (30 يوم قادم)
        days_ahead = request.args.get('days', 30, type=int)
        future_date = datetime.now().date() + timedelta(days=days_ahead)
        
        # جلب الوثائق التي تنتهي قريباً
        expiring_documents = Document.query.filter(
            Document.expiry_date.between(datetime.now().date(), future_date)
        ).order_by(Document.expiry_date.asc()).all()
        
        report_data = []
        for doc in expiring_documents:
            days_remaining = (doc.expiry_date - datetime.now().date()).days
            urgency = 'عاجل' if days_remaining <= 7 else 'مهم' if days_remaining <= 15 else 'عادي'
            
            report_data.append({
                'id': doc.id,
                'document_number': doc.document_number,
                'title': doc.title,
                'document_type': doc.get_type_display(),
                'entity_name': doc.entity_name,
                'expiry_date': doc.expiry_date.isoformat(),
                'days_remaining': days_remaining,
                'urgency': urgency,
                'issuing_authority': doc.issuing_authority,
                'status': doc.get_status_display(),
                'priority': doc.priority
            })
        
        return jsonify({
            'success': True,
            'report': {
                'title': f'تقرير الوثائق التي تنتهي خلال {days_ahead} يوم',
                'generated_at': datetime.now().isoformat(),
                'period_days': days_ahead,
                'total_count': len(report_data),
                'documents': report_data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء التقرير: {str(e)}'}), 500

# تقرير إحصائيات الوثائق حسب النوع
@documents_bp.route('/api/documents/reports/statistics', methods=['GET'])
@jwt_required()
def get_documents_statistics_report():
    """تقرير إحصائيات الوثائق الشامل"""
    try:
        current_user = get_jwt_identity()
        
        # إحصائيات حسب النوع
        type_stats = {}
        for doc_type in DocumentType:
            count = Document.query.filter_by(document_type=doc_type).count()
            if count > 0:
                type_stats[doc_type.value] = {
                    'name': Document(document_type=doc_type).get_type_display(),
                    'count': count
                }
        
        # إحصائيات حسب الحالة
        status_stats = {}
        for status in DocumentStatus:
            count = Document.query.filter_by(status=status).count()
            if count > 0:
                status_stats[status.value] = {
                    'name': Document(status=status).get_status_display(),
                    'count': count
                }
        
        # إحصائيات حسب الكيان
        entity_stats = db.session.query(
            Document.entity_type,
            func.count(Document.id).label('count')
        ).group_by(Document.entity_type).all()
        
        entity_data = {}
        for entity_type, count in entity_stats:
            entity_data[entity_type] = count
        
        # إحصائيات حسب السلطة المصدرة
        authority_stats = db.session.query(
            Document.issuing_authority,
            func.count(Document.id).label('count')
        ).group_by(Document.issuing_authority).order_by(func.count(Document.id).desc()).limit(10).all()
        
        authority_data = []
        for authority, count in authority_stats:
            authority_data.append({
                'authority': authority,
                'count': count
            })
        
        # إحصائيات التكاليف
        total_cost = db.session.query(func.sum(Document.cost)).scalar() or 0
        avg_cost = db.session.query(func.avg(Document.cost)).scalar() or 0
        
        return jsonify({
            'success': True,
            'report': {
                'title': 'تقرير إحصائيات الوثائق الشامل',
                'generated_at': datetime.now().isoformat(),
                'summary': {
                    'total_documents': Document.query.count(),
                    'total_cost': float(total_cost),
                    'average_cost': float(avg_cost),
                    'total_categories': DocumentCategory.query.count()
                },
                'by_type': type_stats,
                'by_status': status_stats,
                'by_entity': entity_data,
                'top_authorities': authority_data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في إنشاء التقرير: {str(e)}'}), 500

# تصدير تقرير إلى Excel
@documents_bp.route('/api/documents/reports/export', methods=['POST'])
@jwt_required()
def export_documents_report():
    """تصدير تقرير الوثائق إلى Excel"""
    try:
        current_user = get_jwt_identity()
        
        # جلب معايير التصدير
        data = request.get_json()
        report_type = data.get('report_type', 'all')
        filters = data.get('filters', {})
        
        # بناء الاستعلام
        query = Document.query
        
        if report_type == 'expired':
            query = query.filter(Document.expiry_date < datetime.now().date())
        elif report_type == 'expiring_soon':
            days_ahead = filters.get('days_ahead', 30)
            future_date = datetime.now().date() + timedelta(days=days_ahead)
            query = query.filter(Document.expiry_date.between(datetime.now().date(), future_date))
        
        # تطبيق فلاتر إضافية
        if filters.get('document_type'):
            query = query.filter(Document.document_type == filters['document_type'])
        if filters.get('status'):
            query = query.filter(Document.status == filters['status'])
        if filters.get('entity_type'):
            query = query.filter(Document.entity_type == filters['entity_type'])
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        # إنشاء بيانات التصدير
        export_data = []
        for doc in documents:
            export_data.append({
                'رقم الوثيقة': doc.document_number,
                'العنوان': doc.title,
                'نوع الوثيقة': doc.get_type_display(),
                'اسم الكيان': doc.entity_name,
                'تاريخ الإصدار': doc.issue_date.isoformat() if doc.issue_date else '',
                'تاريخ الانتهاء': doc.expiry_date.isoformat() if doc.expiry_date else '',
                'الجهة المصدرة': doc.issuing_authority,
                'الحالة': doc.get_status_display(),
                'التكلفة': doc.cost,
                'الملاحظات': doc.notes
            })
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقرير بنجاح',
            'data': export_data,
            'total_records': len(export_data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في تصدير التقرير: {str(e)}'}), 500
