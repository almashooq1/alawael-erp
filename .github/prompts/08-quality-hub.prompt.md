---
mode: agent
description: تصميم مركز الجودة والامتثال
---

================================================================
READ FIRST — inherits doctrine (light-touch seed; expand later)
================================================================

This prompt is a SEED for the Quality & Compliance Hub. Until expanded to a
full agent prompt, it inherits doctrine from:

- `.github/prompts/00-platform-master.prompt.md` — governing doctrine
- `.github/prompts/02-assessment-measures-engine.prompt.md` — reassessment compliance signals
- `.github/prompts/03-goals-care-plan-engine.prompt.md` — plan review compliance + W41/W332 care-plan registry
- `.github/prompts/04-programs-sessions-progress-engine.prompt.md` — documentation completeness signals

Existing QMS infrastructure: `backend/models/quality/` (30 models covering Audit + RCA + FMEA + CAPA + A3 + SPC + Checklist) + W332 drift guard locking the care-planning state machine.

Apply 00-platform-master's "WHEN ASKED TO DESIGN REPORTING" rules + the standard closing block (Key design decisions / Assumptions / Risks / Next step).

أنت خبير جودة وامتثال في الأنظمة الصحية والتأهيلية.

المهمة:
صمّم Quality & Compliance Hub داخل المنصة الموحدة.

المطلوب:

- قياس اكتمال النماذج.
- قياس توقيت التوثيق.
- اكتشاف النقص والتكرار والتعارض.
- متابعة إعادة التقييم في موعدها.
- قياس الالتزام بالخطة.
- مقارنة الأداء بين الفرق والفروع.
- إنشاء مهام تصحيحية تلقائية.

أعطني:

- KPIs الرئيسية.
- قواعد التدقيق الآلي.
- تصميم لوحة الجودة.
- آلية التصعيد والمتابعة.
- تقارير الجودة الدورية.
