# 📈 قوالب التقارير والتصميمات

# Report Templates and Designs

---

## 🎨 قوالب التقارير (12 قالب احترافي)

### 1️⃣ قالب التقرير الطبي الشامل

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8" />
    <title>التقرير الطبي الشامل</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Arial', 'Tahoma', sans-serif;
        direction: rtl;
        background: #ffffff;
        color: #333;
        line-height: 1.6;
      }

      .report-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: white;
      }

      /* Header Section */
      .report-header {
        border-bottom: 4px solid #1f4788;
        padding-bottom: 20px;
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-logo {
        width: 100px;
        height: auto;
      }

      .header-info {
        text-align: center;
        flex-grow: 1;
      }

      .header-info h1 {
        color: #1f4788;
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .header-info h2 {
        color: #2e5090;
        font-size: 20px;
        font-weight: normal;
      }

      .header-qr {
        width: 80px;
        height: 80px;
      }

      /* Report Info Box */
      .report-info-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 30px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .report-info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
      }

      .info-item {
        text-align: center;
      }

      .info-label {
        font-size: 12px;
        opacity: 0.9;
        margin-bottom: 5px;
      }

      .info-value {
        font-size: 16px;
        font-weight: bold;
      }

      /* Section Styling */
      .report-section {
        margin-bottom: 40px;
        page-break-inside: avoid;
      }

      .section-title {
        background: #2e5090;
        color: white;
        padding: 12px 20px;
        font-size: 20px;
        font-weight: bold;
        border-radius: 5px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
      }

      .section-title::before {
        content: '●';
        margin-left: 10px;
        font-size: 24px;
      }

      /* Beneficiary Profile Card */
      .beneficiary-card {
        background: #f8f9fa;
        border: 2px solid #dee2e6;
        border-radius: 10px;
        padding: 25px;
        margin-bottom: 30px;
      }

      .profile-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }

      .profile-item {
        display: flex;
        align-items: flex-start;
      }

      .profile-label {
        font-weight: bold;
        color: #495057;
        min-width: 120px;
      }

      .profile-value {
        color: #212529;
      }

      /* Assessment Table */
      .assessment-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .assessment-table thead {
        background: linear-gradient(135deg, #1f4788 0%, #2e5090 100%);
        color: white;
      }

      .assessment-table th {
        padding: 15px;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
      }

      .assessment-table td {
        padding: 12px;
        border: 1px solid #dee2e6;
        text-align: center;
      }

      .assessment-table tbody tr:nth-child(even) {
        background: #f8f9fa;
      }

      .assessment-table tbody tr:hover {
        background: #e9ecef;
      }

      /* Score Badge */
      .score-badge {
        display: inline-block;
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 14px;
      }

      .score-high {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }

      .score-medium {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }

      .score-low {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }

      /* Progress Chart Container */
      .chart-container {
        background: white;
        border: 2px solid #dee2e6;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 30px;
        text-align: center;
      }

      .chart-title {
        font-size: 18px;
        font-weight: bold;
        color: #2e5090;
        margin-bottom: 15px;
      }

      .chart-image {
        max-width: 100%;
        height: auto;
      }

      /* Progress Indicator */
      .progress-container {
        margin-bottom: 20px;
      }

      .progress-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .progress-bar-wrapper {
        background: #e9ecef;
        height: 30px;
        border-radius: 15px;
        overflow: hidden;
        position: relative;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        transition: width 0.3s ease;
      }

      /* Recommendations Box */
      .recommendations-box {
        background: #fff3cd;
        border-right: 4px solid #ffc107;
        padding: 20px;
        border-radius: 5px;
        margin-bottom: 20px;
      }

      .recommendations-title {
        font-size: 18px;
        font-weight: bold;
        color: #856404;
        margin-bottom: 15px;
      }

      .recommendations-list {
        list-style: none;
        padding-right: 0;
      }

      .recommendations-list li {
        padding: 8px 0;
        padding-right: 25px;
        position: relative;
      }

      .recommendations-list li::before {
        content: '✓';
        position: absolute;
        right: 0;
        color: #28a745;
        font-weight: bold;
      }

      /* Goals Table */
      .goals-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .goals-table th {
        background: #28a745;
        color: white;
        padding: 12px;
        text-align: center;
      }

      .goals-table td {
        padding: 10px;
        border: 1px solid #dee2e6;
        text-align: center;
      }

      .goal-status {
        padding: 5px 10px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 12px;
      }

      .status-achieved {
        background: #d4edda;
        color: #155724;
      }

      .status-in-progress {
        background: #d1ecf1;
        color: #0c5460;
      }

      .status-pending {
        background: #f8d7da;
        color: #721c24;
      }

      /* Signature Section */
      .signature-section {
        margin-top: 50px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
      }

      .signature-box {
        text-align: center;
        border-top: 2px solid #333;
        padding-top: 15px;
      }

      .signature-title {
        font-weight: bold;
        color: #495057;
        margin-bottom: 5px;
      }

      .signature-name {
        color: #6c757d;
        font-size: 14px;
      }

      /* Footer */
      .report-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #dee2e6;
        text-align: center;
        color: #6c757d;
        font-size: 12px;
      }

      /* Print Styles */
      @media print {
        body {
          background: white;
        }

        .report-container {
          padding: 0;
        }

        .report-section {
          page-break-inside: avoid;
        }

        .no-print {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="report-container">
      <!-- Header -->
      <div class="report-header">
        <img src="logo.png" alt="الشعار" class="header-logo" />
        <div class="header-info">
          <h1>مركز التأهيل المتخصص</h1>
          <h2>التقرير الطبي الشامل</h2>
        </div>
        <img src="qr-code.png" alt="رمز QR" class="header-qr" />
      </div>

      <!-- Report Info Box -->
      <div class="report-info-box">
        <div class="report-info-grid">
          <div class="info-item">
            <div class="info-label">رقم التقرير</div>
            <div class="info-value">RPT-2026-001</div>
          </div>
          <div class="info-item">
            <div class="info-label">تاريخ التقرير</div>
            <div class="info-value">14 يناير 2026</div>
          </div>
          <div class="info-item">
            <div class="info-label">نوع التقرير</div>
            <div class="info-value">تقييم شامل</div>
          </div>
        </div>
      </div>

      <!-- Beneficiary Profile -->
      <div class="report-section">
        <div class="section-title">معلومات المستفيد</div>
        <div class="beneficiary-card">
          <div class="profile-grid">
            <div class="profile-item">
              <span class="profile-label">الاسم الكامل:</span>
              <span class="profile-value">{{ beneficiary_name }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">رقم الهوية:</span>
              <span class="profile-value">{{ national_id }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">العمر:</span>
              <span class="profile-value">{{ age }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">الجنس:</span>
              <span class="profile-value">{{ gender }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">التشخيص:</span>
              <span class="profile-value">{{ diagnosis }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">تاريخ التسجيل:</span>
              <span class="profile-value">{{ enrollment_date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Assessment Results -->
      <div class="report-section">
        <div class="section-title">نتائج التقييمات</div>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>اسم التقييم</th>
              <th>التاريخ</th>
              <th>الدرجة</th>
              <th>المئوية</th>
              <th>التصنيف</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>PEDI-CAT</td>
              <td>2026-01-10</td>
              <td>65</td>
              <td>55%</td>
              <td><span class="score-badge score-medium">متوسط</span></td>
            </tr>
            <tr>
              <td>GMFM-88</td>
              <td>2026-01-10</td>
              <td>78</td>
              <td>70%</td>
              <td><span class="score-badge score-high">جيد</span></td>
            </tr>
            <tr>
              <td>CARS</td>
              <td>2026-01-11</td>
              <td>35</td>
              <td>40%</td>
              <td><span class="score-badge score-low">منخفض</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Progress Analysis -->
      <div class="report-section">
        <div class="section-title">تحليل التقدم المحرز</div>

        <div class="progress-container">
          <div class="progress-label">
            <span>المهارات الحركية</span>
            <span>75%</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" style="width: 75%;">75%</div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-label">
            <span>المهارات المعرفية</span>
            <span>65%</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" style="width: 65%;">65%</div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-label">
            <span>المهارات التواصلية</span>
            <span>80%</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" style="width: 80%;">80%</div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-label">
            <span>المهارات الاجتماعية</span>
            <span>70%</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" style="width: 70%;">70%</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="report-section">
        <div class="section-title">الرسوم البيانية</div>

        <div class="chart-container">
          <div class="chart-title">التقدم عبر الزمن</div>
          <img src="chart-progress.png" alt="رسم بياني" class="chart-image" />
        </div>

        <div class="chart-container">
          <div class="chart-title">مقارنة المجالات</div>
          <img src="chart-domains.png" alt="رسم بياني" class="chart-image" />
        </div>
      </div>

      <!-- Goals Achievement -->
      <div class="report-section">
        <div class="section-title">تحقيق الأهداف</div>
        <table class="goals-table">
          <thead>
            <tr>
              <th>الهدف</th>
              <th>المجال</th>
              <th>تاريخ البدء</th>
              <th>الموعد المتوقع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>تحسين المهارات الحركية الدقيقة</td>
              <td>حركي</td>
              <td>2025-12-01</td>
              <td>2026-03-01</td>
              <td><span class="goal-status status-in-progress">قيد التنفيذ</span></td>
            </tr>
            <tr>
              <td>تطوير مهارات التواصل اللفظي</td>
              <td>تواصل</td>
              <td>2025-11-15</td>
              <td>2026-02-15</td>
              <td><span class="goal-status status-achieved">مُحقق</span></td>
            </tr>
            <tr>
              <td>زيادة الاستقلالية في الأنشطة اليومية</td>
              <td>حياة يومية</td>
              <td>2026-01-01</td>
              <td>2026-04-01</td>
              <td><span class="goal-status status-pending">معلق</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Recommendations -->
      <div class="report-section">
        <div class="section-title">التوصيات</div>
        <div class="recommendations-box">
          <div class="recommendations-title">التوصيات العلاجية</div>
          <ul class="recommendations-list">
            <li>زيادة كثافة جلسات العلاج الطبيعي إلى 3 مرات أسبوعياً</li>
            <li>دمج الأسرة في الأنشطة العلاجية المنزلية</li>
            <li>استخدام الأجهزة المساعدة لتحسين الحركة</li>
            <li>تقييم شامل للمهارات المعرفية بعد 3 أشهر</li>
            <li>إضافة جلسات علاج وظيفي لتحسين المهارات الحياتية</li>
          </ul>
        </div>
      </div>

      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">المعالج الرئيسي</div>
          <div class="signature-name">د. محمد أحمد</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">مدير الحالة</div>
          <div class="signature-name">أ. فاطمة علي</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">مدير المركز</div>
          <div class="signature-name">د. سارة محمود</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="report-footer">
        <p>هذا التقرير سري ومخصص للاستخدام الطبي فقط</p>
        <p>مركز التأهيل المتخصص | هاتف: 966XXXXXXXXX+ | البريد الإلكتروني: info@rehab-center.sa</p>
      </div>
    </div>
  </body>
</html>
```

---

### 2️⃣ قالب تقرير الأسرة المبسط

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8" />
    <title>تقرير الأسرة</title>
    <style>
      body {
        font-family: 'Arial', 'Tahoma', sans-serif;
        direction: rtl;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #333;
        padding: 20px;
      }

      .family-report {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }

      .report-hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        text-align: center;
      }

      .report-hero h1 {
        font-size: 36px;
        margin-bottom: 10px;
      }

      .report-hero p {
        font-size: 18px;
        opacity: 0.9;
      }

      .report-content {
        padding: 40px;
      }

      .achievement-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 30px;
        border-radius: 15px;
        margin-bottom: 30px;
        text-align: center;
      }

      .achievement-icon {
        font-size: 60px;
        margin-bottom: 15px;
      }

      .achievement-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .achievement-description {
        font-size: 16px;
        opacity: 0.9;
      }

      .progress-section {
        margin-bottom: 40px;
      }

      .progress-title {
        font-size: 20px;
        font-weight: bold;
        color: #667eea;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
      }

      .progress-title::before {
        content: '🎯';
        margin-left: 10px;
        font-size: 24px;
      }

      .skill-item {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 15px;
      }

      .skill-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .skill-name {
        font-weight: bold;
        color: #495057;
      }

      .skill-percentage {
        font-weight: bold;
        color: #667eea;
        font-size: 18px;
      }

      .skill-bar {
        background: #e9ecef;
        height: 20px;
        border-radius: 10px;
        overflow: hidden;
      }

      .skill-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        transition: width 0.5s ease;
      }

      .tips-box {
        background: #fff3cd;
        border-right: 5px solid #ffc107;
        padding: 25px;
        border-radius: 10px;
        margin-top: 30px;
      }

      .tips-title {
        font-size: 20px;
        font-weight: bold;
        color: #856404;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
      }

      .tips-title::before {
        content: '💡';
        margin-left: 10px;
        font-size: 24px;
      }

      .tips-list {
        list-style: none;
        padding: 0;
      }

      .tips-list li {
        padding: 10px 0;
        padding-right: 30px;
        position: relative;
        color: #856404;
      }

      .tips-list li::before {
        content: '✓';
        position: absolute;
        right: 0;
        color: #28a745;
        font-weight: bold;
        font-size: 20px;
      }

      .celebration {
        text-align: center;
        padding: 30px;
        background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        border-radius: 15px;
        margin-top: 30px;
      }

      .celebration-icon {
        font-size: 80px;
        margin-bottom: 15px;
      }

      .celebration-text {
        font-size: 24px;
        font-weight: bold;
        color: #155724;
      }
    </style>
  </head>
  <body>
    <div class="family-report">
      <div class="report-hero">
        <h1>🌟 تقرير التقدم الأسري</h1>
        <p>رحلة نجاح طفلك معنا</p>
      </div>

      <div class="report-content">
        <div class="achievement-card">
          <div class="achievement-icon">🏆</div>
          <div class="achievement-title">إنجاز رائع!</div>
          <div class="achievement-description">حقق طفلك تقدماً ملحوظاً بنسبة 85% في المهارات المستهدفة هذا الشهر</div>
        </div>

        <div class="progress-section">
          <div class="progress-title">التقدم في المهارات</div>

          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">المهارات الحركية</span>
              <span class="skill-percentage">85%</span>
            </div>
            <div class="skill-bar">
              <div class="skill-fill" style="width: 85%;"></div>
            </div>
          </div>

          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">مهارات التواصل</span>
              <span class="skill-percentage">75%</span>
            </div>
            <div class="skill-bar">
              <div class="skill-fill" style="width: 75%;"></div>
            </div>
          </div>

          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">الاستقلالية الذاتية</span>
              <span class="skill-percentage">90%</span>
            </div>
            <div class="skill-bar">
              <div class="skill-fill" style="width: 90%;"></div>
            </div>
          </div>

          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">المهارات الاجتماعية</span>
              <span class="skill-percentage">70%</span>
            </div>
            <div class="skill-bar">
              <div class="skill-fill" style="width: 70%;"></div>
            </div>
          </div>
        </div>

        <div class="tips-box">
          <div class="tips-title">نصائح للمنزل</div>
          <ul class="tips-list">
            <li>مارسوا الأنشطة الحركية معاً لمدة 20 دقيقة يومياً</li>
            <li>شجعوا طفلكم على التعبير عن احتياجاته بالكلمات</li>
            <li>امنحوه الوقت لإنجاز المهام بنفسه دون تدخل فوري</li>
            <li>احتفلوا بالإنجازات الصغيرة لتعزيز الثقة</li>
            <li>حافظوا على روتين يومي منتظم</li>
          </ul>
        </div>

        <div class="celebration">
          <div class="celebration-icon">🎉</div>
          <div class="celebration-text">أحسنتم! استمروا في العمل الرائع</div>
        </div>
      </div>
    </div>
  </body>
</html>
```

---

### 3️⃣ قالب التقرير الإحصائي

```python
# قالب التقرير الإحصائي بصيغة JSON
STATISTICAL_REPORT_TEMPLATE = {
    "report_metadata": {
        "title": "التقرير الإحصائي الشهري",
        "period": "{{ period }}",
        "generated_date": "{{ date }}",
        "generated_by": "{{ user }}"
    },

    "summary_statistics": {
        "total_beneficiaries": "{{ total }}",
        "active_cases": "{{ active }}",
        "new_enrollments": "{{ new }}",
        "discharged": "{{ discharged }}",
        "retention_rate": "{{ retention }}%"
    },

    "demographic_breakdown": {
        "by_age": {
            "0-3": "{{ age_0_3 }}",
            "4-6": "{{ age_4_6 }}",
            "7-12": "{{ age_7_12 }}",
            "13-18": "{{ age_13_18 }}",
            "19+": "{{ age_19_plus }}"
        },
        "by_disability": {
            "physical": "{{ physical }}",
            "intellectual": "{{ intellectual }}",
            "sensory": "{{ sensory }}",
            "autism": "{{ autism }}",
            "multiple": "{{ multiple }}"
        }
    },

    "service_utilization": {
        "total_sessions": "{{ sessions }}",
        "attendance_rate": "{{ attendance }}%",
        "no_show_rate": "{{ no_show }}%",
        "cancellation_rate": "{{ cancellation }}%"
    },

    "clinical_outcomes": {
        "overall_improvement": "{{ improvement }}%",
        "goal_achievement": "{{ goals }}%",
        "satisfaction_score": "{{ satisfaction }}/5"
    },

    "charts": [
        {
            "type": "bar",
            "title": "التوزيع العمري",
            "data": "{{ age_chart_data }}"
        },
        {
            "type": "pie",
            "title": "أنواع الإعاقة",
            "data": "{{ disability_chart_data }}"
        },
        {
            "type": "line",
            "title": "معدل التحسن الشهري",
            "data": "{{ improvement_chart_data }}"
        }
    ]
}
```

---

## 🎯 نظام تخصيص القوالب

```python
class ReportTemplateEngine:
    """محرك قوالب التقارير"""

    def __init__(self):
        self.templates = self._load_templates()
        self.jinja_env = self._setup_jinja()

    def _setup_jinja(self):
        """إعداد محرك Jinja2"""
        from jinja2 import Environment, FileSystemLoader, select_autoescape

        env = Environment(
            loader=FileSystemLoader('templates/reports'),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )

        # إضافة فلاتر مخصصة
        env.filters['format_date'] = self._format_arabic_date
        env.filters['format_number'] = self._format_arabic_number
        env.filters['score_badge'] = self._create_score_badge

        return env

    def render_template(self, template_name, context_data):
        """عرض القالب مع البيانات"""
        template = self.jinja_env.get_template(f'{template_name}.html')
        return template.render(**context_data)

    def _format_arabic_date(self, date_obj):
        """تنسيق التاريخ بالعربية"""
        months = {
            1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
            5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
            9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
        }
        return f'{date_obj.day} {months[date_obj.month]} {date_obj.year}'

    def _format_arabic_number(self, number):
        """تنسيق الأرقام بالعربية"""
        arabic_digits = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
        return str(number).translate(arabic_digits)

    def _create_score_badge(self, score):
        """إنشاء شارة الدرجة"""
        if score >= 70:
            return f'<span class="score-badge score-high">{score}</span>'
        elif score >= 50:
            return f'<span class="score-badge score-medium">{score}</span>'
        else:
            return f'<span class="score-badge score-low">{score}</span>'
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ قوالب تقارير احترافية جاهزة
