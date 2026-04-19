# Pull Request Template

## 📋 Description | الوصف

<!-- Provide a brief description of your changes | قدم وصفًا موجزًا للتغييرات -->

### Type of Change | نوع التغيير

- [ ] 🐛 Bug fix | إصلاح خطأ
- [ ] ✨ New feature | ميزة جديدة
- [ ] 🔨 Refactoring | إعادة هيكلة
- [ ] 📝 Documentation | توثيق
- [ ] 🎨 UI/UX | واجهة المستخدم
- [ ] ⚡ Performance | تحسين الأداء
- [ ] 🔒 Security | أمان
- [ ] 🧪 Tests | اختبارات

## 🎯 Related Issue | المشكلة المرتبطة

<!-- Link to the issue this PR addresses | رابط المشكلة التي يعالجها هذا PR -->

Closes #(issue number)

## 🔍 Changes Made | التغييرات المنفذة

<!-- List the specific changes you made | اذكر التغييرات المحددة التي قمت بها -->

-
-
-

## 📸 Screenshots | لقطات الشاشة

<!-- If applicable, add screenshots to help explain your changes | إن أمكن، أضف لقطات شاشة لتوضيح التغييرات -->

## ✅ Checklist | قائمة التحقق

### Code Quality | جودة الكود

- [ ] My code follows the project's style guidelines | يتبع الكود إرشادات نمط
      المشروع
- [ ] I have performed a self-review of my code | قمت بمراجعة الكود بنفسي
- [ ] I have commented my code, particularly in hard-to-understand areas | أضفت
      تعليقات على الكود، خاصة في المناطق الصعبة
- [ ] My changes generate no new warnings or errors | لا تولد تغييراتي تحذيرات
      أو أخطاء جديدة

### Testing | الاختبارات

- [ ] I have added tests that prove my fix is effective or that my feature works
      | أضفت اختبارات تثبت فعالية الإصلاح أو عمل الميزة
- [ ] New and existing unit tests pass locally with my changes | تمر الاختبارات
      الجديدة والموجودة بنجاح محليًا
- [ ] **Sprint gate is green:** `npm run test:sprint` from the repo root (or
      `cd backend && npm run test:sprint`) passes all 519 tests | بوابة
      السبرنت ناجحة
- [ ] **Ship-check is green** (if touching ops/gov-integration code):
      `npm run ship-check` runs preflight + ops-subsystems in ~2 min | فحص
      الجاهزية ناجح
- [ ] I have tested this on multiple browsers/devices (if applicable) | اختبرت
      على متصفحات/أجهزة متعددة (إن أمكن)

### Documentation | التوثيق

- [ ] I have updated the documentation accordingly | قمت بتحديث التوثيق وفقًا
      لذلك
- [ ] I have updated the CHANGELOG.md | قمت بتحديث ملف التغييرات
- [ ] I have added JSDoc/comments for new functions | أضفت تعليقات للدوال
      الجديدة

### Security | الأمان

- [ ] My changes don't introduce security vulnerabilities | لا تُدخل تغييراتي
      ثغرات أمنية
- [ ] I have checked for sensitive data exposure | تحققت من عدم كشف بيانات حساسة
- [ ] Environment variables are properly configured | متغيرات البيئة مضبوطة بشكل
      صحيح

## 🚀 Deployment Notes | ملاحظات النشر

<!-- Add any deployment-specific notes | أضف أي ملاحظات خاصة بالنشر -->

- [ ] Requires database migration | يتطلب ترحيل قاعدة بيانات
- [ ] Requires environment variable changes | يتطلب تغييرات في متغيرات البيئة
- [ ] Requires dependency updates | يتطلب تحديث التبعيات

## 📝 Additional Notes | ملاحظات إضافية

<!-- Any additional information | أي معلومات إضافية -->

---

**Reviewer Guidelines | إرشادات المراجع:**

- Check code quality and adherence to standards | تحقق من جودة الكود والالتزام
  بالمعايير
- Verify tests pass and coverage is adequate | تحقق من نجاح الاختبارات وكفاية
  التغطية
- Review security implications | راجع التأثيرات الأمنية
- Test functionality manually if needed | اختبر الوظائف يدويًا إذا لزم الأمر
