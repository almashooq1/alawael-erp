#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Educational Games Platform Models
Interactive learning games for special needs students
"""

from datetime import datetime, date
from enum import Enum
import uuid
import json

# Import db from database module to avoid conflicts
from database import db

class GameCategory(Enum):
    """فئات الألعاب التعليمية"""
    COGNITIVE = 'cognitive'
    MOTOR = 'motor'
    SOCIAL = 'social'
    COMMUNICATION = 'communication'
    ACADEMIC = 'academic'
    BEHAVIORAL = 'behavioral'

class DifficultyLevel(Enum):
    """مستويات الصعوبة"""
    BEGINNER = 'beginner'
    INTERMEDIATE = 'intermediate'
    ADVANCED = 'advanced'
    EXPERT = 'expert'

class GameType(Enum):
    """أنواع الألعاب"""
    PUZZLE = 'puzzle'
    MEMORY = 'memory'
    MATCHING = 'matching'
    SEQUENCE = 'sequence'
    DRAWING = 'drawing'
    STORY = 'story'
    SIMULATION = 'simulation'

class EducationalGame(db.Model):
    """الألعاب التعليمية"""
    __tablename__ = 'educational_games'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_ar = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description_ar = db.Column(db.Text)
    description_en = db.Column(db.Text)
    category = db.Column(db.Enum(GameCategory), nullable=False)
    game_type = db.Column(db.Enum(GameType), nullable=False)
    difficulty_level = db.Column(db.Enum(DifficultyLevel), default=DifficultyLevel.BEGINNER)
    target_age_min = db.Column(db.Integer)
    target_age_max = db.Column(db.Integer)
    target_disabilities = db.Column(db.JSON)  # أنواع الإعاقات المستهدفة
    learning_objectives = db.Column(db.JSON)  # الأهداف التعليمية
    game_config = db.Column(db.JSON, nullable=False)  # تكوين اللعبة
    assets_path = db.Column(db.String(500))  # مسار الملفات
    thumbnail_url = db.Column(db.String(500))
    duration_minutes = db.Column(db.Integer)  # المدة المتوقعة
    max_score = db.Column(db.Integer, default=100)
    is_multiplayer = db.Column(db.Boolean, default=False)
    requires_supervision = db.Column(db.Boolean, default=False)
    accessibility_features = db.Column(db.JSON)  # ميزات إمكانية الوصول
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    sessions = db.relationship('GameSession', backref='game', lazy=True)
    achievements = db.relationship('GameAchievement', backref='game', lazy=True)

class GameSession(db.Model):
    """جلسات اللعب"""
    __tablename__ = 'game_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = db.Column(db.String(36), db.ForeignKey('educational_games.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))
    session_start = db.Column(db.DateTime, default=datetime.utcnow)
    session_end = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)
    score_achieved = db.Column(db.Integer, default=0)
    completion_percentage = db.Column(db.Float, default=0.0)
    attempts_count = db.Column(db.Integer, default=0)
    hints_used = db.Column(db.Integer, default=0)
    mistakes_count = db.Column(db.Integer, default=0)
    session_data = db.Column(db.JSON)  # بيانات الجلسة التفصيلية
    performance_metrics = db.Column(db.JSON)  # مقاييس الأداء
    emotional_state = db.Column(db.String(50))  # الحالة العاطفية
    engagement_level = db.Column(db.String(50))  # مستوى التفاعل
    is_completed = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    
    # Relations
    student = db.relationship('Student', backref='game_sessions')
    teacher = db.relationship('Teacher', backref='supervised_game_sessions')
    interactions = db.relationship('GameInteraction', backref='session', lazy=True)

class GameInteraction(db.Model):
    """تفاعلات اللعبة التفصيلية"""
    __tablename__ = 'game_interactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey('game_sessions.id'), nullable=False)
    interaction_type = db.Column(db.String(50), nullable=False)  # click, drag, voice, gesture
    element_id = db.Column(db.String(100))  # معرف العنصر المتفاعل معه
    action = db.Column(db.String(100))  # نوع الإجراء
    position_x = db.Column(db.Float)  # موقع التفاعل
    position_y = db.Column(db.Float)
    response_time = db.Column(db.Float)  # وقت الاستجابة بالثواني
    is_correct = db.Column(db.Boolean)
    difficulty_at_time = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    extra_metadata = db.Column(db.JSON)  # معلومات إضافية

class GameAchievement(db.Model):
    """إنجازات الألعاب"""
    __tablename__ = 'game_achievements'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = db.Column(db.String(36), db.ForeignKey('educational_games.id'))
    name_ar = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description_ar = db.Column(db.Text)
    description_en = db.Column(db.Text)
    icon_url = db.Column(db.String(500))
    criteria = db.Column(db.JSON, nullable=False)  # معايير الحصول على الإنجاز
    points_reward = db.Column(db.Integer, default=0)
    badge_color = db.Column(db.String(20), default='gold')
    rarity = db.Column(db.String(20), default='common')  # common, rare, epic, legendary
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudentAchievement(db.Model):
    """إنجازات الطلاب"""
    __tablename__ = 'student_achievements'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    achievement_id = db.Column(db.String(36), db.ForeignKey('game_achievements.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    session_id = db.Column(db.String(36), db.ForeignKey('game_sessions.id'))  # الجلسة التي حقق فيها الإنجاز
    
    # Relations
    student = db.relationship('Student', backref='achievements')
    achievement = db.relationship('GameAchievement', backref='earned_by')
    session = db.relationship('GameSession', backref='achievements_earned')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('student_id', 'achievement_id', name='unique_student_achievement'),)

class GameReward(db.Model):
    """مكافآت الألعاب"""
    __tablename__ = 'game_rewards'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_ar = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description_ar = db.Column(db.Text)
    description_en = db.Column(db.Text)
    reward_type = db.Column(db.String(50))  # points, badge, item, privilege
    value = db.Column(db.Integer)  # قيمة المكافأة
    icon_url = db.Column(db.String(500))
    unlock_criteria = db.Column(db.JSON)  # معايير فتح المكافأة
    is_consumable = db.Column(db.Boolean, default=False)  # هل يمكن استهلاكها
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudentReward(db.Model):
    """مكافآت الطلاب"""
    __tablename__ = 'student_rewards'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    reward_id = db.Column(db.String(36), db.ForeignKey('game_rewards.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    used_at = db.Column(db.DateTime)  # متى تم استخدامها
    is_used = db.Column(db.Boolean, default=False)
    
    # Relations
    student = db.relationship('Student', backref='rewards')
    reward = db.relationship('GameReward', backref='earned_by')

class GameAnalytics(db.Model):
    """تحليلات الألعاب"""
    __tablename__ = 'game_analytics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = db.Column(db.String(36), db.ForeignKey('educational_games.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_sessions = db.Column(db.Integer, default=0)
    unique_players = db.Column(db.Integer, default=0)
    avg_session_duration = db.Column(db.Float)  # بالدقائق
    avg_score = db.Column(db.Float)
    completion_rate = db.Column(db.Float)  # معدل الإكمال
    engagement_score = db.Column(db.Float)  # درجة التفاعل
    difficulty_distribution = db.Column(db.JSON)  # توزيع مستويات الصعوبة
    common_mistakes = db.Column(db.JSON)  # الأخطاء الشائعة
    improvement_suggestions = db.Column(db.JSON)  # اقتراحات التحسين
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    game = db.relationship('EducationalGame', backref='analytics')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('game_id', 'date', name='unique_game_daily_analytics'),)

class AdaptiveLearning(db.Model):
    """التعلم التكيفي"""
    __tablename__ = 'adaptive_learning'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    game_id = db.Column(db.String(36), db.ForeignKey('educational_games.id'), nullable=False)
    current_difficulty = db.Column(db.Enum(DifficultyLevel), default=DifficultyLevel.BEGINNER)
    performance_history = db.Column(db.JSON)  # تاريخ الأداء
    learning_pace = db.Column(db.String(20))  # fast, normal, slow
    preferred_learning_style = db.Column(db.String(50))  # visual, auditory, kinesthetic
    attention_span = db.Column(db.Integer)  # مدة الانتباه بالدقائق
    motivation_level = db.Column(db.String(20))  # high, medium, low
    recommended_games = db.Column(db.JSON)  # الألعاب الموصى بها
    next_challenge_date = db.Column(db.DateTime)
    adaptation_rules = db.Column(db.JSON)  # قواعد التكيف
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    student = db.relationship('Student', backref='adaptive_learning_profiles')
    game = db.relationship('EducationalGame', backref='adaptive_profiles')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('student_id', 'game_id', name='unique_student_game_adaptation'),)
