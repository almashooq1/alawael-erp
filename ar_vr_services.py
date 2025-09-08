# -*- coding: utf-8 -*-
"""
خدمات نظام الواقع المعزز والافتراضي
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from ar_vr_models import (
    ARVRContent, ARVRSession, ARVRInteraction, VirtualEnvironment,
    ARMarker, TherapyScenario, DeviceCalibration, ARVRAnalytics,
    ExperienceType, ContentCategory, InteractionType
)
from datetime import datetime, timedelta, date
import json
import uuid
import numpy as np
from sqlalchemy import func, and_

class ARVRService:
    """خدمة الواقع المعزز والافتراضي"""
    
    def create_content(self, content_data, user_id):
        """إنشاء محتوى AR/VR جديد"""
        try:
            content = ARVRContent(
                title_ar=content_data['title_ar'],
                title_en=content_data.get('title_en'),
                description_ar=content_data.get('description_ar'),
                description_en=content_data.get('description_en'),
                experience_type=ExperienceType(content_data['experience_type']),
                category=ContentCategory(content_data['category']),
                target_age_min=content_data.get('target_age_min'),
                target_age_max=content_data.get('target_age_max'),
                target_disabilities=content_data.get('target_disabilities', []),
                learning_objectives=content_data.get('learning_objectives', []),
                content_path=content_data['content_path'],
                thumbnail_url=content_data.get('thumbnail_url'),
                preview_video_url=content_data.get('preview_video_url'),
                duration_minutes=content_data.get('duration_minutes'),
                difficulty_level=content_data.get('difficulty_level', 'beginner'),
                supported_devices=content_data.get('supported_devices', []),
                interaction_types=content_data.get('interaction_types', []),
                accessibility_features=content_data.get('accessibility_features', []),
                safety_guidelines=content_data.get('safety_guidelines', []),
                file_size_mb=content_data.get('file_size_mb'),
                requires_supervision=content_data.get('requires_supervision', True),
                created_by=str(user_id)
            )
            
            db.session.add(content)
            db.session.commit()
            
            return self._content_to_dict(content)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في إنشاء المحتوى: {str(e)}")
    
    def start_session(self, session_data, user_id):
        """بدء جلسة AR/VR"""
        try:
            # التحقق من وجود المحتوى
            content = ARVRContent.query.get(session_data['content_id'])
            if not content or not content.is_active:
                raise Exception("المحتوى غير متاح")
            
            session = ARVRSession(
                content_id=session_data['content_id'],
                student_id=session_data['student_id'],
                supervisor_id=session_data['supervisor_id'],
                device_used=session_data.get('device_used'),
                session_start=datetime.utcnow()
            )
            
            db.session.add(session)
            db.session.commit()
            
            return self._session_to_dict(session)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في بدء الجلسة: {str(e)}")
    
    def end_session(self, session_id, session_data):
        """إنهاء جلسة AR/VR"""
        try:
            session = ARVRSession.query.get(session_id)
            if not session:
                raise Exception("الجلسة غير موجودة")
            
            session.session_end = datetime.utcnow()
            session.duration_seconds = session_data.get('duration_seconds')
            session.completion_percentage = session_data.get('completion_percentage', 0)
            session.objectives_achieved = session_data.get('objectives_achieved', [])
            session.performance_metrics = session_data.get('performance_metrics', {})
            session.comfort_level = session_data.get('comfort_level')
            session.motion_sickness = session_data.get('motion_sickness', False)
            session.engagement_score = session_data.get('engagement_score')
            session.learning_progress = session_data.get('learning_progress', {})
            session.behavioral_observations = session_data.get('behavioral_observations')
            session.technical_issues = session_data.get('technical_issues', [])
            session.session_notes = session_data.get('session_notes')
            
            db.session.commit()
            
            # تحديث التحليلات
            self._update_analytics(session)
            
            return self._session_to_dict(session)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في إنهاء الجلسة: {str(e)}")
    
    def record_interaction(self, interaction_data):
        """تسجيل تفاعل في الجلسة"""
        try:
            interaction = ARVRInteraction(
                session_id=interaction_data['session_id'],
                interaction_type=InteractionType(interaction_data['interaction_type']),
                object_interacted=interaction_data.get('object_interacted'),
                action_performed=interaction_data.get('action_performed'),
                position_x=interaction_data.get('position_x'),
                position_y=interaction_data.get('position_y'),
                position_z=interaction_data.get('position_z'),
                head_rotation=interaction_data.get('head_rotation'),
                hand_position=interaction_data.get('hand_position'),
                gaze_direction=interaction_data.get('gaze_direction'),
                interaction_duration=interaction_data.get('interaction_duration'),
                success=interaction_data.get('success'),
                accuracy=interaction_data.get('accuracy'),
                response_time=interaction_data.get('response_time'),
                metadata=interaction_data.get('metadata', {})
            )
            
            db.session.add(interaction)
            db.session.commit()
            
            return self._interaction_to_dict(interaction)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في تسجيل التفاعل: {str(e)}")
    
    def get_student_sessions(self, student_id, filters=None):
        """الحصول على جلسات الطالب"""
        try:
            query = ARVRSession.query.filter_by(student_id=student_id)
            
            if filters:
                if filters.get('content_id'):
                    query = query.filter_by(content_id=filters['content_id'])
                if filters.get('date_from'):
                    query = query.filter(ARVRSession.session_start >= filters['date_from'])
                if filters.get('date_to'):
                    query = query.filter(ARVRSession.session_start <= filters['date_to'])
                if filters.get('experience_type'):
                    query = query.join(ARVRContent).filter(
                        ARVRContent.experience_type == filters['experience_type']
                    )
            
            sessions = query.order_by(ARVRSession.session_start.desc()).all()
            return [self._session_to_dict(session) for session in sessions]
        except Exception as e:
            raise Exception(f"خطأ في جلب الجلسات: {str(e)}")
    
    def get_content_library(self, filters=None):
        """الحصول على مكتبة المحتوى"""
        try:
            query = ARVRContent.query.filter_by(is_active=True)
            
            if filters:
                if filters.get('experience_type'):
                    query = query.filter_by(experience_type=filters['experience_type'])
                if filters.get('category'):
                    query = query.filter_by(category=filters['category'])
                if filters.get('age_min') and filters.get('age_max'):
                    query = query.filter(
                        and_(
                            ARVRContent.target_age_min <= filters['age_max'],
                            ARVRContent.target_age_max >= filters['age_min']
                        )
                    )
                if filters.get('difficulty_level'):
                    query = query.filter_by(difficulty_level=filters['difficulty_level'])
                if filters.get('target_disability'):
                    # البحث في JSON array
                    query = query.filter(
                        ARVRContent.target_disabilities.contains([filters['target_disability']])
                    )
            
            content_list = query.order_by(ARVRContent.created_at.desc()).all()
            return [self._content_to_dict(content) for content in content_list]
        except Exception as e:
            raise Exception(f"خطأ في جلب المحتوى: {str(e)}")
    
    def create_therapy_scenario(self, scenario_data, user_id):
        """إنشاء سيناريو علاجي"""
        try:
            scenario = TherapyScenario(
                name_ar=scenario_data['name_ar'],
                name_en=scenario_data.get('name_en'),
                therapy_type=scenario_data['therapy_type'],
                target_condition=scenario_data['target_condition'],
                scenario_description=scenario_data.get('scenario_description'),
                difficulty_progression=scenario_data.get('difficulty_progression', []),
                success_criteria=scenario_data.get('success_criteria', []),
                safety_protocols=scenario_data.get('safety_protocols', []),
                therapist_controls=scenario_data.get('therapist_controls', {}),
                data_collection=scenario_data.get('data_collection', {}),
                adaptation_rules=scenario_data.get('adaptation_rules', {}),
                created_by=str(user_id)
            )
            
            db.session.add(scenario)
            db.session.commit()
            
            return self._scenario_to_dict(scenario)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في إنشاء السيناريو: {str(e)}")
    
    def calibrate_device(self, calibration_data, user_id):
        """معايرة الجهاز"""
        try:
            calibration = DeviceCalibration(
                device_id=calibration_data['device_id'],
                device_type=calibration_data['device_type'],
                user_id=user_id,
                calibration_data=calibration_data['calibration_data'],
                ipd_measurement=calibration_data.get('ipd_measurement'),
                height_adjustment=calibration_data.get('height_adjustment'),
                tracking_area=calibration_data.get('tracking_area', {}),
                comfort_settings=calibration_data.get('comfort_settings', {}),
                calibration_quality=calibration_data.get('calibration_quality', 'good'),
                calibrated_by=str(user_id)
            )
            
            db.session.add(calibration)
            db.session.commit()
            
            return self._calibration_to_dict(calibration)
        except Exception as e:
            db.session.rollback()
            raise Exception(f"خطأ في معايرة الجهاز: {str(e)}")
    
    def get_analytics_dashboard(self, filters=None):
        """الحصول على بيانات لوحة التحكم"""
        try:
            # إحصائيات عامة
            total_content = ARVRContent.query.filter_by(is_active=True).count()
            total_sessions = ARVRSession.query.count()
            active_users = db.session.query(func.count(func.distinct(ARVRSession.student_id))).scalar()
            
            # جلسات اليوم
            today = date.today()
            today_sessions = ARVRSession.query.filter(
                func.date(ARVRSession.session_start) == today
            ).count()
            
            # متوسط مدة الجلسة
            avg_duration = db.session.query(func.avg(ARVRSession.duration_seconds)).scalar() or 0
            avg_duration_minutes = avg_duration / 60 if avg_duration else 0
            
            # معدل الإكمال
            completed_sessions = ARVRSession.query.filter(
                ARVRSession.completion_percentage >= 80
            ).count()
            completion_rate = (completed_sessions / max(total_sessions, 1)) * 100
            
            # توزيع أنواع المحتوى
            content_distribution = db.session.query(
                ARVRContent.experience_type,
                func.count(ARVRContent.id)
            ).filter_by(is_active=True).group_by(ARVRContent.experience_type).all()
            
            # أكثر المحتويات استخداماً
            popular_content = db.session.query(
                ARVRContent.title_ar,
                func.count(ARVRSession.id).label('session_count')
            ).join(ARVRSession).group_by(ARVRContent.id).order_by(
                func.count(ARVRSession.id).desc()
            ).limit(5).all()
            
            # معدل الرضا
            avg_engagement = db.session.query(func.avg(ARVRSession.engagement_score)).scalar() or 0
            
            # مشاكل تقنية
            motion_sickness_rate = db.session.query(
                func.count(ARVRSession.id)
            ).filter_by(motion_sickness=True).scalar() or 0
            motion_sickness_percentage = (motion_sickness_rate / max(total_sessions, 1)) * 100
            
            return {
                'overview': {
                    'total_content': total_content,
                    'total_sessions': total_sessions,
                    'active_users': active_users,
                    'today_sessions': today_sessions,
                    'avg_session_duration': round(avg_duration_minutes, 1),
                    'completion_rate': round(completion_rate, 1),
                    'avg_engagement_score': round(avg_engagement, 1),
                    'motion_sickness_rate': round(motion_sickness_percentage, 1)
                },
                'content_distribution': {
                    str(exp_type.value): count for exp_type, count in content_distribution
                },
                'popular_content': [
                    {'title': title, 'sessions': count} for title, count in popular_content
                ]
            }
        except Exception as e:
            raise Exception(f"خطأ في جلب بيانات لوحة التحكم: {str(e)}")
    
    def get_session_analytics(self, session_id):
        """تحليل تفصيلي للجلسة"""
        try:
            session = ARVRSession.query.get(session_id)
            if not session:
                raise Exception("الجلسة غير موجودة")
            
            # جلب التفاعلات
            interactions = ARVRInteraction.query.filter_by(session_id=session_id).all()
            
            # تحليل التفاعلات
            interaction_analysis = self._analyze_interactions(interactions)
            
            # تحليل الأداء
            performance_analysis = self._analyze_performance(session, interactions)
            
            return {
                'session_info': self._session_to_dict(session),
                'interaction_analysis': interaction_analysis,
                'performance_analysis': performance_analysis,
                'recommendations': self._generate_session_recommendations(session, interactions)
            }
        except Exception as e:
            raise Exception(f"خطأ في تحليل الجلسة: {str(e)}")
    
    def _analyze_interactions(self, interactions):
        """تحليل التفاعلات"""
        if not interactions:
            return {}
        
        # إحصائيات التفاعل
        total_interactions = len(interactions)
        successful_interactions = sum(1 for i in interactions if i.success)
        success_rate = (successful_interactions / total_interactions) * 100 if total_interactions > 0 else 0
        
        # متوسط وقت الاستجابة
        response_times = [i.response_time for i in interactions if i.response_time]
        avg_response_time = np.mean(response_times) if response_times else 0
        
        # توزيع أنواع التفاعل
        interaction_types = {}
        for interaction in interactions:
            interaction_type = interaction.interaction_type.value
            interaction_types[interaction_type] = interaction_types.get(interaction_type, 0) + 1
        
        # دقة التفاعل
        accuracies = [i.accuracy for i in interactions if i.accuracy is not None]
        avg_accuracy = np.mean(accuracies) if accuracies else 0
        
        return {
            'total_interactions': total_interactions,
            'success_rate': round(success_rate, 1),
            'avg_response_time': round(avg_response_time, 3),
            'avg_accuracy': round(avg_accuracy, 2),
            'interaction_types': interaction_types
        }
    
    def _analyze_performance(self, session, interactions):
        """تحليل الأداء"""
        performance = {
            'completion_percentage': session.completion_percentage or 0,
            'engagement_score': session.engagement_score or 0,
            'comfort_level': session.comfort_level,
            'motion_sickness': session.motion_sickness,
            'objectives_achieved': len(session.objectives_achieved or []),
            'session_duration_minutes': session.duration_seconds / 60 if session.duration_seconds else 0
        }
        
        # تحليل التقدم خلال الجلسة
        if interactions:
            # تقسيم الجلسة إلى أجزاء زمنية
            session_start = session.session_start
            time_segments = []
            
            for i, interaction in enumerate(interactions):
                if interaction.timestamp and session_start:
                    time_diff = (interaction.timestamp - session_start).total_seconds()
                    segment = int(time_diff / 60)  # تقسيم بالدقائق
                    time_segments.append({
                        'segment': segment,
                        'success': interaction.success,
                        'accuracy': interaction.accuracy
                    })
            
            performance['progress_over_time'] = time_segments
        
        return performance
    
    def _generate_session_recommendations(self, session, interactions):
        """إنشاء توصيات بناءً على الجلسة"""
        recommendations = []
        
        # توصيات بناءً على معدل الإكمال
        if session.completion_percentage and session.completion_percentage < 50:
            recommendations.append("النظر في تقليل مدة الجلسة أو تبسيط المحتوى")
        
        # توصيات بناءً على دوار الحركة
        if session.motion_sickness:
            recommendations.append("تقليل الحركة السريعة في المحتوى وإضافة فترات راحة")
        
        # توصيات بناءً على التفاعل
        if interactions:
            success_rate = sum(1 for i in interactions if i.success) / len(interactions) * 100
            if success_rate < 60:
                recommendations.append("تحسين واجهة التفاعل أو توفير المزيد من التوجيه")
        
        # توصيات بناءً على مستوى التفاعل
        if session.engagement_score and session.engagement_score < 60:
            recommendations.append("إضافة عناصر تفاعلية أكثر أو تحسين المحتوى البصري")
        
        return recommendations
    
    def _update_analytics(self, session):
        """تحديث التحليلات اليومية"""
        try:
            today = date.today()
            analytics = ARVRAnalytics.query.filter_by(
                content_id=session.content_id,
                date=today
            ).first()
            
            if not analytics:
                analytics = ARVRAnalytics(
                    content_id=session.content_id,
                    date=today
                )
                db.session.add(analytics)
            
            # تحديث الإحصائيات
            analytics.total_sessions = (analytics.total_sessions or 0) + 1
            
            if session.duration_seconds:
                current_avg = analytics.avg_session_duration or 0
                total_sessions = analytics.total_sessions
                analytics.avg_session_duration = (
                    (current_avg * (total_sessions - 1) + session.duration_seconds / 60) / total_sessions
                )
            
            if session.completion_percentage is not None:
                current_avg = analytics.avg_completion_rate or 0
                total_sessions = analytics.total_sessions
                analytics.avg_completion_rate = (
                    (current_avg * (total_sessions - 1) + session.completion_percentage) / total_sessions
                )
            
            if session.engagement_score is not None:
                current_avg = analytics.avg_engagement_score or 0
                total_sessions = analytics.total_sessions
                analytics.avg_engagement_score = (
                    (current_avg * (total_sessions - 1) + session.engagement_score) / total_sessions
                )
            
            if session.motion_sickness:
                analytics.motion_sickness_incidents = (analytics.motion_sickness_incidents or 0) + 1
            
            if session.technical_issues:
                analytics.technical_issues_count = (analytics.technical_issues_count or 0) + len(session.technical_issues)
            
            db.session.commit()
        except Exception as e:
            print(f"خطأ في تحديث التحليلات: {str(e)}")
    
    def _content_to_dict(self, content):
        """تحويل المحتوى إلى قاموس"""
        return {
            'id': content.id,
            'title_ar': content.title_ar,
            'title_en': content.title_en,
            'description_ar': content.description_ar,
            'description_en': content.description_en,
            'experience_type': content.experience_type.value,
            'category': content.category.value,
            'target_age_min': content.target_age_min,
            'target_age_max': content.target_age_max,
            'target_disabilities': content.target_disabilities,
            'learning_objectives': content.learning_objectives,
            'content_path': content.content_path,
            'thumbnail_url': content.thumbnail_url,
            'preview_video_url': content.preview_video_url,
            'duration_minutes': content.duration_minutes,
            'difficulty_level': content.difficulty_level,
            'supported_devices': content.supported_devices,
            'interaction_types': content.interaction_types,
            'accessibility_features': content.accessibility_features,
            'safety_guidelines': content.safety_guidelines,
            'file_size_mb': content.file_size_mb,
            'version': content.version,
            'is_active': content.is_active,
            'requires_supervision': content.requires_supervision,
            'created_at': content.created_at.isoformat() if content.created_at else None
        }
    
    def _session_to_dict(self, session):
        """تحويل الجلسة إلى قاموس"""
        return {
            'id': session.id,
            'content_id': session.content_id,
            'student_id': session.student_id,
            'supervisor_id': session.supervisor_id,
            'device_used': session.device_used,
            'session_start': session.session_start.isoformat() if session.session_start else None,
            'session_end': session.session_end.isoformat() if session.session_end else None,
            'duration_seconds': session.duration_seconds,
            'completion_percentage': session.completion_percentage,
            'objectives_achieved': session.objectives_achieved,
            'performance_metrics': session.performance_metrics,
            'comfort_level': session.comfort_level,
            'motion_sickness': session.motion_sickness,
            'engagement_score': session.engagement_score,
            'learning_progress': session.learning_progress,
            'behavioral_observations': session.behavioral_observations,
            'technical_issues': session.technical_issues,
            'session_notes': session.session_notes
        }
    
    def _interaction_to_dict(self, interaction):
        """تحويل التفاعل إلى قاموس"""
        return {
            'id': interaction.id,
            'session_id': interaction.session_id,
            'interaction_type': interaction.interaction_type.value,
            'object_interacted': interaction.object_interacted,
            'action_performed': interaction.action_performed,
            'position': {
                'x': interaction.position_x,
                'y': interaction.position_y,
                'z': interaction.position_z
            },
            'head_rotation': interaction.head_rotation,
            'hand_position': interaction.hand_position,
            'gaze_direction': interaction.gaze_direction,
            'interaction_duration': interaction.interaction_duration,
            'success': interaction.success,
            'accuracy': interaction.accuracy,
            'response_time': interaction.response_time,
            'timestamp': interaction.timestamp.isoformat() if interaction.timestamp else None,
            'metadata': interaction.metadata
        }
    
    def _scenario_to_dict(self, scenario):
        """تحويل السيناريو إلى قاموس"""
        return {
            'id': scenario.id,
            'name_ar': scenario.name_ar,
            'name_en': scenario.name_en,
            'therapy_type': scenario.therapy_type,
            'target_condition': scenario.target_condition,
            'scenario_description': scenario.scenario_description,
            'difficulty_progression': scenario.difficulty_progression,
            'success_criteria': scenario.success_criteria,
            'safety_protocols': scenario.safety_protocols,
            'therapist_controls': scenario.therapist_controls,
            'data_collection': scenario.data_collection,
            'adaptation_rules': scenario.adaptation_rules,
            'created_at': scenario.created_at.isoformat() if scenario.created_at else None
        }
    
    def _calibration_to_dict(self, calibration):
        """تحويل المعايرة إلى قاموس"""
        return {
            'id': calibration.id,
            'device_id': calibration.device_id,
            'device_type': calibration.device_type,
            'user_id': calibration.user_id,
            'calibration_data': calibration.calibration_data,
            'ipd_measurement': calibration.ipd_measurement,
            'height_adjustment': calibration.height_adjustment,
            'tracking_area': calibration.tracking_area,
            'comfort_settings': calibration.comfort_settings,
            'calibration_quality': calibration.calibration_quality,
            'calibrated_at': calibration.calibrated_at.isoformat() if calibration.calibrated_at else None
        }
