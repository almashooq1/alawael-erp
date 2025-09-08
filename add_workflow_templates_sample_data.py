#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sample Data Script for Workflow Templates System
Al-Awael Centers ERP Platform
"""

import os
import sys
from datetime import datetime, date, timedelta
import random
from faker import Faker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from workflow_templates_models import *

# Initialize Faker for Arabic locale
fake = Faker(['ar_SA', 'en_US'])

def clear_existing_data():
    """Clear existing workflow templates data"""
    print("🧹 تنظيف البيانات الموجودة...")
    
    try:
        # Delete in reverse order of dependencies
        WorkflowStepInstance.query.delete()
        WorkflowInstance.query.delete()
        WorkflowStep.query.delete()
        WorkflowTemplate.query.delete()
        
        db.session.commit()
        print("✅ تم تنظيف البيانات بنجاح")
    except Exception as e:
        print(f"❌ خطأ في تنظيف البيانات: {e}")
        db.session.rollback()

def create_workflow_templates():
    """Create sample workflow templates"""
    print("📋 إنشاء قوالب سير العمل...")
    
    templates_data = [
        {
            'name': 'Therapy Session Workflow',
            'name_ar': 'سير عمل الجلسة العلاجية',
            'description': 'Complete workflow for conducting therapy sessions',
            'description_ar': 'سير عمل شامل لإجراء الجلسات العلاجية',
            'category': WorkflowCategory.THERAPY_SESSION,
            'complexity_level': 'medium',
            'estimated_duration': 90,
            'steps': [
                {'name': 'Session Preparation', 'name_ar': 'تحضير الجلسة', 'type': 'task', 'duration': 15},
                {'name': 'Patient Assessment', 'name_ar': 'تقييم المريض', 'type': 'form', 'duration': 20},
                {'name': 'Therapy Activities', 'name_ar': 'الأنشطة العلاجية', 'type': 'task', 'duration': 45},
                {'name': 'Progress Documentation', 'name_ar': 'توثيق التقدم', 'type': 'form', 'duration': 10}
            ]
        },
        {
            'name': 'Initial Assessment Process',
            'name_ar': 'عملية التقييم الأولي',
            'description': 'Comprehensive initial assessment for new patients',
            'description_ar': 'تقييم أولي شامل للمرضى الجدد',
            'category': WorkflowCategory.ASSESSMENT,
            'complexity_level': 'high',
            'estimated_duration': 120,
            'steps': [
                {'name': 'Patient Registration', 'name_ar': 'تسجيل المريض', 'type': 'form', 'duration': 20},
                {'name': 'Medical History Review', 'name_ar': 'مراجعة التاريخ الطبي', 'type': 'task', 'duration': 30},
                {'name': 'Physical Assessment', 'name_ar': 'التقييم الجسدي', 'type': 'task', 'duration': 40},
                {'name': 'Cognitive Assessment', 'name_ar': 'التقييم المعرفي', 'type': 'task', 'duration': 30}
            ]
        },
        {
            'name': 'Treatment Plan Development',
            'name_ar': 'تطوير خطة العلاج',
            'description': 'Process for creating individualized treatment plans',
            'description_ar': 'عملية إنشاء خطط علاجية فردية',
            'category': WorkflowCategory.TREATMENT_PLAN,
            'complexity_level': 'high',
            'estimated_duration': 60,
            'steps': [
                {'name': 'Assessment Review', 'name_ar': 'مراجعة التقييم', 'type': 'task', 'duration': 15},
                {'name': 'Goal Setting', 'name_ar': 'وضع الأهداف', 'type': 'form', 'duration': 20},
                {'name': 'Plan Approval', 'name_ar': 'موافقة الخطة', 'type': 'approval', 'duration': 15},
                {'name': 'Family Notification', 'name_ar': 'إشعار الأسرة', 'type': 'notification', 'duration': 10}
            ]
        },
        {
            'name': 'Family Communication Protocol',
            'name_ar': 'بروتوكول التواصل العائلي',
            'description': 'Standard process for family communication and updates',
            'description_ar': 'عملية معيارية للتواصل العائلي والتحديثات',
            'category': WorkflowCategory.FAMILY_COMMUNICATION,
            'complexity_level': 'low',
            'estimated_duration': 30,
            'steps': [
                {'name': 'Progress Summary', 'name_ar': 'ملخص التقدم', 'type': 'task', 'duration': 10},
                {'name': 'Family Meeting', 'name_ar': 'اجتماع الأسرة', 'type': 'task', 'duration': 20}
            ]
        },
        {
            'name': 'Documentation Review',
            'name_ar': 'مراجعة الوثائق',
            'description': 'Quality assurance review of patient documentation',
            'description_ar': 'مراجعة ضمان الجودة لوثائق المرضى',
            'category': WorkflowCategory.DOCUMENTATION,
            'complexity_level': 'medium',
            'estimated_duration': 45,
            'steps': [
                {'name': 'Document Collection', 'name_ar': 'جمع الوثائق', 'type': 'task', 'duration': 15},
                {'name': 'Quality Check', 'name_ar': 'فحص الجودة', 'type': 'task', 'duration': 20},
                {'name': 'Supervisor Approval', 'name_ar': 'موافقة المشرف', 'type': 'approval', 'duration': 10}
            ]
        },
        {
            'name': 'Administrative Task Processing',
            'name_ar': 'معالجة المهام الإدارية',
            'description': 'Standard workflow for administrative tasks',
            'description_ar': 'سير عمل معياري للمهام الإدارية',
            'category': WorkflowCategory.ADMINISTRATIVE,
            'complexity_level': 'low',
            'estimated_duration': 25,
            'steps': [
                {'name': 'Task Assignment', 'name_ar': 'تعيين المهمة', 'type': 'task', 'duration': 5},
                {'name': 'Task Execution', 'name_ar': 'تنفيذ المهمة', 'type': 'task', 'duration': 15},
                {'name': 'Completion Verification', 'name_ar': 'التحقق من الإنجاز', 'type': 'approval', 'duration': 5}
            ]
        }
    ]
    
    templates = []
    for template_data in templates_data:
        template = WorkflowTemplate(
            name=template_data['name'],
            name_ar=template_data['name_ar'],
            description=template_data['description'],
            description_ar=template_data['description_ar'],
            category=template_data['category'],
            version='1.0',
            status=WorkflowStatus.ACTIVE,
            complexity_level=template_data['complexity_level'],
            estimated_duration=template_data['estimated_duration'],
            usage_count=random.randint(5, 50),
            success_rate=random.uniform(75, 95),
            created_at=fake.date_time_between(start_date='-6M', end_date='now'),
            created_by=1
        )
        
        db.session.add(template)
        db.session.flush()  # Get the template ID
        
        # Add steps
        for i, step_data in enumerate(template_data['steps']):
            step = WorkflowStep(
                template_id=template.id,
                name=step_data['name'],
                name_ar=step_data['name_ar'],
                step_type=StepType(step_data['type']),
                step_order=i + 1,
                estimated_duration=step_data['duration'],
                is_required=True,
                created_at=template.created_at,
                created_by=1
            )
            db.session.add(step)
        
        templates.append(template)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(templates)} قالب سير عمل")
    return templates

def create_workflow_instances(templates):
    """Create sample workflow instances"""
    print("🔄 إنشاء حالات سير العمل...")
    
    instances = []
    statuses = [InstanceStatus.ACTIVE, InstanceStatus.COMPLETED, InstanceStatus.CANCELLED]
    priorities = [InstancePriority.LOW, InstancePriority.MEDIUM, InstancePriority.HIGH, InstancePriority.URGENT]
    
    for template in templates:
        # Create 3-8 instances per template
        num_instances = random.randint(3, 8)
        
        for i in range(num_instances):
            start_date = fake.date_time_between(start_date='-3M', end_date='now')
            status = random.choice(statuses)
            
            instance = WorkflowInstance(
                template_id=template.id,
                name=f"{template.name_ar} - {fake.first_name()}",
                reference_id=f"REF-{fake.random_number(digits=6)}",
                status=status,
                priority=random.choice(priorities),
                progress_percentage=random.randint(0, 100) if status == InstanceStatus.ACTIVE else (100 if status == InstanceStatus.COMPLETED else random.randint(0, 50)),
                started_at=start_date,
                completed_at=start_date + timedelta(days=random.randint(1, 30)) if status == InstanceStatus.COMPLETED else None,
                assigned_to=random.randint(1, 5),
                created_by=1,
                created_at=start_date
            )
            
            db.session.add(instance)
            db.session.flush()
            
            # Create step instances
            steps = WorkflowStep.query.filter_by(template_id=template.id).order_by(WorkflowStep.step_order).all()
            for step in steps:
                step_status = StepStatus.COMPLETED if instance.status == InstanceStatus.COMPLETED else random.choice([StepStatus.PENDING, StepStatus.IN_PROGRESS, StepStatus.COMPLETED])
                
                step_instance = WorkflowStepInstance(
                    instance_id=instance.id,
                    step_id=step.id,
                    status=step_status,
                    assigned_to=random.randint(1, 5),
                    started_at=start_date + timedelta(hours=random.randint(0, 48)) if step_status != StepStatus.PENDING else None,
                    completed_at=start_date + timedelta(hours=random.randint(24, 72)) if step_status == StepStatus.COMPLETED else None,
                    created_at=start_date
                )
                
                db.session.add(step_instance)
            
            instances.append(instance)
    
    db.session.commit()
    print(f"✅ تم إنشاء {len(instances)} حالة سير عمل")
    return instances

def print_summary():
    """Print summary of created data"""
    print("\n" + "="*50)
    print("📊 ملخص البيانات المُنشأة:")
    print("="*50)
    
    # Templates summary
    templates_count = WorkflowTemplate.query.count()
    active_templates = WorkflowTemplate.query.filter_by(status=WorkflowStatus.ACTIVE).count()
    print(f"📋 إجمالي القوالب: {templates_count}")
    print(f"🟢 القوالب النشطة: {active_templates}")
    
    # Category distribution
    print("\n📊 توزيع القوالب حسب الفئة:")
    for category in WorkflowCategory:
        count = WorkflowTemplate.query.filter_by(category=category).count()
        if count > 0:
            print(f"   • {category.value}: {count}")
    
    # Instances summary
    instances_count = WorkflowInstance.query.count()
    active_instances = WorkflowInstance.query.filter_by(status=InstanceStatus.ACTIVE).count()
    completed_instances = WorkflowInstance.query.filter_by(status=InstanceStatus.COMPLETED).count()
    
    print(f"\n🔄 إجمالي حالات سير العمل: {instances_count}")
    print(f"🟢 النشطة: {active_instances}")
    print(f"✅ المكتملة: {completed_instances}")
    
    # Steps summary
    steps_count = WorkflowStep.query.count()
    step_instances_count = WorkflowStepInstance.query.count()
    
    print(f"\n📝 إجمالي خطوات القوالب: {steps_count}")
    print(f"🔄 إجمالي حالات الخطوات: {step_instances_count}")
    
    print("\n✅ تم إنشاء جميع البيانات التجريبية بنجاح!")
    print("🌐 يمكنك الآن الوصول إلى نظام قوالب سير العمل من لوحة التحكم")

def main():
    """Main function to create all sample data"""
    print("🚀 بدء إنشاء البيانات التجريبية لنظام قوالب سير العمل")
    print("="*60)
    
    with app.app_context():
        try:
            # Clear existing data
            clear_existing_data()
            
            # Create workflow templates
            templates = create_workflow_templates()
            
            # Create workflow instances
            create_workflow_instances(templates)
            
            # Print summary
            print_summary()
            
        except Exception as e:
            print(f"❌ خطأ في إنشاء البيانات: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    main()
