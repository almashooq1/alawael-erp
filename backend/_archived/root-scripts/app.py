"""
التطبيق الرئيسي - Flask Application
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from config import config
from models import db, init_db

def create_app(config_name=None):
    """إنشاء وتكوين التطبيق"""

    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # تهيئة الإضافات
    CORS(app)
    jwt = JWTManager(app)
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri=app.config.get('REDIS_URL', 'memory://')
    )
    socketio = SocketIO(app, cors_allowed_origins="*")

    # تهيئة قاعدة البيانات
    init_db(app)

    # تسجيل الـ Blueprints
    from routes import auth, beneficiaries, reports, sessions, assessments, programs, goals, analytics, websocket, security, advanced

    app.register_blueprint(auth.bp)
    app.register_blueprint(beneficiaries.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(sessions.bp)
    app.register_blueprint(assessments.bp)
    app.register_blueprint(programs.bp)
    app.register_blueprint(goals.bp)
    app.register_blueprint(analytics.analytics_bp)
    app.register_blueprint(security.security_bp)
    app.register_blueprint(advanced.advanced_bp)

    # معالجات الأخطاء
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': 'Bad Request',
            'message': str(error)
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'error': 'Unauthorized',
            'message': 'يرجى تسجيل الدخول'
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'error': 'Forbidden',
            'message': 'ليس لديك صلاحية للوصول'
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Not Found',
            'message': 'المورد المطلوب غير موجود'
        }), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'success': False,
            'error': 'Rate Limit Exceeded',
            'message': 'تجاوزت الحد المسموح من الطلبات'
        }), 429

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'حدث خطأ في الخادم'
        }), 500

    # Middleware
    @app.before_request
    def before_request():
        """معالجة قبل كل طلب"""
        pass

    @app.after_request
    def after_request(response):
        """معالجة بعد كل طلب"""
        response.headers.add('X-Content-Type-Options', 'nosniff')
        response.headers.add('X-Frame-Options', 'DENY')
        response.headers.add('X-XSS-Protection', '1; mode=block')
        return response

    # الصفحة الرئيسية
    @app.route('/')
    def index():
        return jsonify({
            'success': True,
            'message': 'مرحباً بك في نظام إدارة مراكز تأهيل ذوي الإعاقة',
            'version': '1.0.0',
            'api_version': 'v1',
            'endpoints': {
                'auth': '/api/auth',
                'beneficiaries': '/api/beneficiaries',
                'reports': '/api/reports',
                'sessions': '/api/sessions',
                'assessments': '/api/assessments',
                'programs': '/api/programs',
                'goals': '/api/goals'
            }
        })

    # Health check
    @app.route('/health')
    def health_check():
        return jsonify({
            'success': True,
            'status': 'healthy',
            'database': 'connected'
        }), 200

    # WebSocket Events
    @socketio.on('connect')
    def handle_connect():
        print('Client connected')

    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected')

    @socketio.on('join_room')
    def handle_join_room(data):
        from flask_socketio import join_room
        room = data.get('room')
        if room:
            join_room(room)

    @socketio.on('leave_room')
    def handle_leave_room(data):
        from flask_socketio import leave_room
        room = data.get('room')
        if room:
            leave_room(room)

    @socketio.on('report_update')
    def handle_report_update(data):
        from flask_socketio import emit
        emit('report_updated', data, room=data.get('report_id'))

    return app, socketio


if __name__ == '__main__':
    app, socketio = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
