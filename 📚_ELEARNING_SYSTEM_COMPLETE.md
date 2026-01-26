# 📚 نظام التعلم المؤسسي - E-Learning Management System

## 🎯 نظرة عامة - Overview

نظام تعليمي إلكتروني شامل مع **دعم كامل لذوي الإعاقة** يوفر:

✅ دورات تدريبية إلكترونية متكاملة  
✅ اختبارات الكفاءة التفاعلية  
✅ شهادات إكمال معتمدة  
✅ مكتبة وسائط متعددة  
✅ تتبع التقدم والإحصائيات  
✅ دعم كامل لإمكانية الوصول (Accessibility)

---

## 📁 هيكل الملفات - File Structure

```
erp_new_system/
├── backend/
│   ├── models/
│   │   └── ELearning.js          # 6 MongoDB Schemas
│   └── routes/
│       └── elearning.js          # 40+ API Endpoints
└── frontend/
    └── src/
        └── components/
            └── ELearning/
                └── ELearningDashboard.jsx    # Main Component
```

---

## 🗄️ قاعدة البيانات - Database Models

### 1. **Course** - الدورة التدريبية

```javascript
{
  title: String,                    // عنوان الدورة
  description: String,              // الوصف
  instructor: ObjectId (User),      // المدرب
  category: Enum,                   // التصنيف
  level: Enum,                      // المستوى (beginner/intermediate/advanced)
  duration: { hours, minutes },     // المدة

  // دعم إمكانية الوصول
  accessibility: {
    hasSubtitles: Boolean,          // ترجمات
    hasSignLanguage: Boolean,       // لغة الإشارة
    hasAudioDescription: Boolean,   // وصف صوتي
    hasScreenReaderSupport: Boolean, // قارئ الشاشة
    hasHighContrast: Boolean        // تباين عالي
  },

  thumbnail: String,
  isPremium: Boolean,
  isPublished: Boolean,
  enrollmentCount: Number,
  rating: { average, count },
  lessons: [ObjectId (Lesson)],
  certificateTemplate: ObjectId
}
```

### 2. **Lesson** - الدرس

```javascript
{
  course: ObjectId,
  title: String,
  description: String,
  order: Number,
  type: Enum, // video/text/quiz/interactive/document/audio

  content: {
    videoUrl: String,
    textContent: String,
    audioUrl: String,
    documentUrl: String
  },

  // مواد دعم ذوي الإعاقة
  accessibilityMaterials: {
    subtitlesUrl: String,           // ملف الترجمة
    signLanguageVideoUrl: String,   // فيديو لغة الإشارة
    audioDescriptionUrl: String,    // الوصف الصوتي
    transcriptUrl: String,          // النص المكتوب
    brailleDocUrl: String           // مستند برايل
  },

  duration: { minutes },
  resources: [{ title, url, type }],
  quiz: ObjectId,
  isPreview: Boolean
}
```

### 3. **Quiz** - الاختبار

```javascript
{
  course: ObjectId,
  lesson: ObjectId,
  title: String,
  type: Enum, // practice/assessment/final
  duration: { minutes },
  passingScore: Number,
  maxAttempts: Number,

  questions: [{
    question: String,
    type: Enum, // multiple-choice/true-false/short-answer/essay/matching
    options: [{ text, isCorrect }],
    correctAnswer: String,
    points: Number,
    explanation: String,
    audioUrl: String,  // سؤال صوتي
    imageUrl: String,
    imageAlt: String   // نص بديل للصورة
  }],

  settings: {
    shuffleQuestions: Boolean,
    showCorrectAnswers: Boolean,
    allowReview: Boolean
  }
}
```

### 4. **Enrollment** - التسجيل

```javascript
{
  user: ObjectId,
  course: ObjectId,
  status: Enum, // enrolled/in-progress/completed/dropped

  progress: {
    completedLessons: [{ lesson, completedAt }],
    percentage: Number
  },

  quizResults: [{
    quiz: ObjectId,
    attempts: [{
      score: Number,
      percentage: Number,
      answers: [{ question, answer, isCorrect }],
      completedAt: Date
    }],
    bestScore: Number,
    passed: Boolean
  }],

  certificate: {
    issued: Boolean,
    issuedAt: Date,
    certificateId: String
  },

  rating: { stars, review, ratedAt },
  enrolledAt: Date,
  completedAt: Date
}
```

