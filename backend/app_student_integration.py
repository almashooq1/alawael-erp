"""
Flask Application - Student Management System Integration
Main app.py configuration with all integrations
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ APPLICATION FACTORY ============

def create_app():
    """Create and configure Flask application"""

    app = Flask(__name__)

    # ============ CONFIGURATION ============

    app.config['MONGO_URI'] = os.getenv(
        'MONGODB_URI',
        'mongodb://localhost:27017/student_management'
    )

    app.config['JSON_SORT_KEYS'] = False
    app.config['JSON_AS_ASCII'] = False

    # Cache configuration
    cache_config = {
        'CACHE_TYPE': 'redis',
        'CACHE_REDIS_URL': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        'CACHE_DEFAULT_TIMEOUT': 300
    }
    app.config.from_mapping(cache_config)

    # ============ EXTENSIONS ============

    # MongoDB
    mongo = PyMongo(app)
    app.config['DB'] = mongo.db

    # CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','),
            "methods": ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            "allow_headers": ['Content-Type', 'Authorization'],
            "supports_credentials": True
        }
    })

    # Cache
    cache = Cache(app)

    # Rate Limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"]
    )

    # ============ INITIALIZE DATABASE ============

    try:
        from models.student_models import init_db
        init_db(mongo.db)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")

    # ============ REGISTER BLUEPRINTS ============

    # Student Management API
    try:
        from api.student_management_api import register_student_blueprints
        register_student_blueprints(app)
        logger.info("Student Management APIs registered")
    except Exception as e:
        logger.error(f"Error registering student APIs: {str(e)}")

    # ============ GLOBAL ERROR HANDLERS ============

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Resource not found",
            "status": 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "status": 500
        }), 500

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "success": False,
            "error": "Access forbidden",
            "status": 403
        }), 403

    # ============ MIDDLEWARE ============

    @app.before_request
    def before_request():
        """Log all incoming requests"""
        logger.debug(f"{request.method} {request.path}")

    # ============ HEALTH CHECK ============

    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        try:
            # Check MongoDB connection
            mongo.db.command('ping')
            db_status = "connected"
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            db_status = "disconnected"

        return jsonify({
            "status": "ok",
            "service": "student-management-system",
            "database": db_status,
            "version": "1.0.0"
        }), 200 if db_status == "connected" else 503

    # ============ STARTUP LOGGING ============

    @app.shell_context_processor
    def make_shell_context():
        return {
            'db': mongo.db,
            'cache': cache,
            'limiter': limiter
        }

    logger.info("=" * 50)
    logger.info("STUDENT MANAGEMENT SYSTEM - STARTING UP")
    logger.info("=" * 50)
    logger.info(f"Environment: {os.getenv('FLASK_ENV', 'production')}")
    logger.info(f"Debug Mode: {os.getenv('FLASK_DEBUG', False)}")
    logger.info(f"MongoDB URI: {app.config['MONGO_URI']}")
    logger.info("=" * 50)

    return app

# ============ APPLICATION ENTRY POINT ============

if __name__ == '__main__':
    app = create_app()
    app.run(
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', False)
    )
