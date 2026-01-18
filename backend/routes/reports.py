"""
Routes للتقارير (Reports)
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.report import Report, ReportComment, ReportVersion
from models.user import User
from datetime import datetime
from sqlalchemy import or_
import secrets

bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@bp.route('', methods=['GET'])
@jwt_required()
def list_reports():
    """قائمة التقارير"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        report_type = request.args.get('type', '')
        status = request.args.get('status', '')
        beneficiary_id = request.args.get('beneficiary_id', type=int)

        query = Report.query

        # البحث
        if search:
            search_filter = or_(
                Report.title.ilike(f'%{search}%'),
                Report.report_number.ilike(f'%{search}%'),
                Report.description.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        if report_type:
            query = query.filter_by(report_type=report_type)

        if status:
            query = query.filter_by(status=status)

        if beneficiary_id:
            query = query.filter_by(beneficiary_id=beneficiary_id)

        query = query.order_by(Report.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [r.to_dict() for r in pagination.items],
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_report(id):
    """تفاصيل تقرير"""
    try:
        report = Report.query.get_or_404(id)
        report.increment_views()

        return jsonify({
            'success': True,
            'data': report.to_dict(include_content=True)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_report():
    """إنشاء تقرير جديد"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        report = Report(
            report_type=data['report_type'],
            title=data['title'],
            description=data.get('description'),
            beneficiary_id=data.get('beneficiary_id'),
            author_id=current_user_id,
            content=data.get('content', {}),
            summary=data.get('summary'),
            recommendations=data.get('recommendations'),
            period_start=datetime.strptime(data['period_start'], '%Y-%m-%d').date() if data.get('period_start') else None,
            period_end=datetime.strptime(data['period_end'], '%Y-%m-%d').date() if data.get('period_end') else None,
            status='draft'
        )

        db.session.add(report)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقرير بنجاح',
            'data': report.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_report(id):
    """تحديث تقرير"""
    try:
        report = Report.query.get_or_404(id)
        data = request.get_json()

        # حفظ نسخة قبل التحديث
        version = ReportVersion(
            report_id=report.id,
            user_id=get_jwt_identity(),
            version_number=report.versions.count() + 1,
            content=report.content,
            changes_summary=data.get('changes_summary', 'تحديث')
        )
        db.session.add(version)

        # تحديث البيانات
        updateable_fields = ['title', 'description', 'content', 'summary',
                            'recommendations', 'status']

        for field in updateable_fields:
            if field in data:
                setattr(report, field, data[field])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تحديث التقرير بنجاح',
            'data': report.to_dict(include_content=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_report(id):
    """حذف تقرير"""
    try:
        report = Report.query.get_or_404(id)
        db.session.delete(report)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم حذف التقرير بنجاح'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/publish', methods=['POST'])
@jwt_required()
def publish_report(id):
    """نشر تقرير"""
    try:
        report = Report.query.get_or_404(id)
        report.publish()

        return jsonify({
            'success': True,
            'message': 'تم نشر التقرير بنجاح',
            'data': report.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/share', methods=['POST'])
@jwt_required()
def share_report(id):
    """مشاركة تقرير"""
    try:
        report = Report.query.get_or_404(id)
        data = request.get_json()

        # توليد token للمشاركة
        report.share_token = secrets.token_urlsafe(32)
        report.is_shared = True
        report.shared_with = data.get('shared_with', [])

        if data.get('expires_in_days'):
            from datetime import timedelta
            report.share_expires_at = datetime.utcnow() + timedelta(days=data['expires_in_days'])

        db.session.commit()

        share_url = f"/shared/reports/{report.share_token}"

        return jsonify({
            'success': True,
            'message': 'تم مشاركة التقرير بنجاح',
            'share_url': share_url,
            'share_token': report.share_token
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/download', methods=['GET'])
@jwt_required()
def download_report(id):
    """تحميل تقرير بصيغة PDF"""
    try:
        report = Report.query.get_or_404(id)
        report.increment_downloads()

        # هنا يتم توليد PDF (سيتم إضافة الكود لاحقاً)
        return jsonify({
            'success': True,
            'message': 'جاري توليد PDF...',
            'report_id': report.id
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/comments', methods=['GET'])
@jwt_required()
def get_report_comments(id):
    """جلب تعليقات التقرير"""
    try:
        report = Report.query.get_or_404(id)
        comments = report.comments.all()

        return jsonify({
            'success': True,
            'data': [c.to_dict() for c in comments]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/comments', methods=['POST'])
@jwt_required()
def add_report_comment(id):
    """إضافة تعليق"""
    try:
        report = Report.query.get_or_404(id)
        data = request.get_json()

        comment = ReportComment(
            report_id=report.id,
            user_id=get_jwt_identity(),
            content=data['content'],
            position=data.get('position'),
            parent_id=data.get('parent_id')
        )

        db.session.add(comment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إضافة التعليق بنجاح',
            'data': comment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/versions', methods=['GET'])
@jwt_required()
def get_report_versions(id):
    """سجل إصدارات التقرير"""
    try:
        report = Report.query.get_or_404(id)
        versions = report.versions.order_by(ReportVersion.created_at.desc()).all()

        return jsonify({
            'success': True,
            'data': [v.to_dict() for v in versions]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/types', methods=['GET'])
@jwt_required()
def get_report_types():
    """أنواع التقارير المتاحة"""
    types = [
        {'value': 'individual', 'label': 'تقرير فردي'},
        {'value': 'progress', 'label': 'تقرير تقدم'},
        {'value': 'group', 'label': 'تقرير جماعي'},
        {'value': 'institutional', 'label': 'تقرير مؤسسي'},
        {'value': 'program', 'label': 'تقرير برنامج'},
        {'value': 'statistical', 'label': 'تقرير إحصائي'},
        {'value': 'family', 'label': 'تقرير أسري'},
        {'value': 'insurance', 'label': 'تقرير تأميني'},
        {'value': 'qol', 'label': 'تقرير جودة الحياة'},
        {'value': 'abas', 'label': 'تقرير ABAS'},
        {'value': 'integration', 'label': 'تقرير دمج'},
        {'value': 'recommendations', 'label': 'تقرير توصيات'}
    ]

    return jsonify({
        'success': True,
        'data': types
    }), 200
