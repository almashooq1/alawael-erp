# 📚 أمثلة عملية لاستخدام نظام التأهيل AGI

## نظرة عامة

هذا الدليل يحتوي على أمثلة عملية وجاهزة للاستخدام لنظام AGI المتخصص في مراكز
تأهيل ذوي الإعاقة.

---

## 🎯 أمثلة cURL

### 1. تحليل حالة مستفيد

```bash
curl -X POST http://localhost:5001/api/rehab-agi/beneficiary/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001"
  }'
```

**الاستجابة المتوقعة:**

```json
{
  "success": true,
  "data": {
    "overallStatus": "good",
    "strengths": [
      "حضور منتظم بنسبة 95%",
      "تحسن ملحوظ في مهارات التواصل",
      "تفاعل إيجابي مع البرامج"
    ],
    "concerns": ["انخفاض طفيف في التقدم الشهري"],
    "recommendations": [
      "زيادة عدد جلسات العلاج الطبيعي إلى 4 مرات أسبوعياً",
      "إضافة جلسات علاج نطق إضافية",
      "التركيز على المهارات الحركية الدقيقة"
    ],
    "riskLevel": "low"
  },
  "timestamp": "2026-01-30T10:30:00.000Z"
}
```

### 2. اقتراح برامج تأهيلية

```bash
curl -X POST http://localhost:5001/api/rehab-agi/beneficiary/suggest-program \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-002"
  }'
```

**الاستجابة المتوقعة:**

```json
{
  "success": true,
  "data": {
    "recommendedPrograms": [
      {
        "type": "physiotherapy",
        "priority": "high",
        "reason": "تحسين القوة العضلية والتوازن بناءً على التقييم الحركي",
        "sessionsPerWeek": 3,
        "durationWeeks": 12,
        "expectedOutcomes": [
          "تحسين القدرة على المشي",
          "زيادة القوة العضلية بنسبة 30%",
          "تحسين التوازن"
        ]
      },
      {
        "type": "occupational-therapy",
        "priority": "medium",
        "reason": "تطوير مهارات الحياة اليومية والاستقلالية",
        "sessionsPerWeek": 2,
        "durationWeeks": 12,
        "expectedOutcomes": [
          "القدرة على ارتداء الملابس بشكل مستقل",
          "تحسين مهارات الأكل",
          "استخدام الحمام بمساعدة أقل"
        ]
      },
      {
        "type": "speech-therapy",
        "priority": "medium",
        "reason": "تطوير مهارات النطق الواضح والتواصل الفعال",
        "sessionsPerWeek": 2,
        "durationWeeks": 12,
        "expectedOutcomes": [
          "نطق 50 كلمة بوضوح",
          "تكوين جمل بسيطة",
          "تحسين التواصل البصري"
        ]
      }
    ],
    "teamRecommendations": [
      {
        "role": "أخصائي علاج طبيعي",
        "specialization": "العلاج الحركي للأطفال",
        "experience": "5+ سنوات",
        "reason": "خبرة في حالات الشلل الدماغي"
      },
      {
        "role": "أخصائي علاج وظيفي",
        "specialization": "تطوير المهارات الحياتية",
        "experience": "3+ سنوات"
      },
      {
        "role": "أخصائي نطق ولغة",
        "specialization": "اضطرابات النطق النمائية",
        "experience": "4+ سنوات"
      }
    ],
    "estimatedCost": 10800,
    "costBreakdown": {
      "physiotherapy": 5400,
      "occupationalTherapy": 3600,
      "speechTherapy": 3600
    }
  },
  "timestamp": "2026-01-30T10:35:00.000Z"
}
```

### 3. التنبؤ بالتقدم

```bash
curl -X POST http://localhost:5001/api/rehab-agi/beneficiary/predict-progress \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001",
    "months": 6
  }'
```

**الاستجابة المتوقعة:**

