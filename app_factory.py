import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import configurations
from config import config

# Import database instance
from database import db

# Initialize extensions
mail = Mail()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'default')

    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config.from_object(config[config_name])

    # Initialize extensions with app
    CORS(app, origins=["http://localhost:3000"]) # Consider making origins configurable
    db.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register Blueprints and Routes here
    with app.app_context():
        # Register all blueprints from the application
        # Each blueprint is wrapped in a try-except block to ensure the app can start even if a module fails
        
        # Main routes
        from main_routes import main_bp
        app.register_blueprint(main_bp)

        # API Blueprints
        try:
            from crm_api import crm_bp
            app.register_blueprint(crm_bp)
        except ImportError as e:
            print(f"Could not import crm_bp: {e}")

        try:
            from crm_opportunities_api import opportunities_bp
            app.register_blueprint(opportunities_bp)
        except ImportError as e:
            print(f"Could not import opportunities_bp: {e}")

        try:
            from crm_activities_api import activities_bp
            app.register_blueprint(activities_bp)
        except ImportError as e:
            print(f"Could not import activities_bp: {e}")

        try:
            from crm_communications_api import communications_bp
            app.register_blueprint(communications_bp)
        except ImportError as e:
            print(f"Could not import communications_bp: {e}")

        try:
            from crm_reports_api import reports_bp
            app.register_blueprint(reports_bp)
        except ImportError as e:
            print(f"Could not import reports_bp: {e}")

        try:
            from crm_campaigns_api import campaigns_bp
            app.register_blueprint(campaigns_bp)
        except ImportError as e:
            print(f"Could not import campaigns_bp: {e}")

        try:
            from crm_support_api import support_bp
            app.register_blueprint(support_bp)
        except ImportError as e:
            print(f"Could not import support_bp: {e}")

        try:
            from family_child_api import family_child_bp
            app.register_blueprint(family_child_bp)
        except ImportError as e:
            print(f"Could not import family_child_bp: {e}")

        try:
            from risk_management_api import risk_management_bp
            app.register_blueprint(risk_management_bp)
        except ImportError as e:
            print(f"Could not import risk_management_bp: {e}")

        try:
            from chat_api import chat_bp
            app.register_blueprint(chat_bp)
        except ImportError as e:
            print(f"Could not import chat_bp: {e}")

        try:
            from ai_communications_api import ai_communications_bp
            app.register_blueprint(ai_communications_bp)
        except ImportError as e:
            print(f"Could not import ai_communications_bp: {e}")

        try:
            from student_comprehensive_api import student_comprehensive_bp
            app.register_blueprint(student_comprehensive_bp)
        except ImportError as e:
            print(f"Could not import student_comprehensive_bp: {e}")

        try:
            from automation_api import automation_bp
            app.register_blueprint(automation_bp)
        except ImportError as e:
            print(f"Could not import automation_bp: {e}")

        try:
            from approval_api import approval_bp
            app.register_blueprint(approval_bp)
        except ImportError as e:
            print(f"Could not import approval_bp: {e}")

        try:
            from security_api import security_bp
            app.register_blueprint(security_bp)
        except ImportError as e:
            print(f"Could not import security_bp: {e}")

        try:
            from intelligent_assistant_api import intelligent_assistant_bp
            app.register_blueprint(intelligent_assistant_bp)
        except ImportError as e:
            print(f"Could not import intelligent_assistant_bp: {e}")

        try:
            from advanced_dashboard_api import advanced_dashboard_bp
            app.register_blueprint(advanced_dashboard_bp)
        except ImportError as e:
            print(f"Could not import advanced_dashboard_bp: {e}")

        try:
            from learning_behavior_analysis_api import learning_behavior_bp
            app.register_blueprint(learning_behavior_bp)
        except ImportError as e:
            print(f"Could not import learning_behavior_bp: {e}")

        try:
            from smart_therapy_recommendations_api import smart_therapy_bp
            app.register_blueprint(smart_therapy_bp)
        except ImportError as e:
            print(f"Could not import smart_therapy_bp: {e}")

        try:
            from ai_progress_prediction_api import ai_prediction_bp
            app.register_blueprint(ai_prediction_bp)
        except ImportError as e:
            print(f"Could not import ai_prediction_bp: {e}")

        try:
            from ar_vr_enhanced_api import ar_vr_enhanced_bp
            app.register_blueprint(ar_vr_enhanced_bp)
        except ImportError as e:
            print(f"Could not import ar_vr_enhanced_bp: {e}")

        try:
            from branch_integration_api import branch_integration_bp
            app.register_blueprint(branch_integration_bp)
        except ImportError as e:
            print(f"Could not import branch_integration_bp: {e}")

        try:
            from surveillance_system_api import surveillance_bp
            app.register_blueprint(surveillance_bp)
        except ImportError as e:
            print(f"Could not import surveillance_bp: {e}")

        try:
            from documents_licenses_api import documents_bp
            app.register_blueprint(documents_bp)
        except ImportError as e:
            print(f"Could not import documents_bp: {e}")

        try:
            from family_portal_api import family_portal_bp
            app.register_blueprint(family_portal_bp, url_prefix='/api')
        except ImportError as e:
            print(f"Could not import family_portal_bp: {e}")

        try:
            from performance_monitoring_api import performance_monitoring_bp
            app.register_blueprint(performance_monitoring_bp)
        except ImportError as e:
            print(f"Could not import performance_monitoring_bp: {e}")

        try:
            from session_scheduling_api import session_scheduling_bp
            app.register_blueprint(session_scheduling_bp)
        except ImportError as e:
            print(f"Could not import session_scheduling_bp: {e}")

        try:
            from finance_api import finance_bp
            app.register_blueprint(finance_bp)
        except ImportError as e:
            print(f"Could not import finance_bp: {e}")

        try:
            from hr_api import hr_bp
            app.register_blueprint(hr_bp)
        except ImportError as e:
            print(f"Could not import hr_bp: {e}")

        try:
            from inventory_api import inventory_bp
            app.register_blueprint(inventory_bp)
        except ImportError as e:
            print(f"Could not import inventory_bp: {e}")

        try:
            from reports_api import reports_bp
            app.register_blueprint(reports_bp)
        except ImportError as e:
            print(f"Could not import reports_bp: {e}")

        try:
            from speech_therapy_api import speech_therapy_bp
            app.register_blueprint(speech_therapy_bp)
        except ImportError as e:
            print(f"Could not import speech_therapy_bp: {e}")

        try:
            from rehabilitation_programs_api import rehabilitation_programs_bp
            app.register_blueprint(rehabilitation_programs_bp)
        except ImportError as e:
            print(f"Could not import rehabilitation_programs_bp: {e}")

        try:
            from appointments_calendar_api import appointments_calendar_bp
            app.register_blueprint(appointments_calendar_bp)
        except ImportError as e:
            print(f"Could not import appointments_calendar_bp: {e}")

        try:
            from comprehensive_rehabilitation_api import comprehensive_rehab_bp
            app.register_blueprint(comprehensive_rehab_bp)
        except ImportError as e:
            print(f"Could not import comprehensive_rehab_bp: {e}")


        # Register CLI commands
        @app.cli.command("init-db")
        def init_db_command():
            """Creates the database tables."""
            db.create_all()
            print("Initialized the database.")

    return app
