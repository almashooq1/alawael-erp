from app import app, db
from models import User
from risk_management_models import (
    RiskCategory, RiskAssessment, EmergencyPlan, IncidentReport,
    SafetyInspection, PreventiveMeasure, RiskMitigation
)
from datetime import datetime, date, time
import json

def add_risk_management_sample_data():
    """إضافة بيانات تجريبية لنظام إدارة المخاطر"""
    
    with app.app_context():
        print("🔄 بدء إضافة البيانات التجريبية لنظام إدارة المخاطر...")
        
        # الحصول على مستخدم افتراضي
        admin_user = User.query.filter_by(email='admin@awail.com').first()
        if not admin_user:
            admin_user = User.query.first()
        
        if not admin_user:
            print("❌ لا يوجد مستخدمين في النظام")
            return
        
        # 1. إضافة فئات المخاطر
        risk_categories = [
            {
                'name': 'مخاطر السلامة والأمان',
                'description': 'المخاطر المتعلقة بسلامة الأشخاص والممتلكات',
                'color_code': '#dc3545',
                'icon': 'fas fa-exclamation-triangle'
            },
            {
                'name': 'مخاطر صحية',
                'description': 'المخاطر المتعلقة بالصحة العامة والعدوى',
                'color_code': '#fd7e14',
                'icon': 'fas fa-virus'
            },
            {
                'name': 'مخاطر بيئية',
                'description': 'المخاطر المتعلقة بالبيئة والطقس',
                'color_code': '#198754',
                'icon': 'fas fa-leaf'
            },
            {
                'name': 'مخاطر تقنية',
                'description': 'المخاطر المتعلقة بالأنظمة التقنية والمعدات',
                'color_code': '#0d6efd',
                'icon': 'fas fa-laptop'
            },
            {
                'name': 'مخاطر مالية',
                'description': 'المخاطر المتعلقة بالأمور المالية والاقتصادية',
                'color_code': '#6f42c1',
                'icon': 'fas fa-coins'
            }
        ]
        
        categories_created = []
        for cat_data in risk_categories:
            category = RiskCategory.query.filter_by(name=cat_data['name']).first()
            if not category:
                category = RiskCategory(**cat_data)
                db.session.add(category)
                categories_created.append(category)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(categories_created)} فئة مخاطر")
        
        # 2. إضافة تقييمات المخاطر
        risk_assessments = [
            {
                'title': 'خطر الحريق في المختبر',
                'description': 'احتمالية نشوب حريق في المختبر بسبب المواد الكيميائية',
                'category_id': categories_created[0].id if categories_created else 1,
                'location': 'مختبر العلوم - الطابق الثاني',
                'department': 'قسم العلوم',
                'probability': 3,
                'impact': 5,
                'current_controls': 'أجهزة إنذار الحريق، طفايات الحريق',
                'recommended_actions': 'تدريب الموظفين، فحص دوري للمعدات',
                'created_by': admin_user.id
            },
            {
                'title': 'انتشار العدوى',
                'description': 'خطر انتشار الأمراض المعدية بين الطلاب',
                'category_id': categories_created[1].id if len(categories_created) > 1 else 1,
                'location': 'جميع الفصول الدراسية',
                'department': 'الشؤون الصحية',
                'probability': 4,
                'impact': 4,
                'current_controls': 'بروتوكولات التعقيم، فحص يومي للطلاب',
                'recommended_actions': 'تحديث بروتوكولات النظافة، توفير معقمات إضافية',
                'created_by': admin_user.id
            },
            {
                'title': 'عطل في نظام التكييف',
                'description': 'توقف أنظمة التكييف خلال فصل الصيف',
                'category_id': categories_created[3].id if len(categories_created) > 3 else 1,
                'location': 'المبنى الرئيسي',
                'department': 'الصيانة',
                'probability': 2,
                'impact': 3,
                'current_controls': 'صيانة دورية، قطع غيار احتياطية',
                'recommended_actions': 'عقد صيانة شامل، نظام تكييف احتياطي',
                'created_by': admin_user.id
            }
        ]
        
        assessments_created = []
        for assessment_data in risk_assessments:
            # حساب نتيجة المخاطر ومستواها
            probability = assessment_data['probability']
            impact = assessment_data['impact']
            risk_score = probability * impact
            
            if risk_score <= 5:
                risk_level = 'low'
            elif risk_score <= 10:
                risk_level = 'medium'
            elif risk_score <= 15:
                risk_level = 'high'
            else:
                risk_level = 'critical'
            
            assessment_data.update({
                'risk_code': f"RISK-{datetime.now().strftime('%Y%m%d')}-{len(assessments_created)+1:03d}",
                'risk_level': risk_level,
                'risk_score': risk_score,
                'status': 'identified',
                'priority': 'high' if risk_level in ['high', 'critical'] else 'medium'
            })
            
            assessment = RiskAssessment(**assessment_data)
            db.session.add(assessment)
            assessments_created.append(assessment)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(assessments_created)} تقييم مخاطر")
        
        # 3. إضافة خطط الطوارئ
        emergency_plans = [
            {
                'title': 'خطة إخلاء الحريق',
                'description': 'خطة شاملة لإخلاء المبنى في حالة الحريق',
                'emergency_type': 'fire',
                'scope': 'المبنى الرئيسي',
                'objectives': 'إخلاء آمن وسريع لجميع الأشخاص',
                'activation_criteria': 'إنذار الحريق أو رؤية دخان/نار',
                'procedures': json.dumps([
                    'تفعيل إنذار الحريق',
                    'إخلاء الطلاب والموظفين',
                    'التجمع في نقطة الأمان',
                    'الاتصال بالدفاع المدني'
                ]),
                'evacuation_routes': json.dumps([
                    'المخرج الرئيسي',
                    'المخرج الجانبي الشرقي',
                    'المخرج الخلفي'
                ]),
                'assembly_points': json.dumps([
                    'ساحة المدرسة الرئيسية',
                    'الملعب الخارجي'
                ]),
                'emergency_coordinator': admin_user.id,
                'created_by': admin_user.id
            },
            {
                'title': 'خطة الطوارئ الطبية',
                'description': 'خطة للتعامل مع الحالات الطبية الطارئة',
                'emergency_type': 'medical',
                'scope': 'جميع مرافق المركز',
                'objectives': 'تقديم الإسعافات الأولية والنقل للمستشفى',
                'activation_criteria': 'حدوث إصابة أو حالة طبية طارئة',
                'procedures': json.dumps([
                    'تقييم الحالة',
                    'تقديم الإسعافات الأولية',
                    'الاتصال بالإسعاف',
                    'إبلاغ الأهل'
                ]),
                'emergency_coordinator': admin_user.id,
                'created_by': admin_user.id
            }
        ]
        
        plans_created = []
        for plan_data in emergency_plans:
            plan_data['plan_code'] = f"EP-{datetime.now().strftime('%Y%m%d')}-{len(plans_created)+1:03d}"
            plan = EmergencyPlan(**plan_data)
            db.session.add(plan)
            plans_created.append(plan)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(plans_created)} خطة طوارئ")
        
        # 4. إضافة تقارير الحوادث
        incident_reports = [
            {
                'title': 'سقوط طالب في الملعب',
                'description': 'سقط طالب أثناء ممارسة الرياضة وأصيب في ركبته',
                'incident_type': 'injury',
                'severity': 'minor',
                'incident_date': date.today(),
                'incident_time': time(10, 30),
                'location': 'الملعب الرياضي',
                'injured_count': 1,
                'injury_details': 'كدمة في الركبة اليمنى',
                'medical_treatment': 'إسعافات أولية وكمادات باردة',
                'immediate_actions': 'نقل الطالب للعيادة وإبلاغ الأهل',
                'reported_by': admin_user.id
            },
            {
                'title': 'تسرب مياه في الفصل',
                'description': 'تسرب مياه من السقف في أحد الفصول',
                'incident_type': 'property_damage',
                'severity': 'moderate',
                'incident_date': date.today(),
                'incident_time': time(14, 15),
                'location': 'الفصل رقم 205',
                'property_damage': 'تلف في الأثاث والأجهزة الإلكترونية',
                'estimated_damage_cost': 5000.0,
                'immediate_actions': 'إخلاء الفصل وإيقاف التسرب',
                'reported_by': admin_user.id
            }
        ]
        
        incidents_created = []
        for incident_data in incident_reports:
            incident_data['incident_number'] = f"INC-{datetime.now().strftime('%Y%m%d')}-{len(incidents_created)+1:03d}"
            incident = IncidentReport(**incident_data)
            db.session.add(incident)
            incidents_created.append(incident)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(incidents_created)} تقرير حادث")
        
        # 5. إضافة تفتيشات السلامة
        safety_inspections = [
            {
                'title': 'تفتيش السلامة الشهري',
                'description': 'تفتيش دوري لجميع مرافق السلامة',
                'inspection_type': 'routine',
                'inspection_date': date.today(),
                'overall_rating': 'جيد',
                'compliance_percentage': 85.0,
                'lead_inspector': admin_user.id,
                'status': 'completed'
            },
            {
                'title': 'تفتيش أجهزة الإطفاء',
                'description': 'فحص جميع طفايات الحريق وأجهزة الإنذار',
                'inspection_type': 'special',
                'inspection_date': date.today(),
                'overall_rating': 'ممتاز',
                'compliance_percentage': 95.0,
                'lead_inspector': admin_user.id,
                'status': 'completed'
            }
        ]
        
        inspections_created = []
        for inspection_data in safety_inspections:
            inspection_data['inspection_number'] = f"SI-{datetime.now().strftime('%Y%m%d')}-{len(inspections_created)+1:03d}"
            inspection = SafetyInspection(**inspection_data)
            db.session.add(inspection)
            inspections_created.append(inspection)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(inspections_created)} تفتيش سلامة")
        
        # 6. إضافة التدابير الوقائية
        preventive_measures = [
            {
                'title': 'تدريب الموظفين على السلامة',
                'description': 'برنامج تدريبي شامل لجميع الموظفين على إجراءات السلامة',
                'category': 'training',
                'type': 'preventive',
                'status': 'active',
                'priority': 'high',
                'responsible_person': admin_user.id,
                'estimated_cost': 15000.0,
                'created_by': admin_user.id
            },
            {
                'title': 'تحديث أنظمة الإنذار',
                'description': 'تحديث وصيانة جميع أنظمة الإنذار في المبنى',
                'category': 'engineering',
                'type': 'preventive',
                'status': 'planned',
                'priority': 'medium',
                'responsible_person': admin_user.id,
                'estimated_cost': 25000.0,
                'created_by': admin_user.id
            }
        ]
        
        measures_created = []
        for measure_data in preventive_measures:
            measure_data['measure_code'] = f"PM-{datetime.now().strftime('%Y%m%d')}-{len(measures_created)+1:03d}"
            measure = PreventiveMeasure(**measure_data)
            db.session.add(measure)
            measures_created.append(measure)
        
        db.session.commit()
        print(f"✅ تم إنشاء {len(measures_created)} تدبير وقائي")
        
        print("🎉 تم إنشاء جميع البيانات التجريبية لنظام إدارة المخاطر بنجاح!")
        print(f"📊 الإحصائيات:")
        print(f"   - فئات المخاطر: {len(categories_created)}")
        print(f"   - تقييمات المخاطر: {len(assessments_created)}")
        print(f"   - خطط الطوارئ: {len(plans_created)}")
        print(f"   - تقارير الحوادث: {len(incidents_created)}")
        print(f"   - تفتيشات السلامة: {len(inspections_created)}")
        print(f"   - التدابير الوقائية: {len(measures_created)}")

if __name__ == '__main__':
    add_risk_management_sample_data()
