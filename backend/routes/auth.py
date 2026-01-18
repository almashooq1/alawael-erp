"""
Routes للمصادقة (Authentication)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from models import db
from models.user import User
from datetime import timedelta

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    """تسجيل مستخدم جديد"""
    try:
        data = request.get_json()

        # التحقق من البيانات المطلوبة
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'الحقل {field} مطلوب'
                }), 400

        # التحقق من عدم تكرار اسم المستخدم
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'message': 'اسم المستخدم موجود مسبقاً'
            }), 400

        # التحقق من عدم تكرار البريد الإلكتروني
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'message': 'البريد الإلكتروني مسجل مسبقاً'
            }), 400

        # إنشاء المستخدم
        user = User(
            username=data['username'],
            email=data['email'],
            first_name=data.get('first_name', 'User'),
            last_name=data.get('last_name', data['username']),
            user_type=data.get('user_type', 'therapist')
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم التسجيل بنجاح',
            'data': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    try:
        data = request.get_json()

        if not data.get('username') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'اسم المستخدم وكلمة المرور مطلوبان'
            }), 400

        # البحث عن المستخدم
        user = User.query.filter(
            (User.username == data['username']) |
            (User.email == data['username'])
        ).first()

        if not user or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'
            }), 401

        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'الحساب غير نشط'
            }), 403

        # تحديث آخر تسجيل دخول
        user.last_login = db.func.now()
        db.session.commit()

        # إنشاء التوكنات
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=1),
            additional_claims={
                'user_type': user.user_type
            }
        )

        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )

        return jsonify({
            'success': True,
            'message': 'تم تسجيل الدخول بنجاح',
            'data': {
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """تحديث التوكن"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))

        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'المستخدم غير موجود أو غير نشط'
            }), 403

        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=1),
            additional_claims={
                'user_type': user.user_type
            }
        )

        return jsonify({
            'success': True,
            'data': {
                'access_token': access_token
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    """الحصول على ملف المستخدم"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))

        if not user:
            return jsonify({
                'success': False,
                'message': 'المستخدم غير موجود'
            }), 404

        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """تسجيل الخروج"""
    # في التطبيق الحقيقي، يتم إضافة التوكن للقائمة السوداء
    return jsonify({
        'success': True,
        'message': 'تم تسجيل الخروج بنجاح'
    }), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """معلومات المستخدم الحالي"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get_or_404(current_user_id)

        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/me', methods=['PUT'])
@jwt_required()
def update_current_user():
    """تحديث معلومات المستخدم الحالي"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get_or_404(current_user_id)
        data = request.get_json()

        # الحقول القابلة للتحديث
        updateable_fields = ['first_name', 'last_name', 'email', 'phone', 'avatar']

        for field in updateable_fields:
            if field in data:
                setattr(user, field, data[field])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تحديث المعلومات بنجاح',
            'data': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """تغيير كلمة المرور"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get_or_404(current_user_id)
        data = request.get_json()

        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({
                'success': False,
                'message': 'كلمة المرور الحالية والجديدة مطلوبتان'
            }), 400

        # التحقق من كلمة المرور الحالية
        if not user.check_password(data['current_password']):
            return jsonify({
                'success': False,
                'message': 'كلمة المرور الحالية غير صحيحة'
            }), 401

        # تحديث كلمة المرور
        user.set_password(data['new_password'])
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'تم تغيير كلمة المرور بنجاح'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/verify-token', methods=['POST'])
@jwt_required()
def verify_token():
    """التحقق من صلاحية التوكن"""
    try:
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()

        return jsonify({
            'success': True,
            'valid': True,
            'user_id': current_user_id,
            'role': jwt_data.get('role'),
            'permissions': jwt_data.get('permissions', [])
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'valid': False,
            'message': str(e)
        }), 401
