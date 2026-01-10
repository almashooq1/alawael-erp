from flask import Blueprint, render_template
from flask_jwt_extended import jwt_required

main_bp = Blueprint('main', __name__)

# This file will contain the main routes from app.py
# For now, let's add a placeholder for the main dashboard route

@main_bp.route('/')
def index():
    return render_template('login.html')

@main_bp.route('/dashboard')
@jwt_required()
def dashboard():
    return render_template('dashboard.html')
