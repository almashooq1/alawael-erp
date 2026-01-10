"""
خدمات نظام ربط الفروع مع بعض
Branch Integration Services
"""

from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func
from flask import current_app
import json
import requests
from typing import List, Dict, Optional, Tuple
import logging

from branch_integration_models import (
    Branch, BranchConnection, DataSyncLog, StudentTransfer, 
    SharedResource, ResourceAccess, InterBranchReport,
    BranchStatus, ConnectionType, DataSyncStatus, TransferStatus
)
from models import db, Student, Teacher, User

logger = logging.getLogger(__name__)

class BranchIntegrationService:
    """خدمة إدارة ربط الفروع"""
    
    @staticmethod
    def create_branch(branch_data: Dict) -> Branch:
        """إنشاء فرع جديد"""
        try:
            branch = Branch(
                name=branch_data.get('name'),
                code=branch_data.get('code'),
                address=branch_data.get('address'),
                city=branch_data.get('city'),
                region=branch_data.get('region'),
                phone=branch_data.get('phone'),
                email=branch_data.get('email'),
                manager_name=branch_data.get('manager_name'),
                manager_phone=branch_data.get('manager_phone'),
                manager_email=branch_data.get('manager_email'),
                server_url=branch_data.get('server_url'),
                api_key=branch_data.get('api_key'),
                database_name=branch_data.get('database_name'),
                timezone=branch_data.get('timezone', 'Asia/Riyadh'),
                status=BranchStatus(branch_data.get('status', 'active')),
                is_main_branch=branch_data.get('is_main_branch', False),
                max_students=branch_data.get('max_students', 500),
                established_date=datetime.strptime(branch_data['established_date'], '%Y-%m-%d').date() if branch_data.get('established_date') else None,
                metadata=branch_data.get('metadata', {})
            )
            
            db.session.add(branch)
            db.session.commit()
            
            logger.info(f"تم إنشاء فرع جديد: {branch.name} ({branch.code})")
            return branch
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء الفرع: {str(e)}")
            raise
    
    @staticmethod
    def get_all_branches() -> List[Branch]:
        """الحصول على جميع الفروع"""
        return Branch.query.filter(Branch.status != BranchStatus.SUSPENDED).all()
    
    @staticmethod
    def get_branch_by_code(code: str) -> Optional[Branch]:
        """الحصول على فرع بالكود"""
        return Branch.query.filter_by(code=code).first()
    
    @staticmethod
    def update_branch_status(branch_id: int, status: str) -> bool:
        """تحديث حالة الفرع"""
        try:
            branch = Branch.query.get(branch_id)
            if not branch:
                return False
            
            branch.status = BranchStatus(status)
            branch.updated_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"تم تحديث حالة الفرع {branch.name} إلى {status}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تحديث حالة الفرع: {str(e)}")
            return False