### 5. **Certificate** - الشهادة

```javascript
{
  certificateId: String (Unique),
  user: ObjectId,
  course: ObjectId,
  enrollment: ObjectId,
  issuedAt: Date,
  expiresAt: Date,
  grade: Enum, // A+/A/B+/B/C+/C/Pass
  score: Number,
  verificationCode: String (Unique),
  pdfUrl: String,
  metadata: {
    instructorName: String,
    courseDuration: Number,
    completionDate: Date
  }
}
```

### 6. **MediaLibrary** - مكتبة الوسائط

```javascript
{
  title: String,
  description: String,
  type: Enum, // video/audio/document/image/presentation/interactive
  fileUrl: String,
  fileSize: Number,
  duration: Number,
  thumbnail: String,
  category: Enum,

  // مميزات إمكانية الوصول
  accessibilityFeatures: {
    hasSubtitles: Boolean,
    hasTranscript: Boolean,
    hasAudioDescription: Boolean,
    hasSignLanguage: Boolean,
    isAccessible: Boolean
  },

  tags: [String],
  relatedCourses: [ObjectId],
  uploadedBy: ObjectId,
  isPublic: Boolean,
  views: Number,
  downloads: Number
}
```

---

## 🔌 API Endpoints (40+)

### 📚 Courses API

| Method | Endpoint                             | Description                   |
| ------ | ------------------------------------ | ----------------------------- |
| GET    | `/api/elearning/courses`             | قائمة الدورات (مع فلترة وبحث) |
| GET    | `/api/elearning/courses/:id`         | تفاصيل دورة                   |
| POST   | `/api/elearning/courses`             | إنشاء دورة                    |
| PUT    | `/api/elearning/courses/:id`         | تحديث دورة                    |
| DELETE | `/api/elearning/courses/:id`         | حذف دورة                      |
| POST   | `/api/elearning/courses/:id/rate`    | تقييم دورة                    |
| GET    | `/api/elearning/courses/:id/reviews` | تقييمات الدورة                |

### 📖 Lessons API

| Method | Endpoint                                   | Description |
| ------ | ------------------------------------------ | ----------- |
| GET    | `/api/elearning/courses/:courseId/lessons` | دروس الدورة |
| POST   | `/api/elearning/courses/:courseId/lessons` | إضافة درس   |
| PUT    | `/api/elearning/lessons/:id`               | تحديث درس   |
| DELETE | `/api/elearning/lessons/:id`               | حذف درس     |

### 🎓 Enrollment API

| Method | Endpoint                                                        | Description    |
| ------ | --------------------------------------------------------------- | -------------- |
| POST   | `/api/elearning/enroll/:courseId`                               | تسجيل في دورة  |
| GET    | `/api/elearning/my-courses`                                     | دوراتي         |
| GET    | `/api/elearning/enrollment/:courseId`                           | تفاصيل التسجيل |
| POST   | `/api/elearning/enrollment/:courseId/complete-lesson/:lessonId` | إكمال درس      |

### ✏️ Quiz API

| Method | Endpoint                                | Description   |
| ------ | --------------------------------------- | ------------- |
| GET    | `/api/elearning/quiz/:quizId`           | تفاصيل اختبار |
| POST   | `/api/elearning/quiz/:quizId/submit`    | تقديم اختبار  |
| POST   | `/api/elearning/courses/:courseId/quiz` | إنشاء اختبار  |

### 🏆 Certificates API

| Method | Endpoint                                              | Description     |
| ------ | ----------------------------------------------------- | --------------- |
| POST   | `/api/elearning/certificate/issue/:enrollmentId`      | إصدار شهادة     |
| GET    | `/api/elearning/certificate/:certificateId`           | عرض شهادة       |
| GET    | `/api/elearning/certificate/verify/:verificationCode` | التحقق من شهادة |
| GET    | `/api/elearning/my-certificates`                      | شهاداتي         |

### 🎬 Media Library API

| Method | Endpoint                            | Description   |
| ------ | ----------------------------------- | ------------- |
| GET    | `/api/elearning/media`              | قائمة الوسائط |
| POST   | `/api/elearning/media`              | رفع وسيط      |
| GET    | `/api/elearning/media/:id`          | تفاصيل وسيط   |
| POST   | `/api/elearning/media/:id/download` | تحميل وسيط    |

### 📊 Statistics API

