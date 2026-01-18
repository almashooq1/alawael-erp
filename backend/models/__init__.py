"""
نماذج قاعدة البيانات - Models Package
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Import models
try:
    from .user import User
    from .beneficiary import Beneficiary
    from .session import TherapySession as Session
    from .report import Report
    from .assessment import Assessment
    from .goal import Goal
    from .program import Program
except ImportError:
    pass

def init_db(app):
    """تهيئة قاعدة البيانات"""
    db.init_app(app)

    with app.app_context():
        # إنشاء الجداول
        db.create_all()

        print("[OK] Database initialized successfully!")

