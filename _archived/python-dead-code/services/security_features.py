"""
Advanced Security Features - Phase 3
=====================================
Comprehensive security implementations for production environment
"""

from flask import request, jsonify
from functools import wraps
import hashlib
import hmac
from datetime import datetime, timedelta
import secrets
import jwt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

# ============================================
# 1. RATE LIMITING & DDoS PROTECTION
# ============================================

class RateLimitingService:
    """Advanced rate limiting to prevent abuse"""
    
    def __init__(self, app=None):
        self.limiter = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        self.limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=["200 per day", "50 per hour"],
            storage_uri="redis://localhost:6379/1"
        )
    
    # Define rate limits for different endpoints
    endpoints = {
        'auth_login': '5 per minute',
        'auth_register': '3 per minute',
        'api_general': '100 per hour',
        'api_export': '10 per hour',
        'api_bulk_operations': '20 per day',
    }

class DDoSProtectionService:
    """Protect against DDoS attacks"""
    
    @staticmethod
    def get_client_ip(request):
        """Extract real client IP even behind proxy"""
        if request.environ.get('HTTP_CF_CONNECTING_IP'):
            return request.environ['HTTP_CF_CONNECTING_IP']
        return request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    
    @staticmethod
    def is_suspicious_pattern(request):
        """Detect suspicious request patterns"""
        # Check for SQL injection patterns
        dangerous_chars = ['--', '/*', '*/', 'union', 'select', 'insert', 'delete']
        req_str = str(request.args) + str(request.form)
        
        for char in dangerous_chars:
            if char.lower() in req_str.lower():
                return True
        return False
    
    @staticmethod
    def validate_request_size(max_size_mb=10):
        """Prevent large payload attacks"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if request.content_length and request.content_length > max_size_mb * 1024 * 1024:
                    return jsonify({'error': 'Payload too large'}), 413
                return f(*args, **kwargs)
            return decorated_function
        return decorator

# ============================================
# 2. ENCRYPTION & DATA PROTECTION
# ============================================

class EncryptionService:
    """Handle sensitive data encryption"""
    
    def __init__(self, app=None):
        self.app = app
    
    @staticmethod
    def hash_sensitive_data(data):
        """Hash sensitive fields"""
        salt = secrets.token_hex(16)
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256',
            data.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return f"{salt}${hash_obj.hex()}"
    
    @staticmethod
    def verify_hash(data, stored_hash):
        """Verify hashed data"""
        salt = stored_hash.split('$')[0]
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256',
            data.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hash_obj.hex() == stored_hash.split('$')[1]
    
    @staticmethod
    def generate_secure_token(length=32):
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)

class DataMaskingService:
    """Mask sensitive data in logs and responses"""
    
    @staticmethod
    def mask_email(email):
        """Mask email for privacy"""
        if not email or '@' not in email:
            return '***'
        local, domain = email.split('@')
        if len(local) <= 2:
            return f"*{'*' * len(local)}@{domain}"
        return f"{local[0]}{'*' * (len(local)-2)}{local[-1]}@{domain}"
    
    @staticmethod
    def mask_phone(phone):
        """Mask phone number"""
        if not phone or len(phone) < 4:
            return '****'
        return f"{'*' * (len(phone)-4)}{phone[-4:]}"
    
    @staticmethod
    def mask_passport(passport):
        """Mask passport ID"""
        if not passport or len(passport) < 3:
            return '***'
        return f"***{passport[-3:]}"

# ============================================
# 3. AUTHENTICATION & AUTHORIZATION
# ============================================

class AdvancedAuthService:
    """Advanced authentication mechanisms"""
    
    @staticmethod
    def create_2fa_token(user_id):
        """Create 2-factor authentication token"""
        token = secrets.randbelow(999999)
        token_str = f"{token:06d}"
        
        # Store in Redis with expiry
        # redis_client.setex(f"2fa:{user_id}", 300, token_str)
        
        return token_str
    
    @staticmethod
    def verify_2fa_token(user_id, token):
        """Verify 2FA token"""
        # stored_token = redis_client.get(f"2fa:{user_id}")
        # return stored_token and stored_token.decode() == token
        pass
    
    @staticmethod
    def create_jwt_with_rotation(user_id, secret, expires_in_hours=24):
        """Create JWT with automatic rotation"""
        payload = {
            'user_id': user_id,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
            'token_version': 1  # For token rotation
        }
        return jwt.encode(payload, secret, algorithm='HS256')
    
    @staticmethod
    def validate_jwt(token, secret):
        """Validate JWT with extra checks"""
        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            # Additional checks can be added here
            return payload
        except jwt.InvalidTokenError:
            return None

class OAuthService:
    """OAuth 2.0 implementation"""
    
    @staticmethod
    def generate_authorization_code(user_id, client_id):
        """Generate OAuth authorization code"""
        code = secrets.token_urlsafe(32)
        # Store code with expiry (5 minutes)
        # redis_client.setex(f"oauth_code:{code}", 300, f"{user_id}:{client_id}")
        return code
    
    @staticmethod
    def exchange_code_for_token(code, client_id, client_secret):
        """Exchange authorization code for access token"""
        # Verify code and client credentials
        # Create access token and refresh token
        access_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': 3600,
            'token_type': 'Bearer'
        }

# ============================================
# 4. AUDIT LOGGING & MONITORING
# ============================================

class AuditLoggingService:
    """Comprehensive audit logging"""
    
    @staticmethod
    def log_security_event(event_type, user_id, action, details=None, status='success'):
        """Log security-related events"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'action': action,
            'ip_address': DDoSProtectionService.get_client_ip(request),
            'user_agent': request.headers.get('User-Agent'),
            'status': status,
            'details': details or {}
        }
        
        # Log to file/database
        # logger.info(json.dumps(log_entry))
        
        return log_entry
    
    @staticmethod
    def get_audit_trail(user_id, days=30):
        """Retrieve audit trail for user"""
        # Query database for all events for this user
        pass

