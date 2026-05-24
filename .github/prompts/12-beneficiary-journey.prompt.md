---
mode: agent
description: تصميم رحلة المستفيد بشكل موحد ومتكامل
---

================================================================
READ FIRST — inherits doctrine (light-touch seed; expand later)
================================================================

This prompt is a SEED for the Beneficiary Journey end-to-end map (Referral →
Discharge). Inherits:

- `.github/prompts/00-platform-master.prompt.md` — governing doctrine
- `.github/prompts/01-beneficiary-360-master.prompt.md` — the beneficiary record IS the journey's anchor; 01- already covers identity → admission → episodes → assessments → plans → sessions → reports → discharge phases
- `.github/prompts/02-assessment-measures-engine.prompt.md` — intake + reassessment + discharge measures
- `.github/prompts/03-goals-care-plan-engine.prompt.md` — plan-driven journey states
- `.github/prompts/04-programs-sessions-progress-engine.prompt.md` — session-driven journey execution

This prompt was previously slot 02-; renumbered to 12- to free 02- for the new agent-mode Assessment & Measures Engine. Its scope OVERLAPS with 01-beneficiary-360-master's "CORE SECTIONS OF THE MASTER FILE" and "RECORD LIFECYCLE STATES" — when in doubt, prefer 01- as the more recent canonical statement.

Apply the standard closing block (Key design decisions / Assumptions / Risks / Next step).

أنت خبير في تصميم رحلات المستفيد داخل منصات التأهيل والرعاية متعددة التخصصات.

المهمة:
صمّم Beneficiary Journey موحدة تبدأ من الإحالة وحتى الإغلاق أو الاستمرار.

يشمل ذلك:

- Referral
- Intake
- Triage
- Initial Assessment
- Multidisciplinary Review
- Care Plan Approval
- Individual and Group Sessions
- Reassessment
- Family Engagement
- Tele-Rehab / AR-VR
- Outcome Review
- Discharge / Continuation

المطلوب في الرد:

- رسم المراحل الرئيسية للرحلة.
- تحديد القرارات في كل مرحلة.
- تحديد المسؤولين.
- تحديد المدخلات والمخرجات.
- تحديد التنبيهات الآلية.
- تحديد البيانات التي يجب أن تُلتقط مرة واحدة وتُعاد الاستفادة منها في كامل الرحلة.
- اقتراح واجهات أو شاشات لكل مرحلة.

اجعل الرحلة مرتبطة بملف مستفيد واحد وحلقة علاجية موحدة ومحرك Workflow ذكي.
