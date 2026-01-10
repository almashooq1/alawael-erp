#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Session Scheduling and Calendar Models for Rehabilitation Programs
Advanced scheduling system with calendar integration, automated scheduling, and conflict resolution
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, Boolean, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, date, time, timedelta
from enum import Enum
import uuid

from app import db

# Enums for scheduling system
class ScheduleStatus(Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    NO_SHOW = "no_show"

class RecurrenceType(Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class RoomType(Enum):
    THERAPY_ROOM = "therapy_room"
    GROUP_ROOM = "group_room"
    ASSESSMENT_ROOM = "assessment_room"
    SENSORY_ROOM = "sensory_room"
    PHYSICAL_THERAPY = "physical_therapy"
    SPEECH_THERAPY = "speech_therapy"
    OCCUPATIONAL_THERAPY = "occupational_therapy"

class ConflictType(Enum):
    THERAPIST_DOUBLE_BOOKING = "therapist_double_booking"
    ROOM_DOUBLE_BOOKING = "room_double_booking"
    BENEFICIARY_DOUBLE_BOOKING = "beneficiary_double_booking"
    EQUIPMENT_CONFLICT = "equipment_conflict"
    TIME_CONSTRAINT = "time_constraint"

class NotificationMethod(Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"
    PHONE_CALL = "phone_call"

# Core scheduling models
class TherapyRoom(db.Model):
    """Therapy rooms and facilities management"""
    __tablename__ = 'therapy_rooms'
    
    id = Column(Integer, primary_key=True)
    room_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    room_type = Column(SQLEnum(RoomType), nullable=False)
    capacity = Column(Integer, default=1)
    floor_number = Column(Integer)
    building = Column(String(50))
    description = Column(Text)
    
    # Equipment and features
    available_equipment = Column(JSON)  # List of equipment IDs
    accessibility_features = Column(JSON)  # Wheelchair access, etc.
    special_features = Column(JSON)  # Sensory equipment, mirrors, etc.
    
    # Availability
    is_active = Column(Boolean, default=True)
    maintenance_schedule = Column(JSON)
    operating_hours = Column(JSON)  # Daily operating hours
    
    # Relationships
    sessions = relationship('SessionSchedule', back_populates='room')
    bookings = relationship('RoomBooking', back_populates='room')
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

class TherapistSchedule(db.Model):
    """Therapist availability and working schedules"""
    __tablename__ = 'therapist_schedules'
    
    id = Column(Integer, primary_key=True)
    therapist_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Schedule details
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Availability settings
    is_available = Column(Boolean, default=True)
    max_sessions_per_day = Column(Integer, default=8)
    break_duration_minutes = Column(Integer, default=15)
    lunch_break_start = Column(Time)
    lunch_break_end = Column(Time)
    
    # Specializations and preferences
    preferred_session_types = Column(JSON)
    max_consecutive_sessions = Column(Integer, default=3)
    travel_time_between_sessions = Column(Integer, default=10)  # minutes
    
    # Date range for schedule validity
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    
    # Relationships
    therapist = relationship('User', foreign_keys=[therapist_id])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

class SessionSchedule(db.Model):
    """Advanced session scheduling with calendar integration"""
    __tablename__ = 'session_schedules'
    
    id = Column(Integer, primary_key=True)
    schedule_uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Basic session information
    beneficiary_id = Column(Integer, ForeignKey('rehabilitation_beneficiaries.id'), nullable=False)
    program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'), nullable=False)
    therapist_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assistant_therapist_id = Column(Integer, ForeignKey('users.id'))
    
    # Scheduling details
    scheduled_date = Column(Date, nullable=False)
    scheduled_start_time = Column(Time, nullable=False)
    scheduled_end_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Location and resources
    room_id = Column(Integer, ForeignKey('therapy_rooms.id'))
    required_equipment = Column(JSON)  # List of equipment needed
    
    # Session details
    session_type = Column(String(50))  # individual, group, assessment
    session_objectives = Column(JSON)
    preparation_notes = Column(Text)
    
    # Status and tracking
    status = Column(SQLEnum(ScheduleStatus), default=ScheduleStatus.DRAFT)
    confirmation_code = Column(String(10))
    
    # Recurrence settings
    recurrence_type = Column(SQLEnum(RecurrenceType), default=RecurrenceType.NONE)
    recurrence_pattern = Column(JSON)  # Custom recurrence rules
    parent_schedule_id = Column(Integer, ForeignKey('session_schedules.id'))
    recurrence_end_date = Column(Date)
    
    # Actual session tracking
    actual_start_time = Column(DateTime)
    actual_end_time = Column(DateTime)
    attendance_status = Column(String(20))
    cancellation_reason = Column(Text)
    rescheduled_from_id = Column(Integer, ForeignKey('session_schedules.id'))
    
    # Notifications
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)
    confirmation_sent = Column(Boolean, default=False)
    
    # Relationships
    beneficiary = relationship('RehabilitationBeneficiary')
    program = relationship('RehabilitationProgram')
    therapist = relationship('User', foreign_keys=[therapist_id])
    assistant_therapist = relationship('User', foreign_keys=[assistant_therapist_id])
    room = relationship('TherapyRoom', back_populates='sessions')
    parent_schedule = relationship('SessionSchedule', remote_side=[id])
    conflicts = relationship('ScheduleConflict', back_populates='session')
    notifications = relationship('ScheduleNotification', back_populates='session')
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    @property
    def scheduled_datetime(self):
        """Combine date and time for easier handling"""
        return datetime.combine(self.scheduled_date, self.scheduled_start_time)
    
    @property
    def is_past_due(self):
        """Check if session is past due"""
        return self.scheduled_datetime < datetime.now()
    
    @property
    def can_be_cancelled(self):
        """Check if session can still be cancelled"""
        return self.status in [ScheduleStatus.DRAFT, ScheduleStatus.CONFIRMED] and not self.is_past_due

class RoomBooking(db.Model):
    """Room booking and availability management"""
    __tablename__ = 'room_bookings'
    
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey('therapy_rooms.id'), nullable=False)
    session_schedule_id = Column(Integer, ForeignKey('session_schedules.id'))
    
    # Booking details
    booking_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    booking_type = Column(String(50))  # session, maintenance, event, blocked
    
    # Booking information
    booked_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    booking_reason = Column(String(200))
    special_requirements = Column(JSON)
    
    # Status
    is_confirmed = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    cancellation_reason = Column(Text)
    
    # Relationships
    room = relationship('TherapyRoom', back_populates='bookings')
    session = relationship('SessionSchedule')
    booked_by_user = relationship('User', foreign_keys=[booked_by])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleConflict(db.Model):
    """Schedule conflicts detection and resolution"""
    __tablename__ = 'schedule_conflicts'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('session_schedules.id'), nullable=False)
    conflict_type = Column(SQLEnum(ConflictType), nullable=False)
    
    # Conflict details
    conflicting_session_id = Column(Integer, ForeignKey('session_schedules.id'))
    conflicting_resource_id = Column(Integer)  # Room, therapist, or equipment ID
    conflict_description = Column(Text)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolution_method = Column(String(100))
    resolution_notes = Column(Text)
    resolved_by = Column(Integer, ForeignKey('users.id'))
    resolved_at = Column(DateTime)
    
    # Priority and impact
    severity_level = Column(String(20), default='medium')  # low, medium, high, critical
    auto_resolvable = Column(Boolean, default=False)
    
    # Relationships
    session = relationship('SessionSchedule', foreign_keys=[session_id], back_populates='conflicts')
    conflicting_session = relationship('SessionSchedule', foreign_keys=[conflicting_session_id])
    resolver = relationship('User', foreign_keys=[resolved_by])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleNotification(db.Model):
    """Notification system for scheduling"""
    __tablename__ = 'schedule_notifications'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('session_schedules.id'), nullable=False)
    
    # Notification details
    notification_type = Column(String(50))  # reminder, confirmation, cancellation, reschedule
    recipient_type = Column(String(50))  # beneficiary, guardian, therapist, admin
    recipient_id = Column(Integer, ForeignKey('users.id'))
    
    # Delivery settings
    delivery_method = Column(SQLEnum(NotificationMethod), nullable=False)
    recipient_contact = Column(String(100))  # Email, phone number, etc.
    
    # Scheduling
    scheduled_send_time = Column(DateTime, nullable=False)
    send_before_minutes = Column(Integer)  # Minutes before session
    
    # Status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    delivery_status = Column(String(50))  # pending, sent, delivered, failed
    error_message = Column(Text)
    
    # Content
    subject = Column(String(200))
    message_content = Column(Text)
    template_used = Column(String(100))
    
    # Relationships
    session = relationship('SessionSchedule', back_populates='notifications')
    recipient = relationship('User', foreign_keys=[recipient_id])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleTemplate(db.Model):
    """Reusable scheduling templates"""
    __tablename__ = 'schedule_templates'
    
    id = Column(Integer, primary_key=True)
    template_name = Column(String(100), nullable=False)
    template_type = Column(String(50))  # program_based, therapist_based, custom
    
    # Template settings
    program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'))
    therapist_id = Column(Integer, ForeignKey('users.id'))
    
    # Default scheduling parameters
    default_duration_minutes = Column(Integer, default=60)
    default_session_type = Column(String(50))
    preferred_times = Column(JSON)  # Preferred time slots
    preferred_days = Column(JSON)  # Preferred days of week
    
    # Recurrence settings
    default_recurrence = Column(SQLEnum(RecurrenceType), default=RecurrenceType.WEEKLY)
    sessions_per_week = Column(Integer, default=1)
    total_sessions = Column(Integer)
    
    # Requirements
    required_room_type = Column(SQLEnum(RoomType))
    required_equipment = Column(JSON)
    special_requirements = Column(JSON)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    program = relationship('RehabilitationProgram')
    therapist = relationship('User', foreign_keys=[therapist_id])
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

