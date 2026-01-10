#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Add AR/VR Sample Data
Sample data for Augmented Reality and Virtual Reality system
"""

from datetime import datetime, date, timedelta
import json
import uuid

from app import app
from database import db
from ar_vr_models import (
    ARVRContent, ARVRSession, ARVRInteraction, VirtualEnvironment,
    ARMarker, TherapyScenario, DeviceCalibration, ARVRAnalytics,
    ExperienceType, ContentCategory, InteractionType
)
from models import Student, Teacher, User

def add_ar_vr_sample_data():
    """إضافة بيانات تجريبية لنظام AR/VR"""
    
    with app.app_context():
        try:
            print("إضافة بيانات AR/VR التجريبية...")
            
            # 1. AR/VR Content
            ar_vr_contents = [
                {
                    'title_ar': 'تعلم الألوان بالواقع المعزز',
                    'title_en': 'Learn Colors with AR',
                    'description_ar': 'تطبيق تفاعلي لتعلم الألوان باستخدام الواقع المعزز مع كائنات ثلاثية الأبعاد',
                    'experience_type': ExperienceType.AUGMENTED_REALITY,
                    'category': ContentCategory.EDUCATIONAL,
                    'target_age_min': 3,
                    'target_age_max': 8,
                    'target_disabilities': ['autism', 'intellectual_disability', 'learning_disability'],
                    'learning_objectives': [
                        'التعرف على الألوان الأساسية',
                        'ربط الألوان بالأشياء',
                        'تحسين التركيز والانتباه'
                    ],
                    'content_path': '/ar_content/colors_ar_app',
                    'thumbnail_url': '/static/images/ar_colors_thumb.jpg',
                    'duration_minutes': 15,
                    'difficulty_level': 'beginner',
                    'supported_devices': ['iPad Pro', 'Android Tablet', 'HoloLens 2'],
                    'interaction_types': ['touch', 'gaze', 'gesture'],
                    'accessibility_features': ['voice_guidance', 'large_text', 'high_contrast'],
                    'safety_guidelines': [
                        'استخدام تحت إشراف',
                        'فترات راحة كل 10 دقائق',
                        'إضاءة مناسبة'
                    ],
                    'file_size_mb': 250,
                    'requires_supervision': True
                },
                {
                    'title_ar': 'رحلة في الفضاء الافتراضي',
                    'title_en': 'Virtual Space Journey',
                    'description_ar': 'استكشاف النظام الشمسي في بيئة افتراضية تفاعلية آمنة',
                    'experience_type': ExperienceType.VIRTUAL_REALITY,
                    'category': ContentCategory.EDUCATIONAL,
                    'target_age_min': 8,
                    'target_age_max': 16,
                    'target_disabilities': ['autism', 'adhd', 'learning_disability'],
                    'learning_objectives': [
                        'تعلم الكواكب والنجوم',
                        'فهم المسافات الفضائية',
                        'تطوير الخيال العلمي'
                    ],
                    'content_path': '/vr_content/space_journey',
                    'thumbnail_url': '/static/images/vr_space_thumb.jpg',
                    'duration_minutes': 20,
                    'difficulty_level': 'intermediate',
                    'supported_devices': ['Oculus Quest 2', 'HTC Vive', 'PlayStation VR'],
                    'interaction_types': ['controller', 'gaze', 'voice'],
                    'accessibility_features': ['subtitle', 'audio_description', 'motion_reduction'],
                    'safety_guidelines': [
                        'فحص دوار الحركة',
                        'مساحة آمنة للحركة',
                        'مراقبة مستمرة'
                    ],
                    'file_size_mb': 1200,
                    'requires_supervision': True
                },
                {
                    'title_ar': 'علاج الخوف من المرتفعات',
                    'title_en': 'Height Phobia Therapy',
                    'description_ar': 'برنامج علاجي تدريجي للتغلب على الخوف من المرتفعات',
                    'experience_type': ExperienceType.VIRTUAL_REALITY,
                    'category': ContentCategory.THERAPEUTIC,
                    'target_age_min': 12,
                    'target_age_max': 18,
                    'target_disabilities': ['anxiety', 'phobia'],
                    'learning_objectives': [
                        'تقليل القلق من المرتفعات',
                        'بناء الثقة بالنفس',
                        'تعلم تقنيات الاسترخاء'
                    ],
                    'content_path': '/vr_therapy/height_exposure',
                    'thumbnail_url': '/static/images/vr_height_thumb.jpg',
                    'duration_minutes': 25,
                    'difficulty_level': 'advanced',
                    'supported_devices': ['Oculus Quest 2', 'HTC Vive'],
                    'interaction_types': ['controller', 'gaze'],
                    'accessibility_features': ['panic_button', 'gradual_exposure', 'biometric_monitoring'],
                    'safety_guidelines': [
                        'وجود معالج مختص',
                        'مراقبة العلامات الحيوية',
                        'إيقاف فوري عند الحاجة'
                    ],
                    'file_size_mb': 800,
                    'requires_supervision': True
                },
                {
                    'title_ar': 'تدريب المهارات الاجتماعية',
                    'title_en': 'Social Skills Training',
                    'description_ar': 'محاكاة مواقف اجتماعية مختلفة لتطوير مهارات التفاعل',
                    'experience_type': ExperienceType.VIRTUAL_REALITY,
                    'category': ContentCategory.SOCIAL_SKILLS,
                    'target_age_min': 10,
                    'target_age_max': 18,
                    'target_disabilities': ['autism', 'social_anxiety', 'communication_disorder'],
                    'learning_objectives': [
                        'تحسين التواصل البصري',
                        'فهم لغة الجسد',
                        'ممارسة المحادثات'
                    ],
                    'content_path': '/vr_social/social_training',
                    'thumbnail_url': '/static/images/vr_social_thumb.jpg',
                    'duration_minutes': 30,
                    'difficulty_level': 'intermediate',
                    'supported_devices': ['Oculus Quest 2', 'HTC Vive', 'Magic Leap'],
                    'interaction_types': ['voice', 'gesture', 'gaze'],
                    'accessibility_features': ['social_cues', 'feedback_system', 'progress_tracking'],
                    'safety_guidelines': [
                        'بيئة آمنة للتجريب',
                        'تعزيز إيجابي',
                        'احترام الحدود الشخصية'
                    ],
                    'file_size_mb': 950,
                    'requires_supervision': True
                },
                {
                    'title_ar': 'تعلم المهارات الحياتية بالواقع المختلط',
                    'title_en': 'Life Skills with Mixed Reality',
                    'description_ar': 'تدريب على المهارات الحياتية اليومية باستخدام الواقع المختلط',
                    'experience_type': ExperienceType.MIXED_REALITY,
                    'category': ContentCategory.LIFE_SKILLS,
                    'target_age_min': 12,
                    'target_age_max': 18,
                    'target_disabilities': ['intellectual_disability', 'autism', 'learning_disability'],
                    'learning_objectives': [
                        'تعلم الطبخ الأساسي',
                        'إدارة الأموال',
                        'استخدام المواصلات'
                    ],
                    'content_path': '/mr_content/life_skills',
                    'thumbnail_url': '/static/images/mr_life_thumb.jpg',
                    'duration_minutes': 35,
                    'difficulty_level': 'intermediate',
                    'supported_devices': ['HoloLens 2', 'Magic Leap', 'Mixed Reality Headsets'],
                    'interaction_types': ['gesture', 'voice', 'touch'],
                    'accessibility_features': ['step_by_step', 'visual_cues', 'audio_guidance'],
                    'safety_guidelines': [
                        'بيئة محاكاة آمنة',
                        'تدريب تدريجي',
                        'مراجعة مستمرة'
                    ],
                    'file_size_mb': 1500,
                    'requires_supervision': True
                }
            ]
            
            content_objects = []
            for content_data in ar_vr_contents:
                content = ARVRContent(**content_data)
                content_objects.append(content)
                db.session.add(content)
            
            db.session.flush()  # Get IDs
            
            # 2. Virtual Environments
            environments = [
                {
                    'name_ar': 'الفصل الدراسي الافتراضي',
                    'name_en': 'Virtual Classroom',
                    'description_ar': 'فصل دراسي تفاعلي مع أدوات تعليمية متنوعة',
                    'environment_type': 'classroom',
                    'realism_level': 'realistic',
                    'interactive_objects': ['whiteboard', 'desk', 'books', 'computer'],
                    'navigation_type': 'teleport',
                    'physics_enabled': True,
                    'audio_environment': {
                        'ambient_sound': 'classroom_ambience',
                        'spatial_audio': True
                    },
                    'lighting_conditions': {
                        'type': 'indoor',
                        'brightness': 'medium',
                        'adjustable': True
                    }
                },
                {
                    'name_ar': 'المنزل الآمن',
                    'name_en': 'Safe Home',
                    'description_ar': 'بيئة منزلية آمنة لتعلم المهارات الحياتية',
                    'environment_type': 'home',
                    'realism_level': 'realistic',
                    'interactive_objects': ['kitchen', 'bathroom', 'bedroom', 'living_room'],
                    'navigation_type': 'walk',
                    'physics_enabled': True,
                    'audio_environment': {
                        'ambient_sound': 'home_ambience',
                        'spatial_audio': True
                    },
                    'lighting_conditions': {
                        'type': 'indoor',
                        'brightness': 'warm',
                        'time_of_day': 'adjustable'
                    }
                },
                {
                    'name_ar': 'الحديقة الهادئة',
                    'name_en': 'Peaceful Garden',
                    'description_ar': 'حديقة هادئة للاسترخاء والعلاج النفسي',
                    'environment_type': 'playground',
                    'realism_level': 'stylized',
                    'interactive_objects': ['flowers', 'trees', 'bench', 'fountain'],
                    'navigation_type': 'walk',
                    'physics_enabled': False,
                    'audio_environment': {
                        'ambient_sound': 'nature_sounds',
                        'spatial_audio': True
                    },
                    'lighting_conditions': {
                        'type': 'outdoor',
                        'brightness': 'soft',
                        'weather': 'sunny'
                    }
                }
            ]
            
            for env_data in environments:
                environment = VirtualEnvironment(**env_data)
                db.session.add(environment)
            
            # 3. Therapy Scenarios
            scenarios = [
                {
                    'name_ar': 'علاج الخوف من الكلاب',
                    'name_en': 'Dog Phobia Treatment',
                    'therapy_type': 'exposure',
                    'target_condition': 'phobia',
                    'scenario_description': 'تعرض تدريجي للكلاب في بيئة آمنة',
                    'difficulty_progression': [
                        {'level': 1, 'description': 'رؤية كلب من بعيد'},
                        {'level': 2, 'description': 'الاقتراب من الكلب'},
                        {'level': 3, 'description': 'لمس الكلب الافتراضي'}
                    ],
                    'success_criteria': {
                        'anxiety_reduction': 70,
                        'completion_rate': 80,
                        'comfort_level': 'good'
                    },
                    'safety_protocols': [
                        'مراقبة العلامات الحيوية',
                        'إيقاف فوري عند الحاجة',
                        'جلسات قصيرة'
                    ]
                },
                {
                    'name_ar': 'تدريب المحادثة الاجتماعية',
                    'name_en': 'Social Conversation Training',
                    'therapy_type': 'social_skills',
                    'target_condition': 'autism',
                    'scenario_description': 'ممارسة المحادثات في مواقف اجتماعية مختلفة',
                    'difficulty_progression': [
                        {'level': 1, 'description': 'محادثة مع شخص واحد'},
                        {'level': 2, 'description': 'محادثة في مجموعة صغيرة'},
                        {'level': 3, 'description': 'محادثة في مناسبة اجتماعية'}
                    ],
                    'success_criteria': {
                        'eye_contact_duration': 60,
                        'response_appropriateness': 80,
                        'conversation_length': 120
                    },
                    'safety_protocols': [
                        'بيئة غير محكمة',
                        'تعزيز إيجابي',
                        'احترام الحدود'
                    ]
                }
            ]
            
            for scenario_data in scenarios:
                scenario = TherapyScenario(**scenario_data, created_by='system')
                db.session.add(scenario)
            
            # 4. AR Markers
            markers = [
                {
                    'marker_name': 'علامة الألوان',
                    'marker_type': 'image',
                    'marker_data': b'color_marker_data',
                    'associated_content': {
                        'content_id': content_objects[0].id,
                        'trigger_action': 'show_colors'
                    },
                    'trigger_distance': 0.5,
                    'activation_angle': 45.0,
                    'tracking_quality': 'high'
                },
                {
                    'marker_name': 'رمز QR للمهارات الحياتية',
                    'marker_type': 'qr_code',
                    'marker_data': b'life_skills_qr_data',
                    'associated_content': {
                        'content_id': content_objects[4].id,
                        'trigger_action': 'start_life_skills'
                    },
                    'trigger_distance': 1.0,
                    'activation_angle': 30.0,
                    'tracking_quality': 'medium'
                }
            ]
            
            for marker_data in markers:
                marker = ARMarker(**marker_data)
                db.session.add(marker)
            
            # 5. Sample Sessions (if students and teachers exist)
            students = Student.query.limit(3).all()
            teachers = Teacher.query.limit(2).all()
            
            if students and teachers:
                sessions_data = [
                    {
                        'content_id': content_objects[0].id,
                        'student_id': students[0].id,
                        'supervisor_id': teachers[0].id,
                        'device_used': 'iPad Pro',
                        'session_start': datetime.utcnow() - timedelta(hours=2),
                        'session_end': datetime.utcnow() - timedelta(hours=1, minutes=45),
                        'duration_seconds': 900,
                        'completion_percentage': 85.0,
                        'objectives_achieved': ['التعرف على الألوان الأساسية', 'ربط الألوان بالأشياء'],
                        'performance_metrics': {
                            'accuracy': 78,
                            'response_time': 2.3,
                            'engagement': 92
                        },
                        'comfort_level': 'good',
                        'motion_sickness': False,
                        'engagement_score': 92.0,
                        'behavioral_observations': 'تفاعل إيجابي مع المحتوى، تركيز جيد'
                    },
                    {
                        'content_id': content_objects[1].id,
                        'student_id': students[1].id,
                        'supervisor_id': teachers[0].id,
                        'device_used': 'Oculus Quest 2',
                        'session_start': datetime.utcnow() - timedelta(hours=1),
                        'session_end': datetime.utcnow() - timedelta(minutes=40),
                        'duration_seconds': 1200,
                        'completion_percentage': 95.0,
                        'objectives_achieved': ['تعلم الكواكب والنجوم', 'فهم المسافات الفضائية'],
                        'performance_metrics': {
                            'accuracy': 88,
                            'response_time': 1.8,
                            'engagement': 96
                        },
                        'comfort_level': 'excellent',
                        'motion_sickness': False,
                        'engagement_score': 96.0,
                        'behavioral_observations': 'حماس كبير للاستكشاف، أسئلة ذكية'
                    },
                    {
                        'content_id': content_objects[3].id,
                        'student_id': students[2].id,
                        'supervisor_id': teachers[1].id,
                        'device_used': 'HTC Vive',
                        'session_start': datetime.utcnow() - timedelta(minutes=30),
                        'duration_seconds': None,  # Still ongoing
                        'completion_percentage': 0.0,
                        'comfort_level': 'good',
                        'motion_sickness': False,
                        'behavioral_observations': 'بداية جيدة، يحتاج تشجيع'
                    }
                ]
                
                session_objects = []
                for session_data in sessions_data:
                    session = ARVRSession(**session_data)
                    session_objects.append(session)
                    db.session.add(session)
                
                db.session.flush()  # Get session IDs
                
                # 6. Sample Interactions
                if session_objects:
                    interactions_data = [
                        {
                            'session_id': session_objects[0].id,
                            'interaction_type': InteractionType.TOUCH,
                            'object_interacted': 'red_apple',
                            'action_performed': 'tap',
                            'position_x': 0.5,
                            'position_y': 0.3,
                            'position_z': 0.0,
                            'interaction_duration': 1.2,
                            'success': True,
                            'accuracy': 0.95,
                            'response_time': 0.8
                        },
                        {
                            'session_id': session_objects[0].id,
                            'interaction_type': InteractionType.GAZE,
                            'object_interacted': 'blue_ball',
                            'action_performed': 'look',
                            'gaze_direction': {'x': 0.2, 'y': 0.1, 'z': 0.9},
                            'interaction_duration': 2.5,
                            'success': True,
                            'accuracy': 0.88,
                            'response_time': 1.1
                        },
                        {
                            'session_id': session_objects[1].id,
                            'interaction_type': InteractionType.CONTROLLER,
                            'object_interacted': 'mars_planet',
                            'action_performed': 'select',
                            'position_x': -0.3,
                            'position_y': 0.8,
                            'position_z': 2.1,
                            'interaction_duration': 3.0,
                            'success': True,
                            'accuracy': 0.92,
                            'response_time': 0.6
                        }
                    ]
                    
                    for interaction_data in interactions_data:
                        interaction = ARVRInteraction(**interaction_data)
                        db.session.add(interaction)
            
            # 7. Device Calibrations (if users exist)
            users = User.query.limit(2).all()
            if users:
                calibrations_data = [
                    {
                        'device_id': 'oculus_quest_2_001',
                        'device_type': 'hmd',
                        'user_id': users[0].id,
                        'calibration_data': {
                            'ipd': 63.5,
                            'height': 165,
                            'tracking_bounds': {'width': 3.0, 'height': 2.5}
                        },
                        'ipd_measurement': 63.5,
                        'height_adjustment': 165.0,
                        'tracking_area': {'width': 3.0, 'height': 2.5},
                        'comfort_settings': {
                            'brightness': 80,
                            'motion_comfort': 'moderate'
                        },
                        'calibration_quality': 'excellent',
                        'calibrated_by': 'technician_1'
                    },
                    {
                        'device_id': 'hololens_2_001',
                        'device_type': 'hmd',
                        'user_id': users[1].id,
                        'calibration_data': {
                            'ipd': 61.0,
                            'height': 170,
                            'hand_tracking': True
                        },
                        'ipd_measurement': 61.0,
                        'height_adjustment': 170.0,
                        'comfort_settings': {
                            'brightness': 75,
                            'gesture_sensitivity': 'high'
                        },
                        'calibration_quality': 'good',
                        'calibrated_by': 'technician_2'
                    }
                ]
                
                for calibration_data in calibrations_data:
                    calibration = DeviceCalibration(**calibration_data)
                    db.session.add(calibration)
            
            # 8. Analytics Data
            analytics_data = [
                {
                    'content_id': content_objects[0].id,
                    'date': date.today() - timedelta(days=1),
                    'total_sessions': 5,
                    'unique_users': 3,
                    'avg_session_duration': 12.5,
                    'avg_completion_rate': 82.0,
                    'avg_engagement_score': 88.5,
                    'motion_sickness_incidents': 0,
                    'technical_issues_count': 1,
                    'user_satisfaction': 4.2,
                    'learning_effectiveness': 85.0,
                    'popular_interactions': ['touch', 'gaze'],
                    'improvement_areas': ['response_time', 'difficulty_adjustment']
                },
                {
                    'content_id': content_objects[1].id,
                    'date': date.today() - timedelta(days=1),
                    'total_sessions': 3,
                    'unique_users': 2,
                    'avg_session_duration': 18.2,
                    'avg_completion_rate': 91.0,
                    'avg_engagement_score': 94.0,
                    'motion_sickness_incidents': 1,
                    'technical_issues_count': 0,
                    'user_satisfaction': 4.7,
                    'learning_effectiveness': 92.0,
                    'popular_interactions': ['controller', 'voice'],
                    'improvement_areas': ['motion_comfort']
                }
            ]
            
            for analytics in analytics_data:
                analytics_obj = ARVRAnalytics(**analytics)
                db.session.add(analytics_obj)
            
            # Commit all changes
            db.session.commit()
            
            print("✅ تم إضافة بيانات AR/VR التجريبية بنجاح!")
            print(f"   - {len(ar_vr_contents)} محتوى AR/VR")
            print(f"   - {len(environments)} بيئة افتراضية")
            print(f"   - {len(scenarios)} سيناريو علاج")
            print(f"   - {len(markers)} علامة AR")
            if students and teachers:
                print(f"   - {len(sessions_data)} جلسة تجريبية")
                print(f"   - {len(interactions_data)} تفاعل")
            if users:
                print(f"   - {len(calibrations_data)} معايرة جهاز")
            print(f"   - {len(analytics_data)} سجل تحليلات")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ خطأ في إضافة بيانات AR/VR: {str(e)}")
            raise

if __name__ == '__main__':
    add_ar_vr_sample_data()
