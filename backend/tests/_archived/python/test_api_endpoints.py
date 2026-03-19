"""
اختبار سريع لـ API - Quick API Test
test_api_endpoints.py
"""

import requests
import json
from datetime import datetime, timedelta

# ==========================================
# إعدادات الاختبار
# ==========================================

BASE_URL = "http://localhost:5000/api"
HEADERS = {
    "Content-Type": "application/json",
    # "Authorization": "Bearer YOUR_JWT_TOKEN"  # أضف التوكن إذا لزم الأمر
}

# ==========================================
# وظائف مساعدة
# ==========================================

def print_result(test_name, success, response=None):
    """طباعة نتيجة الاختبار"""
    status = "✅" if success else "❌"
    print(f"\n{status} {test_name}")
    if response:
        print(f"   Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except:
            print(f"   Response: {response.text}")

# ==========================================
# اختبارات صحة النظام
# ==========================================

def test_health_check():
    """اختبار Health Check"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        success = response.status_code == 200
        print_result("Health Check", success, response)
        return success
    except Exception as e:
        print_result("Health Check", False)
        print(f"   Error: {e}")
        return False

def test_index():
    """اختبار الصفحة الرئيسية"""
    try:
        response = requests.get("http://localhost:5000/")
        success = response.status_code == 200
        print_result("Index Page", success, response)
        return success
    except Exception as e:
        print_result("Index Page", False)
        print(f"   Error: {e}")
        return False

# ==========================================
# اختبارات التقارير
# ==========================================

def test_advanced_report():
    """اختبار التقرير الشامل"""
    try:
        student_id = "STU001"  # استبدل بـ student_id من قاعدة البيانات
        
        params = {
            "date_from": (datetime.now() - timedelta(days=30)).isoformat(),
            "date_to": datetime.now().isoformat(),
            "report_type": "comprehensive",
            "focus_area": "all"
        }
        
        response = requests.get(
            f"{BASE_URL}/student-reports/{student_id}/advanced",
            params=params,
            headers=HEADERS
        )
        
        success = response.status_code == 200
        print_result("Advanced Report", success, response)
        return success
    except Exception as e:
        print_result("Advanced Report", False)
        print(f"   Error: {e}")
        return False

def test_comparison_report():
    """اختبار تقرير المقارنة"""
    try:
        student_id = "STU001"
        
        body = {
            "period1": {
                "from": (datetime.now() - timedelta(days=60)).isoformat(),
                "to": (datetime.now() - timedelta(days=30)).isoformat()
            },
            "period2": {
                "from": (datetime.now() - timedelta(days=30)).isoformat(),
                "to": datetime.now().isoformat()
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/student-reports/{student_id}/comparison",
            json=body,
            headers=HEADERS
        )
        
        success = response.status_code == 200
        print_result("Comparison Report", success, response)
        return success
    except Exception as e:
        print_result("Comparison Report", False)
        print(f"   Error: {e}")
        return False

def test_predictive_report():
    """اختبار التنبؤات"""
    try:
        student_id = "STU001"
        
        params = {
            "weeks_ahead": 8
        }
        
        response = requests.get(
            f"{BASE_URL}/student-reports/{student_id}/predictive",
            params=params,
            headers=HEADERS
        )
        
        success = response.status_code == 200
        print_result("Predictive Report", success, response)
        return success
    except Exception as e:
        print_result("Predictive Report", False)
        print(f"   Error: {e}")
        return False

def test_risk_assessment():
    """اختبار تقييم المخاطر"""
    try:
        student_id = "STU001"
        
        response = requests.get(
            f"{BASE_URL}/student-reports/{student_id}/risk-assessment",
            headers=HEADERS
        )
        
        success = response.status_code == 200
        print_result("Risk Assessment", success, response)
        return success
    except Exception as e:
        print_result("Risk Assessment", False)
        print(f"   Error: {e}")
        return False

def test_summary_report():
    """اختبار الملخص السريع"""
    try:
        student_id = "STU001"
        
        response = requests.get(
            f"{BASE_URL}/student-reports/{student_id}/summary",
            headers=HEADERS
        )
        
        success = response.status_code == 200
        print_result("Summary Report", success, response)
        return success
    except Exception as e:
        print_result("Summary Report", False)
        print(f"   Error: {e}")
        return False

# ==========================================
# تشغيل جميع الاختبارات
# ==========================================

def run_all_tests():
    """تشغيل جميع الاختبارات"""
    print("\n" + "="*50)
    print("🧪 اختبار نظام التقارير المتقدمة")
    print("Advanced Reports System - API Testing")
    print("="*50)
    
    results = {
        "Health Check": test_health_check(),
        "Index": test_index(),
        "Advanced Report": test_advanced_report(),
        "Comparison Report": test_comparison_report(),
        "Predictive Report": test_predictive_report(),
        "Risk Assessment": test_risk_assessment(),
        "Summary Report": test_summary_report(),
    }
    
    # ملخص النتائج
    print("\n" + "="*50)
    print("📊 ملخص النتائج:")
    print("="*50)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
    
    print("\n" + "-"*50)
    print(f"النتيجة: {passed}/{total} نجح")
    print(f"النسبة: {(passed/total*100):.1f}%")
    print("="*50 + "\n")
    
    return passed == total

# ==========================================
# نقطة الدخول
# ==========================================

if __name__ == "__main__":
    import sys
    
    print("\n⏳ جاري الاتصال بـ Server...")
    print(f"URL: {BASE_URL}")
    
    try:
        # اختبار الاتصال
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print("✅ الخادم يستجيب")
    except requests.exceptions.ConnectionError:
        print("❌ لا يمكن الاتصال بالخادم")
        print("❌ تأكد من تشغيل: python backend/app.py")
        sys.exit(1)
    except Exception as e:
        print(f"❌ خطأ: {e}")
        sys.exit(1)
    
    # تشغيل الاختبارات
    success = run_all_tests()
    sys.exit(0 if success else 1)
