---
mode: agent
description: تصميم وحدة التواصل مع أولياء الأمور والأسرة
---

================================================================
READ FIRST — inherits doctrine (light-touch seed; expand later)
================================================================

This prompt is a SEED for the Family Engagement Hub. Until expanded to a full
agent prompt, it inherits doctrine from:

- `.github/prompts/00-platform-master.prompt.md` — governing doctrine
- `.github/prompts/01-beneficiary-360-master.prompt.md` — family-portal view scoping + consent
- `.github/prompts/03-goals-care-plan-engine.prompt.md` — family signature + family-safe plan summaries (PlanReviewAck pattern)
- `.github/prompts/04-programs-sessions-progress-engine.prompt.md` — home program + carryover communications

Key existing models: `backend/models/Guardian.js`, `backend/models/Consent.js`, `backend/models/ParentMessage.js`, `backend/models/ParentPortal.js`, `backend/models/PlanReviewAck.js`, `backend/models/HomeAssignment.js`.

Apply 00-platform-master's PDPL guidance + the standard closing block (Key design decisions / Assumptions / Risks / Next step).

أنت خبير في تجربة الأسرة داخل الأنظمة العلاجية والتأهيلية.

المهمة:
صمّم Family Engagement Hub مرتبطة بالنواة الموحدة.

المطلوب:

- سجل كامل للمكالمات والرسائل والاجتماعات.
- ربط التواصل بالخطة والأهداف والواجبات المنزلية.
- متابعة موافقات ولي الأمر.
- إظهار التنبيهات التي تتطلب متابعة أسرية.
- إنشاء tasks للأخصائيين بناءً على رسائل الأسرة.
- اقتراح واجهة خاصة بالأسرة أو بوابة متابعة.

أعطني:

- الكيانات الأساسية.
- الشاشات.
- workflows.
- notifications.
- security and privacy considerations.
