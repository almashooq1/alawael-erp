# دليل منصة التعليم الإلكتروني (E-Learning Platform Guide)

## نظرة عامة (Overview)

منصة التعليم الإلكتروني (LMS) هي نظام متكامل لإدارة وتوزيع المحتوى التعليمي، اختبار الطلاب، وتتبع تقدمهم. تم تطويرها كجزء من المرحلة الخامسة (Phase 5).

---

## الميزات الرئيسية (Key Features)

1. **إدارة الدورات (Course Management):**
   - تصفح الدورات المتاحة حسب الفئات (Development, Therapy, etc.).
   - إنشاء دورات جديدة (العنوان، الوصف، الفئة).
   - إضافة دروس ومحتوى تعليمي لكل دورة.

2. **تسجيل الطلاب (Student Enrollment):**
   - يمكن للمستخدمين التسجيل في الدورات بضغطة زر.
   - متابعة الدورات المسجلة في تبويب "My Learning".

3. **تتبع التقدم (Progress Tracking):**
   - شريط تقدم يوضح نسبة إكمال الدورة (0-100%).
   - تحديث تلقائي للتقدم عند إكمال الدروس.

---

## دليل الاستخدام (User Guide)

### 1. الوصول للمنصة

- انتقل إلى القائمة الجانبية واختر "منصة التعليم" (E-Learning).
- ستظهر لوحة التحكم الرئيسية "E-Learning Platform".

### 2. تصفح الدورات (Browse Courses)

- في تبويب "Browse Courses"، ستجد جميع الدورات المتاحة.
- اضغط "View Details" لعرض محتوى الدورة.
- اضغط "Enroll" للتسجيل في الدورة.

### 3. متابعة التعلم (My Learning)

- انتقل إلى تبويب "My Learning".
- ستجد قائمة بالدورات التي سجلت فيها مع نسبة التقدم.
- اضغط "Resume" أو "Continue Learning" للدخول إلى مشغل الدورة.

---

## المرجع التقني (Technical Reference)

### Backend Architecture

- **Service:** `backend/services/eLearningService.js`
  - المنطق الأساسي لإدارة الدورات، الدروس، والتسجيل.
  - يدعم وضع `Mock` للاختبار.
- **Routes:** `backend/routes/eLearning.routes.js`
  - `/api/lms/courses` (GET, POST)
  - `/api/lms/courses/:id/enroll` (POST)
  - `/api/lms/my-courses` (GET)
- **Models:**
  - `Course`: تفاصيل الدورة.
  - `Lesson`: محتوى الدروس.
  - `Enrollment`: ربط الطالب بالدورة وتخزين التقدم.

### Frontend Architecture

- **Service:** `frontend/src/services/eLearning.service.js`
  - يتواصل مع `/api/lms`.
- **Pages:**
  - `ELearningDashboard.js`: اللوحة الرئيسية (تصفح الدورات + دوراتي).
  - `CourseViewer.js`: عرض محتوى الدورة (قيد التحديث لربطه بالتقدم).

### Testing

- **Unit Tests:** `backend/tests/elearning.test.js`
  - يغطي إنشاء الدورات، إضافة الدروس، التسجيل، وإكمال الدروس.

---

## الخطوات القادمة

- إضافة نظام الاختبارات (Quizzes) بشكل كامل.
- إصدار شهادات عند إكمال الدورة بنسبة 100%.