```json
{
  "success": true,
  "data": {
    "predictedProgress": {
      "overallImprovement": 35,
      "areaImprovements": {
        "motor-skills": 40,
        "communication": 30,
        "social-interaction": 35,
        "daily-living": 30,
        "cognition": 25
      }
    },
    "confidenceLevel": 0.85,
    "expectedAchievements": [
      "المشي لمسافة 100 متر بدون مساعدة",
      "نطق جمل بسيطة (3-5 كلمات) بوضوح",
      "التفاعل مع الأقران في الأنشطة الجماعية",
      "ارتداء الملابس بمساعدة قليلة",
      "استخدام الأدوات البسيطة (ملعقة، كوب)"
    ],
    "potentialChallenges": [
      "قد يحتاج وقتاً أطول للمهارات الحركية الدقيقة",
      "احتمال ظهور مقاومة في الشهر الثالث (فترة الملل)",
      "قد يتطلب دعماً إضافياً في المهارات الاجتماعية"
    ],
    "recommendedInterventions": [
      "جلسات علاج طبيعي مكثفة (4 مرات أسبوعياً) في الشهرين الأولين",
      "تمارين منزلية يومية لمدة 30 دقيقة",
      "دمج اجتماعي تدريجي مع أطفال في نفس المستوى",
      "متابعة شهرية مع أخصائي نفسي",
      "ورش عمل للوالدين كل شهرين"
    ],
    "milestones": [
      {
        "month": 2,
        "expectedProgress": 15,
        "key": "تحسن أولي في القوة العضلية والتوازن"
      },
      {
        "month": 4,
        "expectedProgress": 25,
        "key": "تحسن ملحوظ في النطق والتواصل"
      },
      {
        "month": 6,
        "expectedProgress": 35,
        "key": "استقلالية جزئية في المهارات اليومية"
      }
    ]
  },
  "timestamp": "2026-01-30T10:40:00.000Z"
}
```

### 4. تحليل فعالية برنامج

```bash
curl -X POST http://localhost:5001/api/rehab-agi/program/analyze-effectiveness \
  -H "Content-Type: application/json" \
  -d '{
    "programId": "PROG-001"
  }'
```

### 5. تحسين الجدولة

```bash
curl -X POST http://localhost:5001/api/rehab-agi/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-01",
    "location": "المركز الرئيسي"
  }'
```

### 6. مزامنة مع ERP

```bash
curl -X POST http://localhost:5001/api/rehab-agi/erp/sync-beneficiary \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001"
  }'
```

### 7. إنشاء فاتورة

```bash
curl -X POST http://localhost:5001/api/rehab-agi/erp/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001",
    "items": [
      {
        "description": "جلسات علاج طبيعي - يناير 2026",
        "quantity": 12,
        "unitPrice": 150,
        "total": 1800
      },
      {
        "description": "جلسات علاج نطق - يناير 2026",
        "quantity": 8,
        "unitPrice": 150,
        "total": 1200
      }
    ],
    "totalAmount": 3000,
    "dueDate": "2026-02-15"
  }'
```

### 8. تسجيل دفعة

```bash
curl -X POST http://localhost:5001/api/rehab-agi/erp/record-payment \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001",
    "amount": 1500,
    "method": "credit-card",
    "reference": "PAY-2026-001",
    "notes": "دفعة جزئية - الفاتورة INV-2026-001"
  }'
```

---

## 💻 أمثلة JavaScript/TypeScript

### مثال 1: تطبيق Node.js بسيط

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/rehab-agi';

// تحليل مستفيد
async function analyzeBeneficiary(beneficiaryId: string) {
  try {
    const response = await axios.post(`${API_BASE_URL}/beneficiary/analyze`, {
      beneficiaryId,
    });

    console.log('✅ تحليل المستفيد:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ خطأ:', error.response?.data || error.message);
    throw error;
  }
}

// اقتراح برامج
async function suggestPrograms(beneficiaryId: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/beneficiary/suggest-program`,
      {
        beneficiaryId,
      }
    );

    console.log('✅ البرامج المقترحة:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ خطأ:', error.response?.data || error.message);
    throw error;
  }
}

// التنبؤ بالتقدم
async function predictProgress(beneficiaryId: string, months: number) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/beneficiary/predict-progress`,
      {
        beneficiaryId,
        months,
      }
    );

    console.log('✅ التنبؤ بالتقدم:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ خطأ:', error.response?.data || error.message);
    throw error;
  }
}

// سير عمل كامل
async function completeWorkflow() {
  const beneficiaryId = 'BEN-001';

  console.log('\n🔍 1. تحليل حالة المستفيد...');
  const analysis = await analyzeBeneficiary(beneficiaryId);

  console.log('\n💡 2. اقتراح البرامج المناسبة...');
  const programs = await suggestPrograms(beneficiaryId);

  console.log('\n📈 3. التنبؤ بالتقدم (6 أشهر)...');
  const prediction = await predictProgress(beneficiaryId, 6);

  console.log('\n✅ سير العمل مكتمل!');

  return {
    analysis,
    programs,
    prediction,
  };
}

