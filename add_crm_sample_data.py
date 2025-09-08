# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام إدارة علاقات العملاء (CRM)
"""

from app import app
from models import *
from datetime import datetime, timedelta
import random
from decimal import Decimal

def add_crm_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام CRM"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام CRM...")
            
            # إضافة العملاء
            customers = []
            customer_names = [
                "أحمد محمد العلي", "فاطمة سالم الزهراني", "خالد عبدالله القحطاني",
                "نورا إبراهيم الشمري", "محمد سعد العتيبي", "هند علي الدوسري",
                "عبدالرحمن فهد المطيري", "سارة محمد الحربي", "يوسف عمر الغامدي",
                "ريم سلطان القرشي", "طارق حسن العنزي", "لينا أحمد الرشيد"
            ]
            
            for i, name in enumerate(customer_names):
                customer = CRMCustomer(
                    name=name,
                    email=f"customer{i+1}@example.com",
                    phone=f"05{random.randint(10000000, 99999999)}",
                    company=f"شركة {name.split()[0]}",
                    customer_type=random.choice(['individual', 'business']),
                    source=random.choice(['website', 'referral', 'social_media', 'advertising']),
                    status='active',
                    address=f"الرياض، حي {random.choice(['النرجس', 'الملقا', 'العليا', 'الروضة'])}",
                    notes=f"عميل مهم من {random.choice(['الرياض', 'جدة', 'الدمام'])}",
                    created_by=1
                )
                db.session.add(customer)
                customers.append(customer)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(customers)} عميل")
            
            # إضافة العملاء المحتملين
            leads = []
            lead_names = [
                "عبدالعزيز محمد النعيم", "أمل سعد الخالدي", "فيصل عبدالله البراك",
                "نوال حمد السديري", "سلطان علي الفايز", "دانا محمد الحكير",
                "بندر فهد الصالح", "رهف عمر الجبير", "ماجد حسن الشهري"
            ]
            
            for i, name in enumerate(lead_names):
                lead = CRMLead(
                    name=name,
                    email=f"lead{i+1}@example.com",
                    phone=f"05{random.randint(10000000, 99999999)}",
                    company=f"مؤسسة {name.split()[0]}",
                    source=random.choice(['website', 'referral', 'social_media', 'cold_call']),
                    status=random.choice(['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
                    score=random.randint(1, 100),
                    notes=f"عميل محتمل واعد من {random.choice(['الرياض', 'جدة', 'الخبر'])}",
                    created_by=1
                )
                db.session.add(lead)
                leads.append(lead)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(leads)} عميل محتمل")
            
            # إضافة الفرص التجارية
            opportunities = []
            for i in range(15):
                customer = random.choice(customers)
                opportunity = CRMOpportunity(
                    opportunity_code=f"OPP-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                    title=f"فرصة {random.choice(['تطوير موقع', 'تصميم تطبيق', 'استشارات تقنية', 'تدريب'])} - {customer.name}",
                    description=f"مشروع {random.choice(['متوسط', 'كبير', 'صغير'])} للعميل",
                    stage=random.choice(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
                    value=Decimal(str(random.randint(10000, 500000))),
                    probability=random.randint(10, 90),
                    customer_id=customer.id,
                    assigned_to=1,
                    expected_close_date=datetime.now() + timedelta(days=random.randint(30, 180)),
                    created_by=1
                )
                db.session.add(opportunity)
                opportunities.append(opportunity)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(opportunities)} فرصة تجارية")
            
            # إضافة الأنشطة
            activities = []
            activity_types = ['call', 'email', 'meeting', 'task', 'note']
            for i in range(25):
                activity = CRMActivity(
                    title=f"نشاط {random.choice(['متابعة', 'اجتماع', 'مكالمة', 'عرض تقديمي'])} - {i+1}",
                    description=f"وصف تفصيلي للنشاط رقم {i+1}",
                    activity_type=random.choice(activity_types),
                    priority=random.choice(['low', 'medium', 'high']),
                    status=random.choice(['pending', 'in_progress', 'completed', 'cancelled']),
                    due_date=datetime.now() + timedelta(days=random.randint(-30, 60)),
                    customer_id=random.choice(customers).id if random.choice([True, False]) else None,
                    opportunity_id=random.choice(opportunities).id if random.choice([True, False]) else None,
                    assigned_to=1,
                    created_by=1
                )
                db.session.add(activity)
                activities.append(activity)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(activities)} نشاط")
            
            # إضافة التواصل
            communications = []
            for i in range(20):
                customer = random.choice(customers)
                communication = CRMCommunication(
                    communication_type=random.choice(['call', 'email', 'sms', 'meeting']),
                    direction=random.choice(['inbound', 'outbound']),
                    subject=f"تواصل مع {customer.name}",
                    content=f"محتوى التواصل رقم {i+1}",
                    customer_id=customer.id,
                    lead_id=random.choice(leads).id if random.choice([True, False]) else None,
                    duration=random.randint(5, 60) if random.choice([True, False]) else None,
                    created_by=1
                )
                db.session.add(communication)
                communications.append(communication)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(communications)} تواصل")
            
            # إضافة الحملات التسويقية
            campaigns = []
            campaign_names = [
                "حملة الربيع 2024", "عروض الصيف الخاصة", "حملة العودة للمدارس",
                "عروض نهاية العام", "حملة المنتجات الجديدة"
            ]
            
            for i, name in enumerate(campaign_names):
                campaign = CRMCampaign(
                    campaign_code=f"CAMP-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}",
                    name=name,
                    description=f"وصف تفصيلي للحملة: {name}",
                    campaign_type=random.choice(['email', 'social_media', 'advertising', 'event']),
                    status=random.choice(['draft', 'active', 'paused', 'completed']),
                    budget=Decimal(str(random.randint(50000, 200000))),
                    start_date=datetime.now() - timedelta(days=random.randint(0, 90)),
                    end_date=datetime.now() + timedelta(days=random.randint(30, 120)),
                    created_by=1
                )
                db.session.add(campaign)
                campaigns.append(campaign)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(campaigns)} حملة تسويقية")
            
            # إضافة فئات الدعم
            support_categories = []
            category_names = [
                ("الدعم الفني", "مشاكل تقنية وأخطاء النظام"),
                ("الاستفسارات العامة", "أسئلة حول الخدمات والمنتجات"),
                ("الفوترة والمدفوعات", "مشاكل الدفع والفواتير"),
                ("طلبات التطوير", "طلبات ميزات جديدة وتحسينات")
            ]
            
            for name, desc in category_names:
                category = CRMSupportCategory(
                    name=name,
                    description=desc,
                    color=random.choice(['#007bff', '#28a745', '#ffc107', '#dc3545']),
                    sla_hours=random.choice([4, 8, 24, 48]),
                    created_by=1
                )
                db.session.add(category)
                support_categories.append(category)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(support_categories)} فئة دعم")
            
            # إضافة تذاكر الدعم
            support_tickets = []
            for i in range(15):
                customer = random.choice(customers)
                category = random.choice(support_categories)
                ticket = CRMSupportTicket(
                    ticket_number=f"TKT-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
                    subject=f"مشكلة في {random.choice(['النظام', 'التطبيق', 'الموقع', 'الخدمة'])} - {i+1}",
                    description=f"وصف تفصيلي للمشكلة رقم {i+1}",
                    status=random.choice(['open', 'in_progress', 'resolved', 'closed']),
                    priority=random.choice(['low', 'medium', 'high']),
                    customer_id=customer.id,
                    category_id=category.id,
                    assigned_to=1,
                    due_date=datetime.now() + timedelta(hours=category.sla_hours),
                    created_by=1
                )
                db.session.add(ticket)
                support_tickets.append(ticket)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(support_tickets)} تذكرة دعم")
            
            print("🎉 تم إكمال إضافة جميع البيانات التجريبية لنظام CRM بنجاح!")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    add_crm_sample_data()