| Method | Endpoint                            | Description       |
| ------ | ----------------------------------- | ----------------- |
| GET    | `/api/elearning/stats/overview`     | إحصائيات النظام   |
| GET    | `/api/elearning/stats/user/:userId` | إحصائيات المستخدم |

---

## 🚀 التثبيت والتشغيل - Installation

### 1. Backend Setup

```bash
cd erp_new_system/backend

# تثبيت الاعتماديات
npm install mongoose express

# إضافة Route إلى server.js
```

**في `server.js`:**

```javascript
const elearningRoutes = require('./routes/elearning');
app.use('/api/elearning', elearningRoutes);
```

### 2. Frontend Setup

```bash
cd erp_new_system/frontend

# تثبيت الاعتماديات
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material axios

# إضافة Route
```

**في `App.js`:**

```javascript
import ELearningDashboard from './components/ELearning/ELearningDashboard';

// في Routes:
<Route path="/elearning" element={<ELearningDashboard />} />;
```

### 3. إنشاء بيانات تجريبية

```javascript
// في Backend Terminal:
node seeds/createSampleELearningData.js
```

---

## 💻 أمثلة الاستخدام - Usage Examples

### مثال 1: إنشاء دورة جديدة

```javascript
POST /api/elearning/courses
Content-Type: application/json

{
  "title": "تأهيل ذوي الإعاقة الحركية",
  "description": "دورة شاملة للتأهيل المهني لذوي الإعاقة الحركية",
  "instructor": "USER_ID",
  "category": "rehabilitation",
  "level": "beginner",
  "duration": {
    "hours": 20,
    "minutes": 0
  },
  "accessibility": {
    "hasSubtitles": true,
    "hasSignLanguage": true,
    "hasAudioDescription": true,
    "hasScreenReaderSupport": true,
    "hasHighContrast": true
  },
  "isPublished": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "تم إنشاء الدورة بنجاح",
  "data": {
    "_id": "COURSE_ID",
    "title": "تأهيل ذوي الإعاقة الحركية",
    "enrollmentCount": 0,
    "rating": { "average": 0, "count": 0 }
  }
}
```

### مثال 2: إضافة درس فيديو مع دعم إمكانية الوصول

```javascript
POST /api/elearning/courses/COURSE_ID/lessons
Content-Type: application/json

{
  "title": "مقدمة في التأهيل المهني",
  "description": "نظرة عامة على أهمية التأهيل المهني",
  "order": 1,
  "type": "video",
  "content": {
    "videoUrl": "https://cdn.example.com/videos/lesson1.mp4"
  },
  "accessibilityMaterials": {
    "subtitlesUrl": "https://cdn.example.com/subtitles/lesson1-ar.vtt",
    "signLanguageVideoUrl": "https://cdn.example.com/sign-language/lesson1.mp4",
    "audioDescriptionUrl": "https://cdn.example.com/audio-desc/lesson1.mp3",
    "transcriptUrl": "https://cdn.example.com/transcripts/lesson1.pdf"
  },
  "duration": { "minutes": 15 },
  "isPreview": true
}
```

### مثال 3: إنشاء اختبار

```javascript
POST /api/elearning/courses/COURSE_ID/quiz
Content-Type: application/json

{
  "title": "اختبار الوحدة الأولى",
  "type": "assessment",
  "duration": { "minutes": 30 },
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "ما هي أهمية التأهيل المهني لذوي الإعاقة؟",
      "type": "multiple-choice",
      "options": [
        { "text": "زيادة فرص العمل", "isCorrect": true },
        { "text": "توفير المال", "isCorrect": false },
        { "text": "الترفيه فقط", "isCorrect": false }
      ],
      "points": 10,
      "explanation": "التأهيل المهني يزيد فرص العمل ويعزز الاستقلالية",
      "audioUrl": "https://cdn.example.com/audio/q1.mp3"
    },
    {
      "question": "التأهيل المهني مهم للجميع",
      "type": "true-false",
      "correctAnswer": "true",
      "points": 5
    }
  ],
  "settings": {
    "shuffleQuestions": true,
    "showCorrectAnswers": true,
    "allowReview": true
  }
}
```

### مثال 4: تسجيل في دورة

```javascript
POST /api/elearning/enroll/COURSE_ID
Content-Type: application/json

{
  "userId": "USER_ID"
}
```

**Response:**