// تشغيل السير
completeWorkflow().catch(console.error);
```

### مثال 2: تطبيق React

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/rehab-agi';

interface BeneficiaryAnalysis {
  overallStatus: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  riskLevel: string;
}

function BeneficiaryDashboard() {
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [analysis, setAnalysis] = useState<BeneficiaryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!beneficiaryId) {
      setError('يرجى إدخال معرف المستفيد');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/beneficiary/analyze`, {
        beneficiaryId
      });

      setAnalysis(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء التحليل');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🏥 لوحة تحكم المستفيد</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="معرف المستفيد (مثال: BEN-001)"
          value={beneficiaryId}
          onChange={(e) => setBeneficiaryId(e.target.value)}
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          {loading ? '⏳ جاري التحليل...' : '🔍 تحليل'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {analysis && (
        <div>
          <div style={{
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h2>📊 نتائج التحليل</h2>
            <p>
              <strong>الحالة العامة:</strong> {analysis.overallStatus}
            </p>
            <p>
              <strong>مستوى المخاطر:</strong>{' '}
              <span style={{
                color: getRiskColor(analysis.riskLevel),
                fontWeight: 'bold'
              }}>
                {analysis.riskLevel}
              </span>
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>✅ نقاط القوة</h3>
            <ul>
              {analysis.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>

          {analysis.concerns.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>⚠️ المخاوف</h3>
              <ul>
                {analysis.concerns.map((concern, index) => (
                  <li key={index}>{concern}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3>💡 التوصيات</h3>
            <ul>
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeneficiaryDashboard;
```

---

## 🐍 أمثلة Python

### مثال 1: سكريبت بسيط

```python
import requests
import json
from typing import Dict, Any

API_BASE_URL = 'http://localhost:5001/api/rehab-agi'

def analyze_beneficiary(beneficiary_id: str) -> Dict[str, Any]:
    """تحليل حالة مستفيد"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/beneficiary/analyze',
            json={'beneficiaryId': beneficiary_id}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'❌ خطأ: {e}')
        raise

def suggest_programs(beneficiary_id: str) -> Dict[str, Any]:
    """اقتراح برامج تأهيلية"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/beneficiary/suggest-program',
            json={'beneficiaryId': beneficiary_id}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'❌ خطأ: {e}')
        raise

def predict_progress(beneficiary_id: str, months: int) -> Dict[str, Any]:
    """التنبؤ بالتقدم"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/beneficiary/predict-progress',
            json={
                'beneficiaryId': beneficiary_id,
                'months': months
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'❌ خطأ: {e}')
        raise

def create_invoice(beneficiary_id: str, items: list, total: float, due_date: str) -> Dict[str, Any]:
    """إنشاء فاتورة"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/erp/create-invoice',
            json={
                'beneficiaryId': beneficiary_id,
                'items': items,
                'totalAmount': total,
                'dueDate': due_date
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'❌ خطأ: {e}')
        raise

def main():
    beneficiary_id = 'BEN-001'

    print('\n🔍 1. تحليل حالة المستفيد...')
    analysis = analyze_beneficiary(beneficiary_id)
    print(json.dumps(analysis, indent=2, ensure_ascii=False))

    print('\n💡 2. اقتراح البرامج...')
    programs = suggest_programs(beneficiary_id)
    print(json.dumps(programs, indent=2, ensure_ascii=False))

    print('\n📈 3. التنبؤ بالتقدم (6 أشهر)...')
    prediction = predict_progress(beneficiary_id, 6)
    print(json.dumps(prediction, indent=2, ensure_ascii=False))

    print('\n💰 4. إنشاء فاتورة...')
    invoice = create_invoice(
        beneficiary_id,
        items=[
            {
                'description': 'جلسات علاج طبيعي - يناير 2026',
                'quantity': 12,
                'unitPrice': 150,
                'total': 1800
            }
        ],
        total=1800,
        due_date='2026-02-15'
    )
    print(json.dumps(invoice, indent=2, ensure_ascii=False))

    print('\n✅ سير العمل مكتمل!')

if __name__ == '__main__':
    main()
```

### مثال 2: فئة للتفاعل مع API

```python
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

class RehabAGIClient:
    """عميل Python للتفاعل مع نظام Rehab AGI"""

    def __init__(self, base_url: str = 'http://localhost:5001/api/rehab-agi'):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """طلب HTTP عام"""
        url = f'{self.base_url}{endpoint}'

        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            else:
                raise ValueError(f'طريقة غير مدعومة: {method}')

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'❌ خطأ في الطلب: {e}')
            raise

    # تحليل المستفيدين
    def analyze_beneficiary(self, beneficiary_id: str) -> Dict[str, Any]:
        """تحليل شامل لحالة المستفيد"""
        return self._request('POST', '/beneficiary/analyze', {'beneficiaryId': beneficiary_id})

    def suggest_programs(self, beneficiary_id: str) -> Dict[str, Any]:
        """اقتراح برامج تأهيلية مناسبة"""
        return self._request('POST', '/beneficiary/suggest-program', {'beneficiaryId': beneficiary_id})

    def predict_progress(self, beneficiary_id: str, months: int) -> Dict[str, Any]:
        """التنبؤ بالتقدم المستقبلي"""
        return self._request('POST', '/beneficiary/predict-progress', {
            'beneficiaryId': beneficiary_id,
            'months': months
        })

    # إدارة البرامج
    def analyze_program_effectiveness(self, program_id: str) -> Dict[str, Any]:
        """تحليل فعالية برنامج تأهيلي"""
        return self._request('POST', '/program/analyze-effectiveness', {'programId': program_id})

    # الجدولة
    def optimize_schedule(self, date: str, location: str) -> Dict[str, Any]:
        """تحسين الجدول الزمني"""
        return self._request('POST', '/schedule/optimize', {
            'date': date,
            'location': location
        })

    # التقارير
    def generate_comprehensive_report(self, beneficiary_id: str) -> Dict[str, Any]:
        """توليد تقرير شامل للمستفيد"""
        return self._request('POST', '/report/comprehensive', {'beneficiaryId': beneficiary_id})

    # تكامل ERP
    def sync_beneficiary(self, beneficiary_id: str) -> Dict[str, Any]:
        """مزامنة بيانات المستفيد مع ERP"""
        return self._request('POST', '/erp/sync-beneficiary', {'beneficiaryId': beneficiary_id})

    def create_invoice(self, beneficiary_id: str, items: List[Dict],
                      total_amount: float, due_date: str) -> Dict[str, Any]:
        """إنشاء فاتورة في نظام ERP"""
        return self._request('POST', '/erp/create-invoice', {
            'beneficiaryId': beneficiary_id,
            'items': items,
            'totalAmount': total_amount,
            'dueDate': due_date
        })

    def record_payment(self, beneficiary_id: str, amount: float,
                      method: str, reference: str) -> Dict[str, Any]:
        """تسجيل دفعة مالية"""
        return self._request('POST', '/erp/record-payment', {
            'beneficiaryId': beneficiary_id,
            'amount': amount,
            'method': method,
            'reference': reference
        })

    def get_financial_summary(self, beneficiary_id: str) -> Dict[str, Any]:
        """الحصول على ملخص مالي"""
        return self._request('GET', f'/erp/financial-summary/{beneficiary_id}')

    def send_notification(self, beneficiary_id: str, channel: str,
                         subject: str, message: str) -> Dict[str, Any]:
        """إرسال إشعار"""
        return self._request('POST', '/erp/send-notification', {
            'beneficiaryId': beneficiary_id,
            'channel': channel,
            'subject': subject,
            'message': message
        })

    # معلومات النظام
    def get_capabilities(self) -> Dict[str, Any]:
        """الحصول على قدرات النظام"""
        return self._request('GET', '/capabilities')

    def get_examples(self) -> Dict[str, Any]:
        """الحصول على أمثلة الاستخدام"""
        return self._request('GET', '/examples')


# مثال على الاستخدام
def demo():
    # إنشاء العميل
    client = RehabAGIClient()

    beneficiary_id = 'BEN-001'

    print('🔍 تحليل المستفيد...')
    analysis = client.analyze_beneficiary(beneficiary_id)
    print(f"الحالة: {analysis['data']['overallStatus']}")
    print(f"مستوى المخاطر: {analysis['data']['riskLevel']}")

    print('\n💡 اقتراح البرامج...')
    programs = client.suggest_programs(beneficiary_id)
    for program in programs['data']['recommendedPrograms']:
        print(f"- {program['type']}: {program['reason']}")

    print('\n📈 التنبؤ بالتقدم...')
    prediction = client.predict_progress(beneficiary_id, 6)
    print(f"التحسن المتوقع: {prediction['data']['predictedProgress']['overallImprovement']}%")

    print('\n💰 إنشاء فاتورة...')
    invoice = client.create_invoice(
        beneficiary_id,
        items=[
            {
                'description': 'جلسات علاج طبيعي',
                'quantity': 12,
                'unitPrice': 150,
                'total': 1800
            }
        ],
        total_amount=1800,
        due_date='2026-02-15'
    )
    print(f"الفاتورة: {invoice['data']['invoiceNumber']}")

    print('\n✅ تم بنجاح!')

if __name__ == '__main__':
    demo()
```

---

## 📱 مثال تطبيق Flutter/Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class RehabAGIService {
  final String baseUrl;

  RehabAGIService({this.baseUrl = 'http://localhost:5001/api/rehab-agi'});

  // تحليل مستفيد
  Future<Map<String, dynamic>> analyzeBeneficiary(String beneficiaryId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/beneficiary/analyze'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'beneficiaryId': beneficiaryId}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('فشل تحليل المستفيد');
    }
  }

  // اقتراح برامج
  Future<Map<String, dynamic>> suggestPrograms(String beneficiaryId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/beneficiary/suggest-program'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'beneficiaryId': beneficiaryId}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('فشل اقتراح البرامج');
    }
  }

  // التنبؤ بالتقدم
  Future<Map<String, dynamic>> predictProgress(
    String beneficiaryId,
    int months
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/beneficiary/predict-progress'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'beneficiaryId': beneficiaryId,
        'months': months,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('فشل التنبؤ بالتقدم');
    }
  }
}

// استخدام في Widget
class BeneficiaryAnalysisScreen extends StatefulWidget {
  @override
  _BeneficiaryAnalysisScreenState createState() =>
    _BeneficiaryAnalysisScreenState();
}

class _BeneficiaryAnalysisScreenState extends State<BeneficiaryAnalysisScreen> {
  final RehabAGIService _service = RehabAGIService();
  final TextEditingController _controller = TextEditingController();
  Map<String, dynamic>? _analysis;
  bool _loading = false;

  Future<void> _analyze() async {
    setState(() => _loading = true);

    try {
      final result = await _service.analyzeBeneficiary(_controller.text);
      setState(() {
        _analysis = result['data'];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('خطأ: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('تحليل المستفيد')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                labelText: 'معرف المستفيد',
                hintText: 'BEN-001',
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loading ? null : _analyze,
              child: Text(_loading ? 'جاري التحليل...' : 'تحليل'),
            ),
            if (_analysis != null) ...[
              SizedBox(height: 24),
              Text('الحالة: ${_analysis!['overallStatus']}'),
              Text('المخاطر: ${_analysis!['riskLevel']}'),
              // ... عرض باقي البيانات
            ],
          ],
        ),
      ),
    );
  }
}
```

---

## ⚡ نصائح للأداء الأمثل

### 1. استخدام التخزين المؤقت

```javascript
// مثال: تخزين مؤقت بسيط
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

async function getCachedAnalysis(beneficiaryId) {
  const cacheKey = `analysis_${beneficiaryId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await analyzeBeneficiary(beneficiaryId);
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}
```

### 2. معالجة الأخطاء بشكل احترافي

```typescript
async function safeAnalyze(beneficiaryId: string) {
  try {
    return await analyzeBeneficiary(beneficiaryId);
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('المستفيد غير موجود');
    } else if (error.response?.status === 500) {
      console.error('خطأ في الخادم');
    } else {
      console.error('خطأ غير متوقع:', error);
    }
    throw error;
  }
}
```

### 3. معالجة متوازية للطلبات

```javascript
async function getBeneficiaryFullData(beneficiaryId) {
  // تنفيذ جميع الطلبات بشكل متوازي
  const [analysis, programs, prediction] = await Promise.all([
    analyzeBeneficiary(beneficiaryId),
    suggestPrograms(beneficiaryId),
    predictProgress(beneficiaryId, 6),
  ]);

  return { analysis, programs, prediction };
}
```

---

## 🔍 استكشاف الأخطاء الشائعة

### خطأ: "معرف المستفيد مطلوب"

```json
{
  "success": false,
  "error": "معرف المستفيد مطلوب",
  "timestamp": "2026-01-30T10:30:00.000Z"
}
```

**الحل:** تأكد من إرسال `beneficiaryId` في جسم الطلب.

### خطأ: "عدد الأشهر يجب أن يكون بين 1 و 12"

```json
{
  "success": false,
  "error": "عدد الأشهر يجب أن يكون بين 1 و 12",
  "timestamp": "2026-01-30T10:30:00.000Z"
}
```

**الحل:** تأكد من أن قيمة `months` بين 1 و 12.

---

## 📞 الحصول على المساعدة

للمزيد من الأمثلة والمساعدة:

- 📚 الوثائق الكاملة: [REHAB_AGI_README.md](REHAB_AGI_README.md)
- 🔗 API Reference: `GET /api/rehab-agi/capabilities`
- 💡 أمثلة حية: `GET /api/rehab-agi/examples`

---

_آخر تحديث: 30 يناير 2026_
