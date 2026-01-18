#!/usr/bin/env python
"""
Sample Data Generator for Therapy Management System
Creates realistic test data for development and testing
"""

import random
from datetime import datetime, timedelta
from app import app, db
from models import User, Beneficiary, Session


def generate_sample_users(count=50):
    """Generate sample user accounts"""
    users = []
    first_names = ['أحمد', 'فاطمة', 'محمد', 'نور', 'سارة', 'علي', 'ليلى', 'عمر', 'هند', 'خالد']
    last_names = ['أحمد', 'محمد', 'علي', 'الهاشمي', 'السلام', 'الجارودي', 'الحربي', 'العتيبي', 'الشريف', 'الراشد']

    for i in range(count):
        user = User(
            username=f'therapist_{i+1}',
            email=f'therapist{i+1}@therapy.com',
            first_name=random.choice(first_names),
            last_name=random.choice(last_names),
            password='test_password_123'
        )
        user.set_password('test_password_123')
        users.append(user)
        db.session.add(user)

    db.session.commit()
    print(f"✅ Created {count} users")
    return users


def generate_sample_beneficiaries(users, count=200):
    """Generate sample beneficiary records"""
    beneficiaries = []
    first_names = ['عائشة', 'زينب', 'خديجة', 'أمينة', 'نعيمة', 'جميلة', 'فاطمة', 'مريم']
    last_names = ['الأحمد', 'المحمود', 'العلي', 'الهاشم', 'الراشد', 'الحربي', 'العتيبي', 'الشريف']

    for i in range(count):
        # Random date of birth between 5-60 years old
        age = random.randint(5, 60)
        dob = datetime.now() - timedelta(days=age*365 + random.randint(0, 365))

        beneficiary = Beneficiary(
            name=f"{random.choice(first_names)} {random.choice(last_names)}",
            national_id=f"{random.randint(10**9, 10**10 - 1)}",
            date_of_birth=dob,
            user_id=random.choice(users).id
        )
        beneficiaries.append(beneficiary)
        db.session.add(beneficiary)

    db.session.commit()
    print(f"✅ Created {count} beneficiaries")
    return beneficiaries


def generate_sample_sessions(beneficiaries, count=500):
    """Generate sample session records"""
    sessions = []
    notes_templates = [
        "جلسة تقييم أولية - تقدم جيد",
        "متابعة العلاج - تحسن ملحوظ",
        "جلسة مكثفة - تركيز على الأهداف",
        "تقييم شهري - نتائج إيجابية",
        "جلسة نهائية - استعداد للخروج",
        "متابعة ما بعد العلاج",
        "جلسة استرجاع - تعزيز المكاسب"
    ]

    for i in range(count):
        beneficiary = random.choice(beneficiaries)

        # Random session date in last 6 months
        session_date = datetime.now() - timedelta(days=random.randint(0, 180))
        start_time = session_date.replace(hour=random.randint(9, 17), minute=0, second=0)
        duration = random.randint(30, 120)  # 30-120 minutes
        end_time = start_time + timedelta(minutes=duration)

        session = Session(
            beneficiary_id=beneficiary.id,
            start_time=start_time,
            end_time=end_time,
            notes=random.choice(notes_templates)
        )
        sessions.append(session)
        db.session.add(session)

    db.session.commit()
    print(f"✅ Created {count} sessions")
    return sessions


def generate_analytics_data():
    """Generate aggregated analytics"""
    users = User.query.all()
    beneficiaries = Beneficiary.query.all()
    sessions = Session.query.all()

    stats = {
        'total_users': len(users),
        'total_beneficiaries': len(beneficiaries),
        'total_sessions': len(sessions),
        'avg_sessions_per_beneficiary': len(sessions) / max(len(beneficiaries), 1),
        'active_beneficiaries': len(set(s.beneficiary_id for s in sessions)),
        'date_range': {
            'earliest': min(s.start_time for s in sessions) if sessions else None,
            'latest': max(s.end_time for s in sessions) if sessions else None
        }
    }

    print("\n📊 Analytics Summary:")
    print(f"  Users: {stats['total_users']}")
    print(f"  Beneficiaries: {stats['total_beneficiaries']}")
    print(f"  Sessions: {stats['total_sessions']}")
    print(f"  Avg Sessions/Beneficiary: {stats['avg_sessions_per_beneficiary']:.1f}")
    print(f"  Active Beneficiaries: {stats['active_beneficiaries']}")

    return stats


def main():
    """Main function to generate all sample data"""
    with app.app_context():
        try:
            # Clear existing data (optional - comment out to keep data)
            # print("🗑️  Clearing existing data...")
            # Session.query.delete()
            # Beneficiary.query.delete()
            # User.query.delete()
            # db.session.commit()

            print("🚀 Starting sample data generation...\n")

            # Generate sample data
            print("👥 Generating users...")
            users = generate_sample_users(50)

            print("🧑‍🤝 Generating beneficiaries...")
            beneficiaries = generate_sample_beneficiaries(users, 200)

            print("📅 Generating sessions...")
            sessions = generate_sample_sessions(beneficiaries, 500)

            print("\n" + "="*50)
            print("✅ SAMPLE DATA GENERATION COMPLETE")
            print("="*50)

            # Display analytics
            generate_analytics_data()

            print("\n🎉 All sample data created successfully!")
            print("\n💡 Next Steps:")
            print("  1. Run tests: pytest tests/ -v")
            print("  2. Start server: python -m flask run")
            print("  3. Test with sample data: curl http://localhost:5000/api/beneficiaries")

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    main()