```json
{
  "success": true,
  "message": "تم التسجيل بنجاح",
  "data": {
    "_id": "ENROLLMENT_ID",
    "user": "USER_ID",
    "course": "COURSE_ID",
    "status": "enrolled",
    "progress": {
      "completedLessons": [],
      "percentage": 0
    }
  }
}
```

### مثال 5: تقديم اختبار

```javascript
POST /api/elearning/quiz/QUIZ_ID/submit
Content-Type: application/json

{
  "userId": "USER_ID",
  "answers": [
    "زيادة فرص العمل",  // إجابة السؤال 1
    "true"               // إجابة السؤال 2
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "مبروك! لقد نجحت في الاختبار",
  "data": {
    "score": 15,
    "totalPoints": 15,
    "percentage": 100,
    "passed": true,
    "passingScore": 70,
    "answers": [
      {
        "question": "ما هي أهمية التأهيل المهني لذوي الإعاقة؟",
        "answer": "زيادة فرص العمل",
        "isCorrect": true
      },
      {
        "question": "التأهيل المهني مهم للجميع",
        "answer": "true",
        "isCorrect": true
      }
    ]
  }
}
```

### مثال 6: إصدار شهادة

```javascript
POST /api/elearning/certificate/issue/ENROLLMENT_ID
Content-Type: application/json

{
  "grade": "A",
  "score": 95,
  "instructorName": "د. أحمد محمد",
  "courseDuration": 20
}
```

**Response:**

```json
{
  "success": true,
  "message": "تم إصدار الشهادة بنجاح",
  "data": {
    "certificateId": "CERT-1704067200000-ABC123XYZ",
    "verificationCode": "VER123ABC456DEF",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "grade": "A",
    "score": 95
  }
}
```

### مثال 7: البحث والفلترة

```javascript
GET /api/elearning/courses?search=تأهيل&category=rehabilitation&level=beginner&page=1&limit=12
```

**Response:**

```json
{
  "success": true,
  "data": {
    "courses": [...],
    "pagination": {
      "total": 25,
      "page": 1,
      "pages": 3,
      "limit": 12
    }
  }
}
```

---

## ♿ دعم إمكانية الوصول - Accessibility Features

### 1. **الترجمات (Subtitles)**

- دعم ملفات VTT/SRT
- تنسيقات متعددة
- ترجمات بلغات مختلفة

### 2. **لغة الإشارة (Sign Language)**

- فيديوهات مصاحبة بلغة الإشارة
- تشغيل متزامن مع المحتوى الأساسي

### 3. **الوصف الصوتي (Audio Description)**

- وصف صوتي للمحتوى المرئي
- مناسب للمكفوفين وضعاف البصر

### 4. **قارئ الشاشة (Screen Reader)**

- نصوص بديلة لجميع الصور
- تسميات ARIA واضحة
- هيكلة HTML سليمة

### 5. **التباين العالي (High Contrast)**

- وضع التباين العالي
- ألوان واضحة للنصوص

### 6. **لوحة المفاتيح (Keyboard Navigation)**

- دعم كامل للتنقل بلوحة المفاتيح
- اختصارات سريعة

---

## 📊 الإحصائيات والتقارير - Analytics

### إحصائيات النظام

```javascript
GET / api / elearning / stats / overview;
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCourses": 150,
      "publishedCourses": 120,
      "totalEnrollments": 5420,
      "activeEnrollments": 3200,
      "totalCertificates": 1850,
      "totalMedia": 450
    },
    "topCourses": [
      {
        "_id": "COURSE_ID",
        "title": "تأهيل ذوي الإعاقة",
        "rating": { "average": 4.8, "count": 120 },
        "enrollmentCount": 450
      }
    ]
  }
}
```

### إحصائيات المستخدم

```javascript
GET / api / elearning / stats / user / USER_ID;
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalCourses": 12,
    "completedCourses": 8,
    "inProgressCourses": 4,
    "averageProgress": 75,
    "certificatesEarned": 8,
    "totalQuizzesTaken": 24
  }
}
```

---

## 🎨 Frontend Components

### ELearningDashboard Component

**المميزات:**

- 4 تبويبات: جميع الدورات | دوراتي | مكتبة الوسائط | شهاداتي
- بحث وفلترة متقدمة
- بطاقات تفاعلية للدورات
- مؤشرات التقدم
- تقييمات ومراجعات
- دعم كامل للتصميم المتجاوب (Responsive)

