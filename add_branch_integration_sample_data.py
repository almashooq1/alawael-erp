"""
إضافة بيانات تجريبية لنظام ربط الفروع
Branch Integration Sample Data Script
"""

from datetime import datetime, date, timedelta
from branch_integration_models import (
    Branch, BranchConnection, DataSyncLog, StudentTransfer,
    SharedResource, ResourceAccess, InterBranchReport,
    BranchStatus, ConnectionType, DataSyncStatus, TransferStatus
)
from models import db, Student, Teacher, User
import json

def add_branch_integration_sample_data():
    """إضافة بيانات تجريبية لنظام ربط الفروع"""
    
    print("🔄 بدء إضافة بيانات تجريبية لنظام ربط الفروع...")
    
    try:
        # إنشاء الفروع
        branches_data = [
            {
                'name': 'مركز الأوائل - الرياض الرئيسي',
                'code': 'RYD-MAIN',
                'address': 'شارع الملك فهد، حي العليا، الرياض',
                'city': 'الرياض',
                'region': 'منطقة الرياض',
                'phone': '+966112345678',
                'email': 'riyadh.main@awail.edu.sa',
                'manager_name': 'أحمد محمد الأحمد',
                'manager_phone': '+966501234567',
                'manager_email': 'ahmed.manager@awail.edu.sa',
                'server_url': 'https://riyadh-main.awail.edu.sa',
                'api_key': 'ryd_main_api_key_2024',
                'database_name': 'awail_riyadh_main',
                'timezone': 'Asia/Riyadh',
                'status': BranchStatus.ACTIVE,
                'is_main_branch': True,
                'max_students': 800,
                'current_students': 650,
                'established_date': date(2015, 9, 1),
                'metadata': {
                    'specializations': ['اضطراب طيف التوحد', 'صعوبات التعلم', 'الإعاقة الذهنية'],
                    'facilities': ['مسبح علاجي', 'صالة رياضية', 'مختبر حاسوب'],
                    'accreditation': 'وزارة التعليم - الهيئة السعودية للتخصصات الصحية'
                }
            },
            {
                'name': 'مركز الأوائل - جدة',
                'code': 'JED-01',
                'address': 'شارع الأمير سلطان، حي الروضة، جدة',
                'city': 'جدة',
                'region': 'منطقة مكة المكرمة',
                'phone': '+966126789012',
                'email': 'jeddah@awail.edu.sa',
                'manager_name': 'فاطمة عبدالله الزهراني',
                'manager_phone': '+966509876543',
                'manager_email': 'fatima.manager@awail.edu.sa',
                'server_url': 'https://jeddah.awail.edu.sa',
                'api_key': 'jed_01_api_key_2024',
                'database_name': 'awail_jeddah',
                'timezone': 'Asia/Riyadh',
                'status': BranchStatus.ACTIVE,
                'is_main_branch': False,
                'max_students': 600,
                'current_students': 480,
                'established_date': date(2017, 2, 15),
                'metadata': {
                    'specializations': ['اضطراب طيف التوحد', 'اضطرابات النطق واللغة'],
                    'facilities': ['مختبر نطق', 'غرف علاج فردي', 'حديقة حسية'],
                    'accreditation': 'وزارة التعليم'
                }
            },
            {
                'name': 'مركز الأوائل - الدمام',
                'code': 'DMM-01',
                'address': 'شارع الملك عبدالعزيز، حي الفيصلية، الدمام',
                'city': 'الدمام',
                'region': 'المنطقة الشرقية',
                'phone': '+966138901234',
                'email': 'dammam@awail.edu.sa',
                'manager_name': 'خالد سعد العتيبي',
                'manager_phone': '+966555123456',
                'manager_email': 'khalid.manager@awail.edu.sa',
                'server_url': 'https://dammam.awail.edu.sa',
                'api_key': 'dmm_01_api_key_2024',
                'database_name': 'awail_dammam',
                'timezone': 'Asia/Riyadh',
                'status': BranchStatus.ACTIVE,
                'is_main_branch': False,
                'max_students': 500,
                'current_students': 380,
                'established_date': date(2018, 9, 1),
                'metadata': {
                    'specializations': ['صعوبات التعلم', 'فرط الحركة وتشتت الانتباه'],
                    'facilities': ['مختبر تعليمي', 'غرف علاج جماعي'],
                    'accreditation': 'وزارة التعليم'
                }
            },
            {
                'name': 'مركز الأوائل - أبها',
                'code': 'AHB-01',
                'address': 'شارع الملك فيصل، حي المنهل، أبها',
                'city': 'أبها',
                'region': 'منطقة عسير',
                'phone': '+966172345678',
                'email': 'abha@awail.edu.sa',
                'manager_name': 'نورا علي القحطاني',
                'manager_phone': '+966501987654',
                'manager_email': 'nora.manager@awail.edu.sa',
                'server_url': 'https://abha.awail.edu.sa',
                'api_key': 'ahb_01_api_key_2024',
                'database_name': 'awail_abha',
                'timezone': 'Asia/Riyadh',
                'status': BranchStatus.ACTIVE,
                'is_main_branch': False,
                'max_students': 300,
                'current_students': 220,
                'established_date': date(2019, 1, 20),
                'metadata': {
                    'specializations': ['اضطراب طيف التوحد', 'الإعاقة الحركية'],
                    'facilities': ['مركز علاج طبيعي', 'غرف علاج حسي'],
                    'accreditation': 'وزارة التعليم'
                }
            },
            {
                'name': 'مركز الأوائل - تبوك',
                'code': 'TUU-01',
                'address': 'شارع الأمير فهد بن سلطان، حي السليمانية، تبوك',
                'city': 'تبوك',
                'region': 'منطقة تبوك',
                'phone': '+966144567890',
                'email': 'tabuk@awail.edu.sa',
                'manager_name': 'محمد حسن الشمري',
                'manager_phone': '+966556789012',
                'manager_email': 'mohammed.manager@awail.edu.sa',
                'server_url': 'https://tabuk.awail.edu.sa',
                'api_key': 'tuu_01_api_key_2024',
                'database_name': 'awail_tabuk',
                'timezone': 'Asia/Riyadh',
                'status': BranchStatus.MAINTENANCE,
                'is_main_branch': False,
                'max_students': 250,
                'current_students': 180,
                'established_date': date(2020, 9, 1),
                'metadata': {
                    'specializations': ['صعوبات التعلم', 'اضطرابات النطق واللغة'],
                    'facilities': ['مختبر نطق', 'غرف تعليمية'],
                    'accreditation': 'وزارة التعليم'
                }
            }
        ]
        
        branches = []
        for branch_data in branches_data:
            branch = Branch(**branch_data)
            db.session.add(branch)
            branches.append(branch)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(branches)} فروع")
        
        # إنشاء الاتصالات بين الفروع
        connections_data = [
            {
                'source_branch_id': branches[0].id,  # الرياض الرئيسي
                'target_branch_id': branches[1].id,  # جدة
                'connection_type': ConnectionType.FULL_SYNC,
                'sync_students': True,
                'sync_teachers': True,
                'sync_programs': True,
                'sync_assessments': True,
                'sync_reports': True,
                'sync_resources': True,
                'sync_frequency': 'daily',
                'notes': 'اتصال رئيسي بين المركز الرئيسي وفرع جدة'
            },
            {
                'source_branch_id': branches[0].id,  # الرياض الرئيسي
                'target_branch_id': branches[2].id,  # الدمام
                'connection_type': ConnectionType.PARTIAL_SYNC,
                'sync_students': True,
                'sync_teachers': True,
                'sync_programs': True,
                'sync_assessments': False,
                'sync_reports': True,
                'sync_resources': False,
                'sync_frequency': 'daily',
                'notes': 'مزامنة جزئية مع فرع الدمام'
            },
            {
                'source_branch_id': branches[1].id,  # جدة
                'target_branch_id': branches[3].id,  # أبها
                'connection_type': ConnectionType.PARTIAL_SYNC,
                'sync_students': True,
                'sync_teachers': False,
                'sync_programs': True,
                'sync_assessments': False,
                'sync_reports': False,
                'sync_resources': True,
                'sync_frequency': 'weekly',
                'notes': 'مزامنة أسبوعية بين جدة وأبها'
            },
            {
                'source_branch_id': branches[0].id,  # الرياض الرئيسي
                'target_branch_id': branches[4].id,  # تبوك
                'connection_type': ConnectionType.READ_ONLY,
                'sync_students': False,
                'sync_teachers': False,
                'sync_programs': True,
                'sync_assessments': False,
                'sync_reports': False,
                'sync_resources': True,
                'sync_frequency': 'manual',
                'notes': 'وصول للقراءة فقط من تبوك للمركز الرئيسي'
            }
        ]
        
        connections = []
        for conn_data in connections_data:
            conn_data['next_sync'] = datetime.utcnow() + timedelta(hours=1)
            connection = BranchConnection(**conn_data)
            db.session.add(connection)
            connections.append(connection)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(connections)} اتصالات")
        
        # إنشاء سجلات المزامنة
        sync_logs_data = []
        for i, connection in enumerate(connections):
            # مزامنة ناجحة
            sync_log = DataSyncLog(
                connection_id=connection.id,
                sync_type='students',
                status=DataSyncStatus.COMPLETED,
                total_records=150 + (i * 50),
                processed_records=150 + (i * 50),
                successful_records=148 + (i * 48),
                failed_records=2,
                started_at=datetime.utcnow() - timedelta(hours=2),
                completed_at=datetime.utcnow() - timedelta(hours=1, minutes=45),
                duration_seconds=900,
                sync_details={
                    'sync_type': 'students',
                    'tables_synced': ['students', 'student_programs', 'assessments'],
                    'performance_metrics': {
                        'records_per_second': 2.5,
                        'data_transferred_mb': 15.2
                    }
                }
            )
            sync_logs_data.append(sync_log)
            
            # مزامنة فاشلة
            if i % 2 == 0:
                failed_sync = DataSyncLog(
                    connection_id=connection.id,
                    sync_type='teachers',
                    status=DataSyncStatus.FAILED,
                    total_records=25,
                    processed_records=10,
                    successful_records=0,
                    failed_records=10,
                    started_at=datetime.utcnow() - timedelta(days=1),
                    completed_at=datetime.utcnow() - timedelta(days=1, minutes=-30),
                    duration_seconds=180,
                    error_message='فشل في الاتصال بقاعدة البيانات المستهدفة',
                    sync_details={
                        'error_code': 'DB_CONNECTION_TIMEOUT',
                        'retry_attempts': 3
                    }
                )
                sync_logs_data.append(failed_sync)
        
        for sync_log in sync_logs_data:
            db.session.add(sync_log)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(sync_logs_data)} سجل مزامنة")
        
        # إنشاء طلبات نقل الطلاب
        transfers_data = [
            {
                'student_id': 1,  # يجب أن يكون معرف طالب موجود
                'from_branch_id': branches[1].id,  # جدة
                'to_branch_id': branches[0].id,    # الرياض الرئيسي
                'requested_by': 1,  # يجب أن يكون معرف مستخدم موجود
                'status': TransferStatus.REQUESTED,
                'transfer_reason': 'انتقال الأسرة للرياض لظروف العمل',
                'transfer_date': date.today() + timedelta(days=30),
                'transfer_academic_records': True,
                'transfer_medical_records': True,
                'transfer_assessments': True,
                'transfer_programs': True,
                'notes': 'الطالب يحتاج لاستمرارية البرنامج العلاجي'
            },
            {
                'student_id': 2,
                'from_branch_id': branches[2].id,  # الدمام
                'to_branch_id': branches[1].id,    # جدة
                'requested_by': 1,
                'approved_by': 1,
                'status': TransferStatus.APPROVED,
                'transfer_reason': 'طلب الأسرة للحصول على خدمات متخصصة',
                'transfer_date': date.today() + timedelta(days=15),
                'transfer_academic_records': True,
                'transfer_medical_records': True,
                'transfer_assessments': True,
                'transfer_programs': False,
                'notes': 'الطالب بحاجة لخدمات النطق المتقدمة',
                'admin_notes': 'تمت الموافقة بناء على توفر المقاعد'
            },
            {
                'student_id': 3,
                'from_branch_id': branches[3].id,  # أبها
                'to_branch_id': branches[0].id,    # الرياض الرئيسي
                'requested_by': 1,
                'approved_by': 1,
                'status': TransferStatus.COMPLETED,
                'transfer_reason': 'الحاجة لخدمات متخصصة غير متوفرة في الفرع الحالي',
                'transfer_date': date.today() - timedelta(days=10),
                'effective_date': date.today() - timedelta(days=5),
                'transfer_academic_records': True,
                'transfer_medical_records': True,
                'transfer_assessments': True,
                'transfer_programs': True,
                'notes': 'تم النقل بنجاح',
                'admin_notes': 'تم استقبال الطالب وبدء البرنامج الجديد'
            }
        ]
        
        transfers = []
        for transfer_data in transfers_data:
            transfer = StudentTransfer(**transfer_data)
            db.session.add(transfer)
            transfers.append(transfer)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(transfers)} طلب نقل")
        
        # إنشاء الموارد المشتركة
        resources_data = [
            {
                'name': 'دليل التدريب على المهارات الاجتماعية',
                'description': 'دليل شامل لتدريب الأطفال ذوي اضطراب طيف التوحد على المهارات الاجتماعية',
                'resource_type': 'document',
                'owner_branch_id': branches[0].id,  # الرياض الرئيسي
                'created_by': 1,
                'is_public': True,
                'requires_approval': False,
                'file_path': '/resources/documents/social_skills_guide.pdf',
                'file_size': 2048000,  # 2MB
                'file_type': 'application/pdf',
                'download_count': 45,
                'view_count': 120,
                'tags': ['مهارات اجتماعية', 'التوحد', 'دليل تدريبي'],
                'metadata': {
                    'author': 'د. سارة أحمد الخالدي',
                    'version': '2.1',
                    'last_updated': '2024-01-15',
                    'language': 'ar'
                }
            },
            {
                'name': 'فيديوهات تدريبية للعلاج النطقي',
                'description': 'مجموعة فيديوهات تعليمية لتقنيات العلاج النطقي للأطفال',
                'resource_type': 'video',
                'owner_branch_id': branches[1].id,  # جدة
                'created_by': 1,
                'is_public': False,
                'requires_approval': True,
                'file_path': '/resources/videos/speech_therapy_collection/',
                'file_size': 524288000,  # 500MB
                'file_type': 'video/mp4',
                'download_count': 12,
                'view_count': 38,
                'tags': ['علاج نطق', 'فيديو تعليمي', 'تدريب'],
                'metadata': {
                    'duration_minutes': 180,
                    'quality': '1080p',
                    'subtitles': ['ar', 'en'],
                    'chapters': 8
                }
            },
            {
                'name': 'نماذج تقييم صعوبات التعلم',
                'description': 'مجموعة شاملة من نماذج التقييم المعيارية لصعوبات التعلم',
                'resource_type': 'assessment',
                'owner_branch_id': branches[2].id,  # الدمام
                'created_by': 1,
                'is_public': False,
                'requires_approval': True,
                'file_path': '/resources/assessments/learning_difficulties_forms.zip',
                'file_size': 10240000,  # 10MB
                'file_type': 'application/zip',
                'download_count': 28,
                'view_count': 65,
                'tags': ['تقييم', 'صعوبات تعلم', 'نماذج'],
                'metadata': {
                    'forms_count': 15,
                    'age_range': '6-18',
                    'standardized': True,
                    'validity_period': '2024-2026'
                }
            },
            {
                'name': 'برنامج تدريبي للمهارات الحياتية',
                'description': 'برنامج متكامل لتدريب الأطفال على المهارات الحياتية الأساسية',
                'resource_type': 'program',
                'owner_branch_id': branches[0].id,  # الرياض الرئيسي
                'created_by': 1,
                'is_public': True,
                'requires_approval': False,
                'file_path': '/resources/programs/life_skills_program/',
                'file_size': 15360000,  # 15MB
                'file_type': 'application/zip',
                'download_count': 67,
                'view_count': 156,
                'tags': ['مهارات حياتية', 'برنامج تدريبي', 'استقلالية'],
                'metadata': {
                    'duration_weeks': 12,
                    'sessions_per_week': 3,
                    'target_age': '8-16',
                    'skill_areas': ['النظافة الشخصية', 'إعداد الطعام', 'إدارة المال']
                }
            }
        ]
        
        resources = []
        for resource_data in resources_data:
            resource = SharedResource(**resource_data)
            db.session.add(resource)
            resources.append(resource)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(resources)} مورد مشترك")
        
        # إنشاء صلاحيات الوصول للموارد
        access_data = [
            {
                'resource_id': resources[1].id,  # فيديوهات العلاج النطقي
                'branch_id': branches[0].id,     # الرياض الرئيسي
                'requested_by': 1,
                'approved_by': 1,
                'access_type': 'read',
                'is_approved': True,
                'approved_at': datetime.utcnow() - timedelta(days=5),
                'valid_from': datetime.utcnow() - timedelta(days=5),
                'valid_until': datetime.utcnow() + timedelta(days=360)
            },
            {
                'resource_id': resources[2].id,  # نماذج تقييم صعوبات التعلم
                'branch_id': branches[1].id,     # جدة
                'requested_by': 1,
                'access_type': 'read',
                'is_approved': False,
                'valid_from': datetime.utcnow(),
                'valid_until': datetime.utcnow() + timedelta(days=365)
            },
            {
                'resource_id': resources[1].id,  # فيديوهات العلاج النطقي
                'branch_id': branches[3].id,     # أبها
                'requested_by': 1,
                'approved_by': 1,
                'access_type': 'read',
                'is_approved': True,
                'approved_at': datetime.utcnow() - timedelta(days=2),
                'valid_from': datetime.utcnow() - timedelta(days=2),
                'valid_until': datetime.utcnow() + timedelta(days=363)
            }
        ]
        
        accesses = []
        for access_info in access_data:
            access = ResourceAccess(**access_info)
            db.session.add(access)
            accesses.append(access)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(accesses)} صلاحية وصول")
        
        # إنشاء التقارير المشتركة
        reports_data = [
            {
                'title': 'التقرير الشهري الموحد - يناير 2024',
                'description': 'تقرير شامل عن أداء جميع الفروع خلال شهر يناير 2024',
                'report_type': 'consolidated',
                'included_branches': [b.id for b in branches[:4]],  # جميع الفروع النشطة
                'created_by': 1,
                'branch_id': branches[0].id,  # الرياض الرئيسي
                'report_period_start': date(2024, 1, 1),
                'report_period_end': date(2024, 1, 31),
                'summary_statistics': {
                    'total_students': 1730,
                    'total_teachers': 145,
                    'total_sessions': 8650,
                    'branches_performance': {
                        'RYD-MAIN': {'students': 650, 'sessions': 3250, 'satisfaction': 4.8},
                        'JED-01': {'students': 480, 'sessions': 2400, 'satisfaction': 4.6},
                        'DMM-01': {'students': 380, 'sessions': 1900, 'satisfaction': 4.7},
                        'AHB-01': {'students': 220, 'sessions': 1100, 'satisfaction': 4.5}
                    }
                },
                'is_published': True,
                'is_automated': True,
                'file_path': '/reports/consolidated/2024-01-monthly-report.pdf',
                'file_format': 'pdf'
            },
            {
                'title': 'تقرير مقارنة الأداء - الربع الأول 2024',
                'description': 'تقرير مقارنة أداء الفروع في مؤشرات الجودة والفعالية',
                'report_type': 'comparative',
                'included_branches': [branches[0].id, branches[1].id, branches[2].id],
                'created_by': 1,
                'branch_id': branches[0].id,
                'report_period_start': date(2024, 1, 1),
                'report_period_end': date(2024, 3, 31),
                'summary_statistics': {
                    'comparison_metrics': {
                        'student_progress': {'RYD-MAIN': 85, 'JED-01': 82, 'DMM-01': 78},
                        'parent_satisfaction': {'RYD-MAIN': 4.8, 'JED-01': 4.6, 'DMM-01': 4.7},
                        'teacher_retention': {'RYD-MAIN': 95, 'JED-01': 88, 'DMM-01': 92}
                    },
                    'best_practices': [
                        'استخدام التقنيات التفاعلية في التعليم',
                        'برامج التدريب المستمر للمعلمين',
                        'التواصل الفعال مع أولياء الأمور'
                    ]
                },
                'is_published': False,
                'is_automated': False,
                'file_format': 'excel'
            }
        ]
        
        reports = []
        for report_data in reports_data:
            report = InterBranchReport(**report_data)
            db.session.add(report)
            reports.append(report)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(reports)} تقرير مشترك")
        
        # تحديث آخر مزامنة للفروع
        for i, branch in enumerate(branches):
            if i < len(connections):
                branch.last_sync = datetime.utcnow() - timedelta(hours=i+1)
        
        db.session.commit()
        
        print("🎉 تم إكمال إضافة البيانات التجريبية لنظام ربط الفروع بنجاح!")
        print(f"📊 الإحصائيات:")
        print(f"   • الفروع: {len(branches)}")
        print(f"   • الاتصالات: {len(connections)}")
        print(f"   • سجلات المزامنة: {len(sync_logs_data)}")
        print(f"   • طلبات النقل: {len(transfers)}")
        print(f"   • الموارد المشتركة: {len(resources)}")
        print(f"   • صلاحيات الوصول: {len(accesses)}")
        print(f"   • التقارير المشتركة: {len(reports)}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
        return False

if __name__ == '__main__':
    # تشغيل السكريبت
    add_branch_integration_sample_data()