class BranchConnectionService:
    """خدمة إدارة الاتصالات بين الفروع"""
    
    @staticmethod
    def create_connection(connection_data: Dict) -> BranchConnection:
        """إنشاء اتصال بين فرعين"""
        try:
            # التحقق من وجود الفروع
            source_branch = Branch.query.get(connection_data['source_branch_id'])
            target_branch = Branch.query.get(connection_data['target_branch_id'])
            
            if not source_branch or not target_branch:
                raise ValueError("أحد الفروع غير موجود")
            
            # التحقق من عدم وجود اتصال مسبق
            existing = BranchConnection.query.filter_by(
                source_branch_id=connection_data['source_branch_id'],
                target_branch_id=connection_data['target_branch_id']
            ).first()
            
            if existing:
                raise ValueError("يوجد اتصال مسبق بين هذين الفرعين")
            
            connection = BranchConnection(
                source_branch_id=connection_data['source_branch_id'],
                target_branch_id=connection_data['target_branch_id'],
                connection_type=ConnectionType(connection_data.get('connection_type', 'partial_sync')),
                sync_students=connection_data.get('sync_students', True),
                sync_teachers=connection_data.get('sync_teachers', True),
                sync_programs=connection_data.get('sync_programs', True),
                sync_assessments=connection_data.get('sync_assessments', False),
                sync_reports=connection_data.get('sync_reports', True),
                sync_resources=connection_data.get('sync_resources', False),
                sync_frequency=connection_data.get('sync_frequency', 'daily'),
                notes=connection_data.get('notes'),
                metadata=connection_data.get('metadata', {})
            )
            
            # حساب موعد المزامنة التالي
            connection.next_sync = BranchConnectionService._calculate_next_sync(connection.sync_frequency)
            
            db.session.add(connection)
            db.session.commit()
            
            logger.info(f"تم إنشاء اتصال بين {source_branch.name} و {target_branch.name}")
            return connection
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء الاتصال: {str(e)}")
            raise
    
    @staticmethod
    def _calculate_next_sync(frequency: str) -> datetime:
        """حساب موعد المزامنة التالي"""
        now = datetime.utcnow()
        
        if frequency == 'hourly':
            return now + timedelta(hours=1)
        elif frequency == 'daily':
            return now + timedelta(days=1)
        elif frequency == 'weekly':
            return now + timedelta(weeks=1)
        else:  # manual
            return None
    
    @staticmethod
    def get_branch_connections(branch_id: int) -> List[BranchConnection]:
        """الحصول على اتصالات الفرع"""
        return BranchConnection.query.filter(
            or_(
                BranchConnection.source_branch_id == branch_id,
                BranchConnection.target_branch_id == branch_id
            )
        ).filter(BranchConnection.is_active == True).all()
    
    @staticmethod
    def toggle_connection_status(connection_id: int) -> bool:
        """تفعيل/إلغاء تفعيل الاتصال"""
        try:
            connection = BranchConnection.query.get(connection_id)
            if not connection:
                return False
            
            connection.is_active = not connection.is_active
            connection.updated_at = datetime.utcnow()
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تغيير حالة الاتصال: {str(e)}")
            return False

class DataSyncService:
    """خدمة مزامنة البيانات بين الفروع"""
    
    @staticmethod
    def sync_data(connection_id: int, sync_type: str = 'all') -> DataSyncLog:
        """تنفيذ مزامنة البيانات"""
        try:
            connection = BranchConnection.query.get(connection_id)
            if not connection or not connection.is_active:
                raise ValueError("الاتصال غير متاح")
            
            # إنشاء سجل المزامنة
            sync_log = DataSyncLog(
                connection_id=connection_id,
                sync_type=sync_type,
                status=DataSyncStatus.IN_PROGRESS,
                started_at=datetime.utcnow()
            )
            
            db.session.add(sync_log)
            db.session.commit()
            
            # تنفيذ المزامنة حسب النوع
            if sync_type == 'all' or sync_type == 'students':
                if connection.sync_students:
                    DataSyncService._sync_students(connection, sync_log)
            
            if sync_type == 'all' or sync_type == 'teachers':
                if connection.sync_teachers:
                    DataSyncService._sync_teachers(connection, sync_log)
            
            if sync_type == 'all' or sync_type == 'programs':
                if connection.sync_programs:
                    DataSyncService._sync_programs(connection, sync_log)
            
            # تحديث سجل المزامنة
            sync_log.completed_at = datetime.utcnow()
            sync_log.duration_seconds = int((sync_log.completed_at - sync_log.started_at).total_seconds())
            sync_log.status = DataSyncStatus.COMPLETED
            
            # تحديث آخر مزامنة في الاتصال
            connection.last_sync = datetime.utcnow()
            connection.next_sync = BranchConnectionService._calculate_next_sync(connection.sync_frequency)
            
            db.session.commit()
            
            logger.info(f"تمت مزامنة البيانات بنجاح للاتصال {connection_id}")
            return sync_log
            
        except Exception as e:
            if 'sync_log' in locals():
                sync_log.status = DataSyncStatus.FAILED
                sync_log.error_message = str(e)
                sync_log.completed_at = datetime.utcnow()
                db.session.commit()
            
            logger.error(f"خطأ في مزامنة البيانات: {str(e)}")
            raise
    
    @staticmethod
    def _sync_students(connection: BranchConnection, sync_log: DataSyncLog):
        """مزامنة بيانات الطلاب"""
        # هنا يتم تنفيذ منطق مزامنة الطلاب
        # يمكن تطويرها لاحقاً حسب متطلبات النظام
        pass
    
    @staticmethod
    def _sync_teachers(connection: BranchConnection, sync_log: DataSyncLog):
        """مزامنة بيانات المعلمين"""
        # هنا يتم تنفيذ منطق مزامنة المعلمين
        pass
    
    @staticmethod
    def _sync_programs(connection: BranchConnection, sync_log: DataSyncLog):
        """مزامنة بيانات البرامج"""
        # هنا يتم تنفيذ منطق مزامنة البرامج
        pass
    
    @staticmethod
    def get_sync_history(connection_id: int, limit: int = 50) -> List[DataSyncLog]:
        """الحصول على تاريخ المزامنة"""
        return DataSyncLog.query.filter_by(connection_id=connection_id)\
                               .order_by(DataSyncLog.created_at.desc())\
                               .limit(limit).all()
    
    @staticmethod
    def get_pending_syncs() -> List[BranchConnection]:
        """الحصول على المزامنات المعلقة"""
        now = datetime.utcnow()
        return BranchConnection.query.filter(
            and_(
                BranchConnection.is_active == True,
                BranchConnection.next_sync <= now,
                BranchConnection.sync_frequency != 'manual'
            )
        ).all()