class ScheduleOptimization(db.Model):
    """AI-powered schedule optimization tracking"""
    __tablename__ = 'schedule_optimizations'
    
    id = Column(Integer, primary_key=True)
    optimization_run_id = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Optimization parameters
    optimization_date = Column(Date, nullable=False)
    time_range_start = Column(DateTime, nullable=False)
    time_range_end = Column(DateTime, nullable=False)
    
    # Constraints and preferences
    constraints = Column(JSON)  # Therapist availability, room availability, etc.
    preferences = Column(JSON)  # Preferred times, grouping preferences, etc.
    optimization_goals = Column(JSON)  # Minimize travel time, maximize utilization, etc.
    
    # Results
    original_schedule_score = Column(Float)
    optimized_schedule_score = Column(Float)
    improvement_percentage = Column(Float)
    
    # Changes made
    sessions_moved = Column(Integer, default=0)
    sessions_created = Column(Integer, default=0)
    sessions_cancelled = Column(Integer, default=0)
    conflicts_resolved = Column(Integer, default=0)
    
    # Status
    optimization_status = Column(String(50))  # running, completed, failed, cancelled
    execution_time_seconds = Column(Float)
    error_message = Column(Text)
    
    # Implementation
    is_implemented = Column(Boolean, default=False)
    implemented_at = Column(DateTime)
    implemented_by = Column(Integer, ForeignKey('users.id'))
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))