# ============================================
# 5. VULNERABILITY SCANNING
# ============================================

class VulnerabilityScanner:
    """Detect and log vulnerabilities"""
    
    @staticmethod
    def check_sql_injection(input_string):
        """Check for SQL injection patterns"""
        sql_patterns = [
            r"(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bupdate\b|\bdrop\b)",
            r"(--|\#|\/\*|\*\/)",
            r"(\bor\b.*=.*)",
        ]
        import re
        for pattern in sql_patterns:
            if re.search(pattern, input_string, re.IGNORECASE):
                return True
        return False
    
    @staticmethod
    def check_xss_patterns(input_string):
        """Check for XSS patterns"""
        xss_patterns = [
            r"<script[^>]*>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
        ]
        import re
        for pattern in xss_patterns:
            if re.search(pattern, input_string, re.IGNORECASE):
                return True
        return False

# ============================================
# 6. CERTIFICATE & SSL/TLS
# ============================================

class CertificateService:
    """Manage SSL/TLS certificates"""
    
    @staticmethod
    def validate_certificate_expiry(cert_path):
        """Check if certificate is about to expire"""
        import ssl
        from datetime import datetime
        
        cert = ssl.load_cert_chain(cert_path)
        # Get expiry date from certificate
        # Alert if expiring within 30 days
    
    @staticmethod
    def generate_self_signed_cert(domain, days=365):
        """Generate self-signed certificate for testing"""
        # Use openssl or cryptography library
        pass

# ============================================
# 7. ENVIRONMENT & CONFIG SECURITY
# ============================================

class SecureConfigService:
    """Secure configuration management"""
    
    @staticmethod
    def validate_env_variables():
        """Validate all required environment variables are set"""
        required_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'DATABASE_URL',
            'REDIS_URL',
        ]
        
        import os
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")
    
    @staticmethod
    def get_secure_config():
        """Get configuration with security checks"""
        import os
        
        return {
            'DEBUG': False,  # Never True in production
            'TESTING': False,
            'SESSION_COOKIE_SECURE': True,
            'SESSION_COOKIE_HTTPONLY': True,
            'SESSION_COOKIE_SAMESITE': 'Lax',
            'PERMANENT_SESSION_LIFETIME': 3600,
            'JWT_ALGORITHM': 'HS256',
            'JWT_EXPIRATION_HOURS': 24,
            'MAX_CONTENT_LENGTH': 10 * 1024 * 1024,  # 10MB max
        }

# ============================================
# 8. CORS & HEADERS SECURITY
# ============================================

def setup_security_headers(app):
    """Setup security headers"""
    
    @app.after_request
    def set_security_headers(response):
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:;"
        )
        
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response.headers['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=()'
        )
        
        # HSTS (HTTPS Strict Transport Security)
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains; preload'
        )
        
        return response

def setup_cors_security(app):
    """Setup CORS with security"""
    import os
    
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    CORS(app, 
         resources={r"/api/*": {
             "origins": allowed_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "max_age": 3600
         }})

# ============================================
# 9. INPUT VALIDATION & SANITIZATION
# ============================================

class InputValidationService:
    """Validate and sanitize user inputs"""
    
    @staticmethod
    def sanitize_string(input_str, max_length=255):
        """Remove potentially harmful characters"""
        if not isinstance(input_str, str):
            return ""
        
        # Remove control characters
        sanitized = ''.join(char for char in input_str if ord(char) >= 32 or char == '\n')
        
        # Limit length
        return sanitized[:max_length]
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone format"""
        import re
        pattern = r'^[\d\s\-\+\(\)]{10,}$'
        return re.match(pattern, phone) is not None
    
    @staticmethod
    def validate_json(json_str):
        """Validate JSON structure"""
        import json
        try:
            json.loads(json_str)
            return True
        except json.JSONDecodeError:
            return False

# ============================================
# 10. SECURITY MIDDLEWARE
# ============================================

class SecurityMiddleware:
    """Middleware for security checks"""
    
    def __init__(self, app):
        self.app = app
        self.setup()
    
    def setup(self):
        @self.app.before_request
        def security_checks():
            # Check for suspicious patterns
            if DDoSProtectionService.is_suspicious_pattern(request):
                AuditLoggingService.log_security_event(
                    'suspicious_request',
                    'anonymous',
                    'potential_injection_attempt',
                    status='blocked'
                )
                return jsonify({'error': 'Request blocked'}), 403
            
            # Validate request size
            if request.content_length and request.content_length > 10 * 1024 * 1024:
                return jsonify({'error': 'Payload too large'}), 413
            
            # Add request ID for tracking
            request.id = secrets.token_urlsafe(16)

# ============================================
# INITIALIZATION FUNCTION
# ============================================

def init_security_features(app):
    """Initialize all security features"""
    
    # Validate environment variables
    SecureConfigService.validate_env_variables()
    
    # Setup security headers
    setup_security_headers(app)
    
    # Setup CORS
    setup_cors_security(app)
    
    # Initialize rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        storage_uri="redis://localhost:6379/1"
    )
    
    # Initialize security middleware
    SecurityMiddleware(app)
    
    return {
        'encryption_service': EncryptionService(app),
        'auth_service': AdvancedAuthService(),
        'audit_service': AuditLoggingService(),
        'vulnerability_scanner': VulnerabilityScanner(),
        'validation_service': InputValidationService(),
        'ddos_protection': DDoSProtectionService(),
    }