class StudentTransferService:
    """خدمة نقل الطلاب بين الفروع"""
    
    @staticmethod
    def request_transfer(transfer_data: Dict, requested_by: int) -> StudentTransfer:
        """طلب نقل طالب"""
        try:
            transfer = StudentTransfer(
                student_id=transfer_data['student_id'],
                from_branch_id=transfer_data['from_branch_id'],
                to_branch_id=transfer_data['to_branch_id'],
                requested_by=requested_by,
                transfer_reason=transfer_data.get('transfer_reason'),
                transfer_date=datetime.strptime(transfer_data['transfer_date'], '%Y-%m-%d').date() if transfer_data.get('transfer_date') else None,
                transfer_academic_records=transfer_data.get('transfer_academic_records', True),
                transfer_medical_records=transfer_data.get('transfer_medical_records', True),
                transfer_assessments=transfer_data.get('transfer_assessments', True),
                transfer_programs=transfer_data.get('transfer_programs', True),
                notes=transfer_data.get('notes')
            )
            
            db.session.add(transfer)
            db.session.commit()
            
            logger.info(f"تم طلب نقل الطالب {transfer.student_id} من فرع {transfer.from_branch_id} إلى فرع {transfer.to_branch_id}")
            return transfer
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في طلب النقل: {str(e)}")
            raise
    
    @staticmethod
    def approve_transfer(transfer_id: int, approved_by: int, admin_notes: str = None) -> bool:
        """الموافقة على نقل الطالب"""
        try:
            transfer = StudentTransfer.query.get(transfer_id)
            if not transfer:
                return False
            
            transfer.status = TransferStatus.APPROVED
            transfer.approved_by = approved_by
            transfer.admin_notes = admin_notes
            transfer.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"تمت الموافقة على نقل الطالب {transfer.student_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في الموافقة على النقل: {str(e)}")
            return False
    
    @staticmethod
    def execute_transfer(transfer_id: int) -> bool:
        """تنفيذ نقل الطالب"""
        try:
            transfer = StudentTransfer.query.get(transfer_id)
            if not transfer or transfer.status != TransferStatus.APPROVED:
                return False
            
            # تحديث فرع الطالب
            student = Student.query.get(transfer.student_id)
            if student:
                # هنا يمكن إضافة منطق تحديث فرع الطالب
                # student.branch_id = transfer.to_branch_id
                pass
            
            transfer.status = TransferStatus.COMPLETED
            transfer.effective_date = datetime.utcnow().date()
            transfer.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"تم تنفيذ نقل الطالب {transfer.student_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تنفيذ النقل: {str(e)}")
            return False
    
    @staticmethod
    def get_pending_transfers(branch_id: int = None) -> List[StudentTransfer]:
        """الحصول على طلبات النقل المعلقة"""
        query = StudentTransfer.query.filter(
            StudentTransfer.status.in_([TransferStatus.REQUESTED, TransferStatus.APPROVED])
        )
        
        if branch_id:
            query = query.filter(
                or_(
                    StudentTransfer.from_branch_id == branch_id,
                    StudentTransfer.to_branch_id == branch_id
                )
            )
        
        return query.order_by(StudentTransfer.created_at.desc()).all()

