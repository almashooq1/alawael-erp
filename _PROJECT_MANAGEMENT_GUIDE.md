# دليل نظام إدارة المشاريع (Project Management System Guide)

## نظرة عامة (Overview)

تم تطوير نظام إدارة المشاريع كجزء من المرحلة الرابعة (Phase 4) لتوفير أداة فعالة لتتبع المهام والمشاريع داخل نظام alawael-erp. يعتمد النظام على منهجية "كانبان" (Kanban) لتمثيل سير العمل بشكل مرئي.

---

## الميزات الرئيسية (Key Features)

1. **إدارة المشاريع (Project Management):**
   - إنشاء مشاريع جديدة.
   - عرض قائمة المشاريع النشطة.
   - حذف المشاريع (مع الحذف التلقائي للمهام المرتبطة بها).
   - تعيين مدير لكل مشروع.

2. **إدارة المهام (Task Management):**
   - إضافة مهام داخل كل مشروع.
   - تحديد تفاصيل المهمة (العنوان، الوصف، المسؤول، الأولوية، الموعد النهائي).
   - تتبع حالة المهمة عبر أعمدة "كانبان" (To Do, In Progress, Review, Done).
   - نقل المهام بين الحالات المختلفة بسهولة.

3. **لوحة التحكم التفاعلية (Interactive Dashboard):**
   - واجهة مستخدم حديثة وسهلة الاستخدام.
   - عرض المهام في أعمدة ملونة حسب الحالة.
   - إمكانية التبديل بين المشاريع المختلفة.

---

## دليل الاستخدام (User Guide)

### 1. الوصول للنظام

- انتقل إلى القائمة الجانبية واختر "إدارة المشاريع" (Project Management).
- ستظهر اللوحة الرئيسية للمشروع الافتراضي أو الأول.

### 2. إنشاء مشروع جديد

- اضغط على زر "مشروع جديد" (+ Project) في الأعلى.
- أدخل اسم المشروع واسم المدير والوصف.
- اضغط "حفظ".

### 3. إضافة مهمة

- اختر المشروع المطلوب من القائمة المنسدلة.
- اضغط على زر "مهمة جديدة" (+ Task).
- أدخل عنوان المهمة، الوصف، وحدد حالتها الافتراضية (عادة To Do).
- اضغط "حفظ".

### 4. تحديث حالة المهمة

- في لوحة الـ Kanban، ستظهر المهام في الأعمدة المخصصة.
- (في هذا الإصدار) يتم تحديث الحالة عبر تحرير المهمة أو أزرار النقل (Move) المتوفرة في بطاقة المهمة.

---

## المرجع التقني (Technical Reference)

### Backend Architecture

- **Service:** `backend/services/projectManagementService.js`
  - Handles logic for Projects and Tasks.
  - Implements cascading delete (Deleting a project removes its tasks).
- **Routes:** `backend/routes/projectManagement.routes.js`
  - `/api/pm/projects` (GET, POST, DELETE)
  - `/api/pm/tasks` (POST)
  - `/api/pm/projects/:projectId/tasks` (GET)
  - `/api/pm/tasks/:taskId/status` (PATCH)
- **Database Models:**
  - `Project`: Stores project metadata.
  - `Task`: Stores task details and references `Project`.

### Frontend Architecture

- **Service:** `frontend/src/services/projectManagement.service.js`
  - Centralized API calls using Axios.
- **Component:** `frontend/src/pages/ProjectManagementDashboard.js`
  - React functional component using Material UI.
  - Manages state for `projects`, `tasks`, and UI dialogs.

### Testing

- **Unit Tests:** `backend/tests/project_management.test.js`
  - Verifies Service methods (`createProject`, `createTask`, `updateTaskStatus`).
  - Uses Jest mocks for Mongoose models to ensure isolation.

---

## خطوات التطوير القادمة (Next Steps)

- إضافة خاصية "السحب والإفلات" (Drag and Drop) للمهام.
- إضافة نظام التعليقات على المهام.
- ربط المهام بالمستخدمين الفعليين في النظام وإرسال إشعارات.
