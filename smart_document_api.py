#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Smart Document Management API
Advanced document management with AI-powered features
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
import hashlib
import mimetypes
import json
from PIL import Image
import pytesseract
import textract
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from smart_document_models import (
    db, SmartDocument, DocumentVersion, DocumentAccessLog, DocumentAIAnalysis,
    DocumentCategory, DocumentTemplate, DocumentWorkflow, DocumentShare,
    DocumentComment, DocumentAnalytics, DocumentType, DocumentStatus,
    AccessLevel, DocumentPriority, AIProcessingStatus
)

smart_document_bp = Blueprint('smart_document', __name__)

# AI Processing Service
class DocumentAIService:
    """AI service for document processing"""
    
    @staticmethod
    def extract_text_from_image(file_path):
        """Extract text from image using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image, lang='ara+eng')
            return text.strip()
        except Exception as e:
            return f"OCR Error: {str(e)}"
    
    @staticmethod
    def extract_text_from_document(file_path):
        """Extract text from various document formats"""
        try:
            text = textract.process(file_path).decode('utf-8')
            return text.strip()
        except Exception as e:
            return f"Text extraction error: {str(e)}"
    
    @staticmethod
    def analyze_sentiment(text):
        """Analyze sentiment of text (mock implementation)"""
        # This would integrate with actual NLP service
        positive_words = ['جيد', 'ممتاز', 'رائع', 'good', 'excellent', 'great']
        negative_words = ['سيء', 'ضعيف', 'bad', 'poor', 'terrible']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 0.7 + (positive_count * 0.1)
        elif negative_count > positive_count:
            return 0.3 - (negative_count * 0.1)
        else:
            return 0.5
    
    @staticmethod
    def extract_keywords(text):
        """Extract keywords from text (mock implementation)"""
        # This would integrate with actual NLP service
        common_words = ['في', 'من', 'إلى', 'على', 'the', 'and', 'or', 'but']
        words = text.split()
        keywords = [word for word in words if len(word) > 3 and word.lower() not in common_words]
        return list(set(keywords[:20]))  # Return top 20 unique keywords
    
    @staticmethod
    def detect_entities(text):
        """Detect named entities (mock implementation)"""
        # This would integrate with actual NER service
        entities = {
            'persons': [],
            'organizations': ['مراكز الأوائل', 'Al-Awael Centers'],
            'locations': [],
            'dates': []
        }
        return entities

@smart_document_bp.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    """Get documents with filtering and pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filters
        document_type = request.args.get('type')
        status = request.args.get('status')
        category = request.args.get('category')
        search = request.args.get('search')
        beneficiary_id = request.args.get('beneficiary_id', type=int)
        
        # Build query
        query = SmartDocument.query
        
        if document_type:
            query = query.filter(SmartDocument.document_type == document_type)
        if status:
            query = query.filter(SmartDocument.status == status)
        if beneficiary_id:
            query = query.filter(SmartDocument.beneficiary_id == beneficiary_id)
        if search:
            search_filter = or_(
                SmartDocument.title.contains(search),
                SmartDocument.description.contains(search),
                SmartDocument.ai_extracted_text.contains(search)
            )
            query = query.filter(search_filter)
        
        # Execute query with pagination
        documents = query.order_by(desc(SmartDocument.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format response
        result = {
            'documents': [{
                'id': doc.id,
                'uuid': doc.document_uuid,
                'title': doc.title,
                'description': doc.description,
                'type': doc.document_type.value,
                'status': doc.status.value,
                'priority': doc.priority.value,
                'access_level': doc.access_level.value,
                'file_name': doc.file_name,
                'file_size': doc.file_size,
                'mime_type': doc.mime_type,
                'ai_summary': doc.ai_summary,
                'ai_keywords': doc.ai_keywords,
                'ai_confidence_score': doc.ai_confidence_score,
                'version_number': doc.version_number,
                'created_at': doc.created_at.isoformat(),
                'updated_at': doc.updated_at.isoformat(),
                'beneficiary_id': doc.beneficiary_id
            } for doc in documents.items],
            'pagination': {
                'page': documents.page,
                'pages': documents.pages,
                'per_page': documents.per_page,
                'total': documents.total,
                'has_next': documents.has_next,
                'has_prev': documents.has_prev
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الوثائق: {str(e)}'}), 500

@smart_document_bp.route('/documents/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """Upload new document with AI processing"""
    try:
        user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'لم يتم تحديد ملف'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'لم يتم اختيار ملف'}), 400
        
        # Get form data
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        document_type = request.form.get('type', DocumentType.ADMINISTRATIVE.value)
        priority = request.form.get('priority', DocumentPriority.MEDIUM.value)
        access_level = request.form.get('access_level', AccessLevel.INTERNAL.value)
        beneficiary_id = request.form.get('beneficiary_id', type=int)
        tags = request.form.get('tags', '').split(',') if request.form.get('tags') else []
        
        # Secure filename and create path
        filename = secure_filename(file.filename)
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'documents')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Calculate file hash
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        
        # Get file info
        file_size = os.path.getsize(file_path)
        mime_type = mimetypes.guess_type(file_path)[0]
        
        # Create document record
        document = SmartDocument(
            title=title,
            description=description,
            document_type=DocumentType(document_type),
            priority=DocumentPriority(priority),
            access_level=AccessLevel(access_level),
            file_name=filename,
            file_path=file_path,
            file_size=file_size,
            file_hash=file_hash,
            mime_type=mime_type,
            beneficiary_id=beneficiary_id,
            created_by_id=user_id,
            tags=tags,
            ai_processing_status=AIProcessingStatus.PENDING
        )
        
        db.session.add(document)
        db.session.commit()
        
        # Start AI processing asynchronously
        process_document_ai.delay(document.id)
        
        return jsonify({
            'message': 'تم رفع الوثيقة بنجاح',
            'document_id': document.id,
            'uuid': document.document_uuid
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'خطأ في رفع الوثيقة: {str(e)}'}), 500

def process_document_ai(document_id):
    """Process document with AI (would be async task)"""
    try:
        document = SmartDocument.query.get(document_id)
        if not document:
            return
        
        document.ai_processing_status = AIProcessingStatus.PROCESSING
        db.session.commit()
        
        ai_service = DocumentAIService()
        
        # Extract text based on file type
        if document.mime_type and document.mime_type.startswith('image/'):
            extracted_text = ai_service.extract_text_from_image(document.file_path)
        else:
            extracted_text = ai_service.extract_text_from_document(document.file_path)
        
        # AI analysis
        keywords = ai_service.extract_keywords(extracted_text)
        entities = ai_service.detect_entities(extracted_text)
        sentiment = ai_service.analyze_sentiment(extracted_text)
        
        # Generate summary (mock implementation)
        summary = extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
        
        # Update document with AI results
        document.ai_extracted_text = extracted_text
        document.ai_summary = summary
        document.ai_keywords = keywords
        document.ai_entities = entities
        document.ai_sentiment_score = sentiment
        document.ai_confidence_score = 0.85  # Mock confidence
        document.ai_language_detected = 'ar'
        document.ai_processing_status = AIProcessingStatus.COMPLETED
        
        # Create AI analysis record
        analysis = DocumentAIAnalysis(
            document_id=document.id,
            analysis_type='full_analysis',
            analysis_results={
                'text_extraction': True,
                'keyword_extraction': True,
                'entity_recognition': True,
                'sentiment_analysis': True
            },
            confidence_score=0.85,
            processing_time=2.5,
            model_name='alawael_nlp_v1',
            model_version='1.0',
            status=AIProcessingStatus.COMPLETED,
            completed_at=datetime.utcnow()
        )
        
        db.session.add(analysis)
        db.session.commit()
        
    except Exception as e:
        document.ai_processing_status = AIProcessingStatus.FAILED
        db.session.commit()

@smart_document_bp.route('/documents/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """Get specific document details"""
    try:
        user_id = get_jwt_identity()
        
        document = SmartDocument.query.options(
            joinedload(SmartDocument.versions),
            joinedload(SmartDocument.ai_analyses)
        ).get_or_404(document_id)
        
        # Log access
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=user_id,
            access_type='view',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        db.session.add(access_log)
        
        # Update last accessed
        document.last_accessed_at = datetime.utcnow()
        db.session.commit()
        
        result = {
            'id': document.id,
            'uuid': document.document_uuid,
            'title': document.title,
            'description': document.description,
            'type': document.document_type.value,
            'status': document.status.value,
            'priority': document.priority.value,
            'access_level': document.access_level.value,
            'file_name': document.file_name,
            'file_size': document.file_size,
            'mime_type': document.mime_type,
            'ai_processing_status': document.ai_processing_status.value,
            'ai_extracted_text': document.ai_extracted_text,
            'ai_summary': document.ai_summary,
            'ai_keywords': document.ai_keywords,
            'ai_entities': document.ai_entities,
            'ai_sentiment_score': document.ai_sentiment_score,
            'ai_confidence_score': document.ai_confidence_score,
            'tags': document.tags,
            'version_number': document.version_number,
            'created_at': document.created_at.isoformat(),
            'updated_at': document.updated_at.isoformat(),
            'beneficiary_id': document.beneficiary_id,
            'versions': [{
                'id': v.id,
                'version_number': v.version_number,
                'change_summary': v.change_summary,
                'created_at': v.created_at.isoformat()
            } for v in document.versions],
            'ai_analyses': [{
                'id': a.id,
                'analysis_type': a.analysis_type,
                'confidence_score': a.confidence_score,
                'status': a.status.value,
                'completed_at': a.completed_at.isoformat() if a.completed_at else None
            } for a in document.ai_analyses]
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الوثيقة: {str(e)}'}), 500

@smart_document_bp.route('/documents/<int:document_id>/download', methods=['GET'])
@jwt_required()
def download_document(document_id):
    """Download document file"""
    try:
        user_id = get_jwt_identity()
        
        document = SmartDocument.query.get_or_404(document_id)
        
        # Check access permissions
        # Add permission logic here
        
        # Log access
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=user_id,
            access_type='download',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        db.session.add(access_log)
        db.session.commit()
        
        return send_file(
            document.file_path,
            as_attachment=True,
            download_name=document.file_name
        )
        
    except Exception as e:
        return jsonify({'error': f'خطأ في تحميل الوثيقة: {str(e)}'}), 500

@smart_document_bp.route('/documents/<int:document_id>/ai-reprocess', methods=['POST'])
@jwt_required()
def reprocess_document_ai(document_id):
    """Reprocess document with AI"""
    try:
        document = SmartDocument.query.get_or_404(document_id)
        
        # Start AI processing
        process_document_ai(document_id)
        
        return jsonify({'message': 'تم بدء إعادة معالجة الوثيقة بالذكاء الاصطناعي'}), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في إعادة المعالجة: {str(e)}'}), 500

@smart_document_bp.route('/documents/search', methods=['POST'])
@jwt_required()
def search_documents():
    """Advanced document search with AI"""
    try:
        data = request.get_json()
        query_text = data.get('query', '')
        filters = data.get('filters', {})
        
        # Build search query
        search_query = SmartDocument.query
        
        if query_text:
            # Search in multiple fields
            search_filter = or_(
                SmartDocument.title.contains(query_text),
                SmartDocument.description.contains(query_text),
                SmartDocument.ai_extracted_text.contains(query_text),
                SmartDocument.ai_summary.contains(query_text)
            )
            search_query = search_query.filter(search_filter)
        
        # Apply filters
        if filters.get('type'):
            search_query = search_query.filter(SmartDocument.document_type == filters['type'])
        if filters.get('status'):
            search_query = search_query.filter(SmartDocument.status == filters['status'])
        if filters.get('date_from'):
            search_query = search_query.filter(SmartDocument.created_at >= filters['date_from'])
        if filters.get('date_to'):
            search_query = search_query.filter(SmartDocument.created_at <= filters['date_to'])
        
        # Execute search
        documents = search_query.order_by(desc(SmartDocument.created_at)).limit(50).all()
        
        result = {
            'documents': [{
                'id': doc.id,
                'title': doc.title,
                'description': doc.description,
                'type': doc.document_type.value,
                'ai_summary': doc.ai_summary,
                'ai_confidence_score': doc.ai_confidence_score,
                'created_at': doc.created_at.isoformat()
            } for doc in documents],
            'total_results': len(documents)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في البحث: {str(e)}'}), 500

@smart_document_bp.route('/documents/analytics', methods=['GET'])
@jwt_required()
def get_document_analytics():
    """Get document analytics and statistics"""
    try:
        # Document type distribution
        type_stats = db.session.query(
            SmartDocument.document_type,
            func.count(SmartDocument.id).label('count')
        ).group_by(SmartDocument.document_type).all()
        
        # Status distribution
        status_stats = db.session.query(
            SmartDocument.status,
            func.count(SmartDocument.id).label('count')
        ).group_by(SmartDocument.status).all()
        
        # AI processing stats
        ai_stats = db.session.query(
            SmartDocument.ai_processing_status,
            func.count(SmartDocument.id).label('count')
        ).group_by(SmartDocument.ai_processing_status).all()
        
        # Recent activity
        recent_documents = SmartDocument.query.order_by(
            desc(SmartDocument.created_at)
        ).limit(10).all()
        
        # Most accessed documents
        most_accessed = db.session.query(
            SmartDocument.id,
            SmartDocument.title,
            func.count(DocumentAccessLog.id).label('access_count')
        ).join(DocumentAccessLog).group_by(
            SmartDocument.id, SmartDocument.title
        ).order_by(desc('access_count')).limit(10).all()
        
        result = {
            'total_documents': SmartDocument.query.count(),
            'type_distribution': [
                {'type': stat[0].value, 'count': stat[1]} for stat in type_stats
            ],
            'status_distribution': [
                {'status': stat[0].value, 'count': stat[1]} for stat in status_stats
            ],
            'ai_processing_stats': [
                {'status': stat[0].value, 'count': stat[1]} for stat in ai_stats
            ],
            'recent_documents': [{
                'id': doc.id,
                'title': doc.title,
                'type': doc.document_type.value,
                'created_at': doc.created_at.isoformat()
            } for doc in recent_documents],
            'most_accessed': [{
                'id': doc[0],
                'title': doc[1],
                'access_count': doc[2]
            } for doc in most_accessed]
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الإحصائيات: {str(e)}'}), 500

@smart_document_bp.route('/documents/categories', methods=['GET'])
@jwt_required()
def get_document_categories():
    """Get document categories"""
    try:
        categories = DocumentCategory.query.filter_by(is_active=True).order_by(
            DocumentCategory.sort_order, DocumentCategory.name
        ).all()
        
        result = [{
            'id': cat.id,
            'name': cat.name,
            'name_ar': cat.name_ar,
            'description': cat.description,
            'color_code': cat.color_code,
            'icon': cat.icon,
            'parent_id': cat.parent_id
        } for cat in categories]
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب التصنيفات: {str(e)}'}), 500

@smart_document_bp.route('/documents/templates', methods=['GET'])
@jwt_required()
def get_document_templates():
    """Get document templates"""
    try:
        templates = DocumentTemplate.query.filter_by(is_active=True).all()
        
        result = [{
            'id': template.id,
            'name': template.name,
            'name_ar': template.name_ar,
            'description': template.description,
            'template_fields': template.template_fields,
            'usage_count': template.usage_count,
            'version': template.version
        } for template in templates]
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب القوالب: {str(e)}'}), 500