**الاستخدام:**

```jsx
import ELearningDashboard from './components/ELearning/ELearningDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/elearning" element={<ELearningDashboard />} />
      </Routes>
    </Router>
  );
}
```

---

## 🔒 الأمان - Security

### 1. Authentication & Authorization

- JWT tokens للمصادقة
- Role-based access control (RBAC)
- Middleware للتحقق من الصلاحيات

### 2. Data Validation

- Mongoose validation
- Input sanitization
- XSS protection

### 3. Rate Limiting

- حماية من الهجمات
- حد أقصى للمحاولات

---

## 🧪 الاختبار - Testing

### 1. اختبار الدورات

```bash
# تسجيل في دورة
POST http://localhost:3001/api/elearning/enroll/COURSE_ID
Body: { "userId": "USER_ID" }

# عرض دوراتي
GET http://localhost:3001/api/elearning/my-courses?userId=USER_ID
```

### 2. اختبار الاختبارات

```bash
# جلب اختبار
GET http://localhost:3001/api/elearning/quiz/QUIZ_ID

# تقديم اختبار
POST http://localhost:3001/api/elearning/quiz/QUIZ_ID/submit
Body: {
  "userId": "USER_ID",
  "answers": ["answer1", "answer2"]
}
```

### 3. اختبار الشهادات

```bash
# إصدار شهادة
POST http://localhost:3001/api/elearning/certificate/issue/ENROLLMENT_ID

# التحقق من شهادة
GET http://localhost:3001/api/elearning/certificate/verify/VERIFICATION_CODE
```

---

## 📈 خارطة الطريق - Roadmap

### Phase 1: ✅ Complete

- ✅ Database Models (6 schemas)
- ✅ Backend API (40+ endpoints)
- ✅ Frontend Dashboard
- ✅ دعم إمكانية الوصول الكامل

### Phase 2: 🚧 In Progress

- [ ] مولد الشهادات PDF
- [ ] نظام الإشعارات
- [ ] تكامل البريد الإلكتروني
- [ ] نظام المناقشات

### Phase 3: 📅 Planned

- [ ] تطبيق الموبايل
- [ ] Live Streaming للدروس
- [ ] نظام التقارير المتقدم
- [ ] AI-powered recommendations

---

## 🆘 الدعم - Support

### الأسئلة الشائعة

**س: كيف أضيف دورة جديدة؟**  
ج: استخدم `POST /api/elearning/courses` مع بيانات الدورة.

**س: كيف أدعم لغة الإشارة؟**  
ج: أضف `signLanguageVideoUrl` في `accessibilityMaterials` للدرس.

**س: كيف يحصل الطالب على الشهادة؟**  
ج: بعد إكمال 100% من الدورة، استخدم
`POST /api/elearning/certificate/issue/ENROLLMENT_ID`.

**س: هل يمكن إعادة الاختبار؟**  
ج: نعم، حتى `maxAttempts` المحددة في الاختبار.

---

## 📝 الملاحظات الختامية

### المميزات الرئيسية:

✅ **نظام متكامل** - 6 models + 40+ endpoints + Frontend  
✅ **دعم كامل لذوي الإعاقة** - ترجمات، لغة إشارة، وصف صوتي  
✅ **مرن وقابل للتوسع** - يمكن إضافة مميزات جديدة بسهولة  
✅ **إحصائيات شاملة** - تتبع التقدم والأداء  
✅ **واجهة مستخدم حديثة** - Material-UI responsive design

### الملفات المنشأة:

1. `erp_new_system/backend/models/ELearning.js` (6 Schemas)
2. `erp_new_system/backend/routes/elearning.js` (40+ Endpoints)
3. `erp_new_system/frontend/src/components/ELearning/ELearningDashboard.jsx`
4. هذا الملف التوثيقي

---

## 🚀 بدء الاستخدام - Getting Started

```bash
# 1. تشغيل Backend
cd erp_new_system/backend
npm start

# 2. تشغيل Frontend
cd erp_new_system/frontend
npm start

# 3. افتح المتصفح
http://localhost:3002/elearning
```

---

**تم بحمد الله ✅**

**نظام التعلم المؤسسي جاهز للاستخدام!**

المطور: GitHub Copilot  
التاريخ: 23 يناير 2026  
الإصدار: 1.0.0
