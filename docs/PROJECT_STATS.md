# إحصاءات المشروع (Backend) — مُولّدة آلياً

> **لا تُحرّر الكتلة أدناه يدوياً.** تُولَّد آلياً من بنية `backend/` عبر
> `npm run stats:write ../docs/PROJECT_STATS.md` (من مجلد `backend`).
> بوّابة CI (`.github/workflows/stats-drift.yml`) تُشغّل `stats:check` وتفشل
> عند انجراف الأرقام عن الواقع — فأي إضافة/حذف نموذج أو مسار أو خدمة يجب أن
> يُصاحبها تحديث هذه الكتلة. الكتلة تحوي العدّادات ذات-دلالة-الانجراف فقط
> (ملفات/معمارية/اختبارات/اعتماديات) دون `jsLines` المتقلّب ولا الطابع الزمني.

<!-- PROJECT-STATS:START (auto-generated — run `npm run stats:write <file>`) -->

| Metric                   | Count |
| ------------------------ | ----- |
| JavaScript files         | 6429  |
| JSON files               | 163   |
| Markdown files           | 36    |
| Models                   | 577   |
| Routes                   | 586   |
| Controllers              | 23    |
| Middleware               | 42    |
| Services                 | 315   |
| Validators               | 1     |
| Migrations               | 0     |
| Tests (unit/integration) | 1643  |
| Tests (e2e)              | 0     |
| Dependencies (prod)      | 47    |
| Dependencies (dev)       | 9     |

<!-- PROJECT-STATS:END -->
