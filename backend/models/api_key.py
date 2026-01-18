"""
API Key Model for application authentication
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.sqlite import JSON
from datetime import datetime
from app import db
import secrets
import hashlib


class APIKey(db.Model):
    """API Key model for service-to-service authentication"""

    __tablename__ = 'api_keys'

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)

    # Key management
    key_hash = Column(String(255), unique=True, nullable=False)
    key_prefix = Column(String(20), unique=True, nullable=False)  # First 20 chars for display

    # Metadata
    name = Column(String(255), nullable=False)
    description = Column(String(1000))

    # Permissions
    scopes = Column(JSON, default=['read'])  # ['read', 'write', 'delete']
    endpoints = Column(JSON, default=[])  # Specific endpoints allowed

    # Security
    is_active = Column(Boolean, default=True)
    ip_whitelist = Column(JSON, default=[])  # Allowed IPs
    rate_limit = Column(Integer, default=1000)  # Requests per hour

    # Audit
    last_used = Column(DateTime)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    created_by = Column(String(255))  # IP or user who created it

    # Relationship
    user = db.relationship('User', backref='api_keys')

    @staticmethod
    def generate_key():
        """Generate a new API key"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_key(key):
        """Hash an API key for storage"""
        return hashlib.sha256(key.encode()).hexdigest()

    def set_key(self, key):
        """Set and hash the API key"""
        self.key_hash = self.hash_key(key)
        self.key_prefix = key[:20]

    def verify_key(self, key):
        """Verify if provided key matches stored hash"""
        return self.key_hash == self.hash_key(key)

    def is_valid(self):
        """Check if API key is valid"""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True

    def can_access(self, method, endpoint, ip_address=None):
        """Check if key can access specific endpoint"""
        if not self.is_valid():
            return False

        # Check IP whitelist
        if self.ip_whitelist and ip_address not in self.ip_whitelist:
            return False

        # Check scopes
        scope = 'read' if method == 'GET' else 'write'
        if scope not in self.scopes:
            return False

        # Check endpoint whitelist
        if self.endpoints and endpoint not in self.endpoints:
            return False

        return True

    def update_usage(self):
        """Update usage statistics"""
        self.usage_count += 1
        self.last_used = datetime.utcnow()
        db.session.commit()

    def to_dict(self, include_secret=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'key_prefix': self.key_prefix,
            'scopes': self.scopes,
            'endpoints': self.endpoints,
            'is_active': self.is_active,
            'ip_whitelist': self.ip_whitelist,
            'rate_limit': self.rate_limit,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }
        return data


class AuditLog(db.Model):
    """Audit log for tracking system activities"""

    __tablename__ = 'audit_logs'

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'))
    api_key_id = Column(String(36), db.ForeignKey('api_keys.id'))

    # Request details
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    endpoint = Column(String(255), nullable=False)
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(String(255))

    # Response details
    status_code = Column(Integer)
    response_time_ms = Column(Integer)

    # Data
    request_data = Column(JSON)
    response_data = Column(JSON)
    error_message = Column(String(1000))

    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='audit_logs')
    api_key = db.relationship('APIKey', backref='audit_logs')

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'api_key_id': self.api_key_id,
            'method': self.method,
            'endpoint': self.endpoint,
            'ip_address': self.ip_address,
            'status_code': self.status_code,
            'response_time_ms': self.response_time_ms,
            'error_message': self.error_message,
            'timestamp': self.timestamp.isoformat()
        }
