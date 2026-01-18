"""
Routes للتقييمات (Assessments)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.assessment import Assessment
from datetime import datetime

bp = Blueprint('assessments', __name__, url_prefix='/api/assessments')

@bp.route('', methods=['GET'])
@jwt_required()
def list_assessments():
    """قائمة التقييمات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        beneficiary_id = request.args.get('beneficiary_id', type=int)
        assessment_type = request.args.get('type')

        query = Assessment.query

        if beneficiary_id:
            query = query.filter_by(beneficiary_id=beneficiary_id)

        if assessment_type:
            query = query.filter_by(assessment_type=assessment_type)

        query = query.order_by(Assessment.assessment_date.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [a.to_dict() for a in pagination.items],
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
def get_assessment(id):
    """تفاصيل تقييم"""
    try:
        assessment = Assessment.query.get_or_404(id)
        return jsonify({
            'success': True,
            'data': assessment.to_dict(include_results=True)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('', methods=['POST'])
@jwt_required()
def create_assessment():
    """إنشاء تقييم جديد"""
    try:
        data = request.get_json()

        assessment = Assessment(
            beneficiary_id=data['beneficiary_id'],
            assessor_id=data.get('assessor_id', get_jwt_identity()),
            assessment_type=data['assessment_type'],
            assessment_tool=data.get('assessment_tool'),
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            results=data.get('results'),
            scores=data.get('scores'),
            percentiles=data.get('percentiles'),
            domains_assessed=data.get('domains_assessed'),
            summary=data.get('summary'),
            strengths=data.get('strengths'),
            weaknesses=data.get('weaknesses'),
            recommendations=data.get('recommendations'),
            status=data.get('status', 'draft')
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقييم بنجاح',
            'data': assessment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_assessment(id):
    """تحديث تقييم"""
    try:
        assessment = Assessment.query.get_or_404(id)
        data = request.get_json()

        updateable_fields = ['results', 'scores', 'percentiles', 'domains_assessed',
                            'summary', 'strengths', 'weaknesses', 'recommendations',
                            'comparison_notes', 'progress_indicators', 'status']

        for field in updateable_fields:
            if field in data:
                setattr(assessment, field, data[field])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تحديث التقييم بنجاح',
            'data': assessment.to_dict(include_results=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:id>/compare', methods=['GET'])
@jwt_required()
def compare_assessment(id):
    """مقارنة مع التقييم السابق"""
    try:
        assessment = Assessment.query.get_or_404(id)
        comparison = assessment.compare_with_previous()

        return jsonify({
            'success': True,
            'data': comparison
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
