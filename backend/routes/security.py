"""
Advanced Security Features
API Key management, RBAC, 2FA, and audit logging
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import uuid
from app import db, redis_client
from models.api_key import APIKey, AuditLog
from models import User
import pyotp
import qrcode
from io import BytesIO
import base64

security_bp = Blueprint('security', __name__, url_prefix='/api/security')


# ==================== API KEY MANAGEMENT ====================

@security_bp.route('/api-keys', methods=['POST'])
@jwt_required()
def create_api_key():
    """Create new API key"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Generate key
        key = APIKey.generate_key()
        api_key = APIKey(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.get('name', 'API Key'),
            description=data.get('description'),
            scopes=data.get('scopes', ['read']),
            endpoints=data.get('endpoints', []),
            ip_whitelist=data.get('ip_whitelist', []),
            rate_limit=data.get('rate_limit', 1000),
            created_by=request.remote_addr
        )
        
        # Set expiration
        if data.get('expires_in_days'):
            api_key.expires_at = datetime.utcnow() + timedelta(
                days=data['expires_in_days']
            )
        
        api_key.set_key(key)
        db.session.add(api_key)
        db.session.commit()
        
        # Return key only once
        return jsonify({
            'success': True,
            'key': key,  # Only shown once
            'api_key': api_key.to_dict(),
            'warning': 'Save this key securely. You won\'t see it again.'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/api-keys', methods=['GET'])
@jwt_required()
def list_api_keys():
    """List user's API keys"""
    try:
        user_id = get_jwt_identity()
        
        api_keys = APIKey.query.filter_by(user_id=user_id).all()
        return jsonify({
            'success': True,
            'api_keys': [k.to_dict() for k in api_keys]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/api-keys/<api_key_id>', methods=['GET'])
@jwt_required()
def get_api_key(api_key_id):
    """Get specific API key details"""
    try:
        user_id = get_jwt_identity()
        
        api_key = APIKey.query.filter_by(
            id=api_key_id,
            user_id=user_id
        ).first()
        
        if not api_key:
            return jsonify({'error': 'API key not found'}), 404
        
        return jsonify({
            'success': True,
            'api_key': api_key.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/api-keys/<api_key_id>', methods=['PUT'])
@jwt_required()
def update_api_key(api_key_id):
    """Update API key"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        api_key = APIKey.query.filter_by(
            id=api_key_id,
            user_id=user_id
        ).first()
        
        if not api_key:
            return jsonify({'error': 'API key not found'}), 404
        
        # Update fields
        if 'name' in data:
            api_key.name = data['name']
        if 'description' in data:
            api_key.description = data['description']
        if 'scopes' in data:
            api_key.scopes = data['scopes']
        if 'endpoints' in data:
            api_key.endpoints = data['endpoints']
        if 'ip_whitelist' in data:
            api_key.ip_whitelist = data['ip_whitelist']
        if 'rate_limit' in data:
            api_key.rate_limit = data['rate_limit']
        if 'is_active' in data:
            api_key.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'api_key': api_key.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/api-keys/<api_key_id>', methods=['DELETE'])
@jwt_required()
def delete_api_key(api_key_id):
    """Delete API key"""
    try:
        user_id = get_jwt_identity()
        
        api_key = APIKey.query.filter_by(
            id=api_key_id,
            user_id=user_id
        ).first()
        
        if not api_key:
            return jsonify({'error': 'API key not found'}), 404
        
        db.session.delete(api_key)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'API key deleted'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ==================== 2FA - TWO-FACTOR AUTHENTICATION ====================

@security_bp.route('/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    """Setup 2FA for user"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate secret
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        
        # Generate QR code
        qr = qrcode.QRCode()
        qr.add_data(totp.provisioning_uri(
            name=user.email,
            issuer_name='CRM System'
        ))
        qr.make()
        
        # Convert QR to image
        img = qr.make_image(fill_color="black", back_color="white")
        img_bytes = BytesIO()
        img.save(img_bytes)
        img_base64 = base64.b64encode(img_bytes.getvalue()).decode()
        
        # Store temporary secret in cache
        redis_client.setex(
            f'2fa_setup:{user_id}',
            300,
            secret
        )
        
        return jsonify({
            'success': True,
            'secret': secret,
            'qr_code': f'data:image/png;base64,{img_base64}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    """Verify 2FA setup with code"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        code = data.get('code')
        
        # Get secret from cache
        secret = redis_client.get(f'2fa_setup:{user_id}')
        if not secret:
            return jsonify({'error': '2FA setup not in progress'}), 400
        
        secret = secret.decode()
        totp = pyotp.TOTP(secret)
        
        if not totp.verify(code):
            return jsonify({'error': 'Invalid code'}), 400
        
        # Save to user
        user = User.query.get(user_id)
        user.two_fa_secret = secret
        user.two_fa_enabled = True
        
        db.session.commit()
        
        # Clear cache
        redis_client.delete(f'2fa_setup:{user_id}')
        
        return jsonify({
            'success': True,
            'message': '2FA enabled successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@security_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    """Disable 2FA"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        code = data.get('code')
        
        user = User.query.get(user_id)
        
        if not user.two_fa_enabled:
            return jsonify({'error': '2FA not enabled'}), 400
        
        # Verify code
        totp = pyotp.TOTP(user.two_fa_secret)
        if not totp.verify(code):
            return jsonify({'error': 'Invalid code'}), 400
        
        # Disable 2FA
        user.two_fa_enabled = False
        user.two_fa_secret = None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '2FA disabled'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ==================== AUDIT LOGS ====================

@security_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs for user"""
    try:
        user_id = get_jwt_identity()
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        logs = AuditLog.query.filter_by(user_id=user_id).order_by(
            AuditLog.timestamp.desc()
        ).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'success': True,
            'audit_logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ==================== MIDDLEWARE - AUDIT LOGGING ====================

@security_bp.before_app_request
def audit_request():
    """Audit all requests"""
    try:
        # Skip certain paths
        skip_paths = ['/health', '/static']
        if any(request.path.startswith(p) for p in skip_paths):
            return
        
        start_time = datetime.utcnow()
        request.start_time = start_time
        
    except:
        pass


def log_audit(user_id, api_key_id, method, endpoint, status_code, 
              response_time_ms, error_message=None):
    """Log audit entry"""
    try:
        log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            api_key_id=api_key_id,
            method=method,
            endpoint=endpoint,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            status_code=status_code,
            response_time_ms=response_time_ms,
            error_message=error_message
        )
        
        db.session.add(log)
        db.session.commit()
        
    except:
        pass