class SharedResourceService:
    """خدمة إدارة الموارد المشتركة"""
    
    @staticmethod
    def create_resource(resource_data: Dict, created_by: int, branch_id: int) -> SharedResource:
        """إنشاء مورد مشترك"""
        try:
            resource = SharedResource(
                name=resource_data['name'],
                description=resource_data.get('description'),
                resource_type=resource_data.get('resource_type'),
                owner_branch_id=branch_id,
                created_by=created_by,
                is_public=resource_data.get('is_public', False),
                requires_approval=resource_data.get('requires_approval', True),
                file_path=resource_data.get('file_path'),
                file_size=resource_data.get('file_size'),
                file_type=resource_data.get('file_type'),
                tags=resource_data.get('tags', []),
                metadata=resource_data.get('metadata', {})
            )
            
            db.session.add(resource)
            db.session.commit()
            
            logger.info(f"تم إنشاء مورد مشترك: {resource.name}")
            return resource
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء المورد: {str(e)}")
            raise
    
    @staticmethod
    def request_access(resource_id: int, branch_id: int, requested_by: int, access_type: str = 'read') -> ResourceAccess:
        """طلب الوصول لمورد"""
        try:
            # التحقق من عدم وجود طلب مسبق
            existing = ResourceAccess.query.filter_by(
                resource_id=resource_id,
                branch_id=branch_id
            ).first()
            
            if existing:
                raise ValueError("يوجد طلب وصول مسبق لهذا المورد")
            
            access = ResourceAccess(
                resource_id=resource_id,
                branch_id=branch_id,
                requested_by=requested_by,
                access_type=access_type,
                valid_from=datetime.utcnow(),
                valid_until=datetime.utcnow() + timedelta(days=365)  # صالح لسنة
            )
            
            # إذا كان المورد عام، الموافقة تلقائية
            resource = SharedResource.query.get(resource_id)
            if resource and resource.is_public:
                access.is_approved = True
                access.approved_at = datetime.utcnow()
            
            db.session.add(access)
            db.session.commit()
            
            return access
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في طلب الوصول: {str(e)}")
            raise
    
    @staticmethod
    def approve_access(access_id: int, approved_by: int) -> bool:
        """الموافقة على طلب الوصول"""
        try:
            access = ResourceAccess.query.get(access_id)
            if not access:
                return False
            
            access.is_approved = True
            access.approved_by = approved_by
            access.approved_at = datetime.utcnow()
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في الموافقة على الوصول: {str(e)}")
            return False
    
    @staticmethod
    def get_available_resources(branch_id: int) -> List[SharedResource]:
        """الحصول على الموارد المتاحة للفرع"""
        # الموارد العامة + الموارد التي لديه صلاحية وصول لها
        public_resources = SharedResource.query.filter_by(is_public=True).all()
        
        accessible_resources = db.session.query(SharedResource)\
            .join(ResourceAccess)\
            .filter(
                and_(
                    ResourceAccess.branch_id == branch_id,
                    ResourceAccess.is_approved == True,
                    ResourceAccess.is_active == True
                )
            ).all()
        
        # دمج القوائم وإزالة التكرار
        all_resources = {r.id: r for r in public_resources + accessible_resources}
        return list(all_resources.values())

