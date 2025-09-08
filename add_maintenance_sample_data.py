#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام الأعطال والصيانة
"""

import os
import sys
from datetime import datetime, timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import json

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import (
    BranchFaultReport, MaintenanceSchedule, MaintenanceRequest, 
    EquipmentInventory, MaintenanceLog, Clinic, User
)

def create_sample_data():
    """إنشاء بيانات تجريبية للاختبار"""
    
    with app.app_context():
        try:
            # إنشاء الجداول إذا لم تكن موجودة
            db.create_all()
            
            # التحقق من وجود فروع ومستخدمين
            clinic = Clinic.query.first()
            if not clinic:
                # إنشاء فرع تجريبي
                clinic = Clinic(
                    name="الفرع الرئيسي",
                    address="الرياض - حي النرجس",
                    phone="011-234-5678",
                    email="main@awail.com",
                    capacity=100,
                    status="active"
                )
                db.session.add(clinic)
                db.session.commit()
                print("✓ تم إنشاء فرع تجريبي")
            
            user = User.query.first()
            if not user:
                # إنشاء مستخدم تجريبي
                user = User(
                    username="admin",
                    email="admin@awail.com",
                    first_name="أحمد",
                    last_name="المدير",
                    role="admin",
                    is_active=True
                )
                user.set_password("admin123")
                db.session.add(user)
                db.session.commit()
                print("✓ تم إنشاء مستخدم تجريبي")
            
            # 1. إضافة تقارير أعطال تجريبية
            fault_reports_data = [
                {
                    "branch_id": clinic.id,
                    "branch_name": clinic.name,
                    "fault_type": "electrical",
                    "fault_category": "critical",
                    "fault_title": "انقطاع الكهرباء في القاعة الرئيسية",
                    "fault_description": "انقطاع مفاجئ في التيار الكهربائي يؤثر على جميع الأجهزة في القاعة الرئيسية",
                    "priority_level": "urgent",
                    "status": "reported",
                    "reported_by": user.id,
                    "location": "القاعة الرئيسية - الطابق الأول",
                    "estimated_cost": 2500.00,
                    "photos": json.dumps(["fault_electrical_001.jpg", "fault_electrical_002.jpg"]),
                    "documents": json.dumps(["electrical_report.pdf"])
                },
                {
                    "branch_id": clinic.id,
                    "branch_name": clinic.name,
                    "fault_type": "plumbing",
                    "fault_category": "normal",
                    "fault_title": "تسريب في حنفية المطبخ",
                    "fault_description": "تسريب مياه بسيط في حنفية المطبخ الرئيسي",
                    "priority_level": "normal",
                    "status": "in_progress",
                    "reported_by": user.id,
                    "assigned_to": user.id,
                    "location": "المطبخ - الطابق الأرضي",
                    "estimated_cost": 150.00
                },
                {
                    "branch_id": clinic.id,
                    "branch_name": clinic.name,
                    "fault_type": "hvac",
                    "fault_category": "normal",
                    "fault_title": "ضعف في التكييف",
                    "fault_description": "ضعف في أداء نظام التكييف في غرفة الاجتماعات",
                    "priority_level": "normal",
                    "status": "resolved",
                    "reported_by": user.id,
                    "assigned_to": user.id,
                    "location": "غرفة الاجتماعات - الطابق الثاني",
                    "estimated_cost": 800.00,
                    "actual_cost": 750.00,
                    "resolution_date": datetime.now() - timedelta(days=2)
                }
            ]
            
            for fault_data in fault_reports_data:
                if not BranchFaultReport.query.filter_by(fault_title=fault_data["fault_title"]).first():
                    fault_report = BranchFaultReport(**fault_data)
                    db.session.add(fault_report)
            
            # 2. إضافة جداول صيانة تجريبية
            maintenance_schedules_data = [
                {
                    "branch_id": clinic.id,
                    "maintenance_type": "preventive",
                    "equipment_name": "مولد الكهرباء الاحتياطي",
                    "equipment_location": "السطح",
                    "scheduled_date": datetime.now() + timedelta(days=7),
                    "estimated_duration": 120,
                    "maintenance_description": "صيانة دورية شهرية للمولد الكهربائي",
                    "estimated_cost": 500.00,
                    "status": "scheduled",
                    "created_by": user.id,
                    "recurrence_pattern": "monthly"
                },
                {
                    "branch_id": clinic.id,
                    "maintenance_type": "corrective",
                    "equipment_name": "نظام التكييف المركزي",
                    "equipment_location": "السطح",
                    "scheduled_date": datetime.now() + timedelta(days=3),
                    "estimated_duration": 240,
                    "maintenance_description": "إصلاح وحدة التكييف المركزي",
                    "estimated_cost": 1200.00,
                    "status": "scheduled",
                    "created_by": user.id,
                    "priority": "high"
                }
            ]
            
            for schedule_data in maintenance_schedules_data:
                if not MaintenanceSchedule.query.filter_by(equipment_name=schedule_data["equipment_name"]).first():
                    schedule = MaintenanceSchedule(**schedule_data)
                    db.session.add(schedule)
            
            # 3. إضافة طلبات صيانة تجريبية
            maintenance_requests_data = [
                {
                    "request_number": "MR-2024-001",
                    "branch_id": clinic.id,
                    "request_type": "emergency_repair",
                    "equipment_name": "نظام الإنذار",
                    "equipment_location": "مدخل المبنى",
                    "problem_description": "عطل في نظام الإنذار الرئيسي",
                    "urgency_level": "high",
                    "requested_budget": 3000.00,
                    "status": "pending",
                    "approval_status": "pending",
                    "requested_by": user.id,
                    "requested_completion_date": datetime.now() + timedelta(days=5)
                },
                {
                    "request_number": "MR-2024-002",
                    "branch_id": clinic.id,
                    "request_type": "upgrade",
                    "equipment_name": "أجهزة الكمبيوتر",
                    "equipment_location": "مكتب الإدارة",
                    "problem_description": "ترقية أجهزة الكمبيوتر القديمة",
                    "urgency_level": "normal",
                    "requested_budget": 15000.00,
                    "status": "approved",
                    "approval_status": "approved",
                    "requested_by": user.id,
                    "approved_by": user.id,
                    "approval_date": datetime.now() - timedelta(days=1),
                    "requested_completion_date": datetime.now() + timedelta(days=14)
                }
            ]
            
            for request_data in maintenance_requests_data:
                if not MaintenanceRequest.query.filter_by(request_number=request_data["request_number"]).first():
                    request = MaintenanceRequest(**request_data)
                    db.session.add(request)
            
            # 4. إضافة جرد معدات تجريبي
            equipment_data = [
                {
                    "equipment_code": "GEN-001",
                    "equipment_name": "مولد كهرباء احتياطي",
                    "equipment_type": "generator",
                    "branch_id": clinic.id,
                    "manufacturer": "كاتربيلر",
                    "model": "CAT-3516C",
                    "serial_number": "CAT123456789",
                    "purchase_date": datetime.now() - timedelta(days=365),
                    "purchase_cost": 45000.00,
                    "warranty_start": datetime.now() - timedelta(days=365),
                    "warranty_end": datetime.now() + timedelta(days=365),
                    "location": "السطح - الجانب الشرقي",
                    "condition_status": "good",
                    "operational_status": "operational",
                    "responsible_person": user.id,
                    "maintenance_contract": True,
                    "contractor_name": "شركة الصيانة المتقدمة",
                    "contractor_contact": "011-555-0123"
                },
                {
                    "equipment_code": "HVAC-001",
                    "equipment_name": "وحدة تكييف مركزي",
                    "equipment_type": "hvac",
                    "branch_id": clinic.id,
                    "manufacturer": "كاريير",
                    "model": "30RB-080",
                    "serial_number": "CARR987654321",
                    "purchase_date": datetime.now() - timedelta(days=730),
                    "purchase_cost": 25000.00,
                    "warranty_start": datetime.now() - timedelta(days=730),
                    "warranty_end": datetime.now() - timedelta(days=365),
                    "location": "السطح - الجانب الغربي",
                    "condition_status": "fair",
                    "operational_status": "operational",
                    "responsible_person": user.id,
                    "maintenance_contract": True,
                    "contractor_name": "شركة التبريد الحديثة"
                },
                {
                    "equipment_code": "COMP-001",
                    "equipment_name": "خادم الشبكة الرئيسي",
                    "equipment_type": "computer",
                    "branch_id": clinic.id,
                    "manufacturer": "ديل",
                    "model": "PowerEdge R740",
                    "serial_number": "DELL123ABC789",
                    "purchase_date": datetime.now() - timedelta(days=180),
                    "purchase_cost": 12000.00,
                    "warranty_start": datetime.now() - timedelta(days=180),
                    "warranty_end": datetime.now() + timedelta(days=1095),
                    "location": "غرفة الخوادم - الطابق الأرضي",
                    "condition_status": "excellent",
                    "operational_status": "operational",
                    "responsible_person": user.id
                }
            ]
            
            for equip_data in equipment_data:
                if not EquipmentInventory.query.filter_by(equipment_code=equip_data["equipment_code"]).first():
                    equipment = EquipmentInventory(**equip_data)
                    db.session.add(equipment)
            
            # 5. إضافة سجلات صيانة تجريبية
            fault_report = BranchFaultReport.query.filter_by(status="resolved").first()
            equipment = EquipmentInventory.query.first()
            
            if fault_report and equipment:
                maintenance_logs_data = [
                    {
                        "fault_report_id": fault_report.id,
                        "equipment_id": equipment.id,
                        "work_type": "repair",
                        "work_description": "إصلاح نظام التكييف وتنظيف المرشحات",
                        "start_time": datetime.now() - timedelta(days=3, hours=2),
                        "end_time": datetime.now() - timedelta(days=3),
                        "technician": user.id,
                        "work_status": "completed",
                        "parts_used": json.dumps([
                            {"name": "مرشح هواء", "quantity": 2, "cost": 150.00},
                            {"name": "غاز تبريد", "quantity": 1, "cost": 200.00}
                        ]),
                        "tools_used": json.dumps(["مفاتيح ربط", "جهاز قياس الضغط", "مكنسة كهربائية"]),
                        "labor_cost": 300.00,
                        "parts_cost": 350.00,
                        "total_cost": 650.00,
                        "quality_check": True,
                        "quality_rating": 5,
                        "work_notes": "تم إصلاح النظام بنجاح وتحسن الأداء بشكل ملحوظ",
                        "photos": json.dumps(["repair_before.jpg", "repair_after.jpg"]),
                        "follow_up_required": False
                    }
                ]
                
                for log_data in maintenance_logs_data:
                    if not MaintenanceLog.query.filter_by(fault_report_id=log_data["fault_report_id"]).first():
                        log = MaintenanceLog(**log_data)
                        db.session.add(log)
            
            # حفظ جميع البيانات
            db.session.commit()
            
            print("✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print(f"📊 إحصائيات البيانات المضافة:")
            print(f"   - تقارير الأعطال: {BranchFaultReport.query.count()}")
            print(f"   - جداول الصيانة: {MaintenanceSchedule.query.count()}")
            print(f"   - طلبات الصيانة: {MaintenanceRequest.query.count()}")
            print(f"   - جرد المعدات: {EquipmentInventory.query.count()}")
            print(f"   - سجلات الصيانة: {MaintenanceLog.query.count()}")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    create_sample_data()