# Calendar integration models
class CalendarEvent(db.Model):
    """Calendar events for external calendar integration"""
    __tablename__ = 'calendar_events'
    
    id = Column(Integer, primary_key=True)
    event_uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Event details
    title = Column(String(200), nullable=False)
    description = Column(Text)
    event_type = Column(String(50))  # session, appointment, meeting, holiday
    
    # Timing
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    is_all_day = Column(Boolean, default=False)
    timezone = Column(String(50), default='Asia/Riyadh')
    
    # Recurrence
    recurrence_rule = Column(String(500))  # RRULE format
    recurrence_exceptions = Column(JSON)  # Exception dates
    
    # Participants
    organizer_id = Column(Integer, ForeignKey('users.id'))
    attendees = Column(JSON)  # List of attendee information
    
    # Location and resources
    location = Column(String(200))
    room_id = Column(Integer, ForeignKey('therapy_rooms.id'))
    
    # Status and visibility
    status = Column(String(20), default='confirmed')  # tentative, confirmed, cancelled
    visibility = Column(String(20), default='private')  # public, private, confidential
    
    # External calendar integration
    external_calendar_id = Column(String(100))
    external_event_id = Column(String(100))
    sync_status = Column(String(50))  # synced, pending, failed
    last_sync_at = Column(DateTime)
    
    # Relationships
    session_schedule_id = Column(Integer, ForeignKey('session_schedules.id'))
    organizer = relationship('User', foreign_keys=[organizer_id])
    room = relationship('TherapyRoom')
    session = relationship('SessionSchedule')
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

class ScheduleStatistics(db.Model):
    """Schedule statistics and analytics"""
    __tablename__ = 'schedule_statistics'
    
    id = Column(Integer, primary_key=True)
    
    # Time period
    date = Column(Date, nullable=False)
    week_start_date = Column(Date)
    month = Column(Integer)
    year = Column(Integer)
    
    # Utilization metrics
    total_scheduled_sessions = Column(Integer, default=0)
    completed_sessions = Column(Integer, default=0)
    cancelled_sessions = Column(Integer, default=0)
    no_show_sessions = Column(Integer, default=0)
    
    # Efficiency metrics
    therapist_utilization_rate = Column(Float)  # Percentage
    room_utilization_rate = Column(Float)  # Percentage
    average_session_duration = Column(Float)  # Minutes
    
    # Quality metrics
    on_time_start_rate = Column(Float)  # Percentage
    conflicts_count = Column(Integer, default=0)
    resolved_conflicts_count = Column(Integer, default=0)
    
    # Resource-specific metrics
    therapist_id = Column(Integer, ForeignKey('users.id'))
    room_id = Column(Integer, ForeignKey('therapy_rooms.id'))
    program_id = Column(Integer, ForeignKey('rehabilitation_programs.id'))
    
    # Relationships
    therapist = relationship('User', foreign_keys=[therapist_id])
    room = relationship('TherapyRoom')
    program = relationship('RehabilitationProgram')
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