class InterBranchReportService:
    """خدمة التقارير المشتركة بين الفروع"""
    
    @staticmethod
    def generate_consolidated_report(report_data: Dict, created_by: int, branch_id: int) -> InterBranchReport:
        """إنشاء تقرير موحد"""
        try:
            # جمع البيانات من الفروع المحددة
            included_branches = report_data.get('included_branches', [])
            report_period_start = datetime.strptime(report_data['report_period_start'], '%Y-%m-%d').date()
            report_period_end = datetime.strptime(report_data['report_period_end'], '%Y-%m-%d').date()
            
            # حساب الإحصائيات
            summary_stats = InterBranchReportService._calculate_summary_statistics(
                included_branches, report_period_start, report_period_end
            )
            
            report = InterBranchReport(
                title=report_data['title'],
                description=report_data.get('description'),
                report_type=report_data.get('report_type', 'consolidated'),
                included_branches=included_branches,
                created_by=created_by,
                branch_id=branch_id,
                report_period_start=report_period_start,
                report_period_end=report_period_end,
                summary_statistics=summary_stats,
                is_automated=report_data.get('is_automated', False)
            )
            
            db.session.add(report)
            db.session.commit()
            
            logger.info(f"تم إنشاء تقرير موحد: {report.title}")
            return report
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء التقرير: {str(e)}")
            raise
    
    @staticmethod
    def _calculate_summary_statistics(branch_ids: List[int], start_date, end_date) -> Dict:
        """حساب الإحصائيات الموجزة"""
        try:
            stats = {
                'total_branches': len(branch_ids),
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'students': {},
                'teachers': {},
                'programs': {}
            }
            
            # إحصائيات الطلاب (يمكن تطويرها حسب النموذج الفعلي)
            # stats['students']['total'] = Student.query.filter(Student.branch_id.in_(branch_ids)).count()
            
            return stats
            
        except Exception as e:
            logger.error(f"خطأ في حساب الإحصائيات: {str(e)}")
            return {}
    
    @staticmethod
    def get_branch_reports(branch_id: int) -> List[InterBranchReport]:
        """الحصول على تقارير الفرع"""
        return InterBranchReport.query.filter(
            or_(
                InterBranchReport.branch_id == branch_id,
                InterBranchReport.included_branches.contains([branch_id])
            )
        ).order_by(InterBranchReport.created_at.desc()).all()

class BranchDashboardService:
    """خدمة لوحة تحكم الفروع"""
    
    @staticmethod
    def get_branch_overview(branch_id: int) -> Dict:
        """الحصول على نظرة عامة على الفرع"""
        try:
            branch = Branch.query.get(branch_id)
            if not branch:
                return {}
            
            # إحصائيات الاتصالات
            connections = BranchConnectionService.get_branch_connections(branch_id)
            active_connections = len([c for c in connections if c.is_active])
            
            # إحصائيات المزامنة
            recent_syncs = DataSyncLog.query.join(BranchConnection)\
                .filter(
                    or_(
                        BranchConnection.source_branch_id == branch_id,
                        BranchConnection.target_branch_id == branch_id
                    )
                )\
                .filter(DataSyncLog.created_at >= datetime.utcnow() - timedelta(days=7))\
                .count()
            
            # إحصائيات النقل
            pending_transfers = len(StudentTransferService.get_pending_transfers(branch_id))
            
            # إحصائيات الموارد
            owned_resources = SharedResource.query.filter_by(owner_branch_id=branch_id).count()
            accessible_resources = len(SharedResourceService.get_available_resources(branch_id))
            
            return {
                'branch_info': branch.to_dict(),
                'connections': {
                    'total': len(connections),
                    'active': active_connections,
                    'inactive': len(connections) - active_connections
                },
                'sync_activity': {
                    'recent_syncs': recent_syncs,
                    'last_sync': branch.last_sync.isoformat() if branch.last_sync else None
                },
                'transfers': {
                    'pending': pending_transfers
                },
                'resources': {
                    'owned': owned_resources,
                    'accessible': accessible_resources
                }
            }
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على نظرة عامة للفرع: {str(e)}")
            return {}
    
    @staticmethod
    def get_network_topology(branch_id: int = None) -> Dict:
        """الحصول على طوبولوجيا شبكة الفروع"""
        try:
            # جميع الفروع
            branches = Branch.query.filter(Branch.status == BranchStatus.ACTIVE).all()
            
            # جميع الاتصالات
            connections = BranchConnection.query.filter_by(is_active=True).all()
            
            # تنسيق البيانات للعرض
            nodes = []
            edges = []
            
            for branch in branches:
                nodes.append({
                    'id': branch.id,
                    'label': branch.name,
                    'code': branch.code,
                    'city': branch.city,
                    'is_main': branch.is_main_branch,
                    'students': branch.current_students,
                    'max_students': branch.max_students
                })
            
            for conn in connections:
                edges.append({
                    'from': conn.source_branch_id,
                    'to': conn.target_branch_id,
                    'type': conn.connection_type.value,
                    'last_sync': conn.last_sync.isoformat() if conn.last_sync else None
                })
            
            return {
                'nodes': nodes,
                'edges': edges,
                'statistics': {
                    'total_branches': len(branches),
                    'total_connections': len(connections),
                    'main_branches': len([b for b in branches if b.is_main_branch])
                }
            }
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على طوبولوجيا الشبكة: {str(e)}")
            return {'nodes': [], 'edges': [], 'statistics': {}}
