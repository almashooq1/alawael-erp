---
mode: agent
description: تصميم محرك التقارير الذكية والدورية
---

================================================================
READ FIRST — inherits doctrine (light-touch seed; expand later)
================================================================

This prompt is a SEED for the Reporting Engine. Reports aggregate the entire
platform; this prompt inherits ALL upstream master prompts:

- `.github/prompts/00-platform-master.prompt.md` — governing doctrine + "WHEN ASKED TO DESIGN REPORTING" rules
- `.github/prompts/01-beneficiary-360-master.prompt.md` — beneficiary report families + reporting traceability
- `.github/prompts/02-assessment-measures-engine.prompt.md` — assessment-driven reports + outcome dashboards
- `.github/prompts/03-goals-care-plan-engine.prompt.md` — plan summary reports + family-safe approved plan summaries
- `.github/prompts/04-programs-sessions-progress-engine.prompt.md` — service delivery reports + supervisory dashboards

Every report MUST trace back to structured source data (no narrative-only reports). Use the report families listed in upstream prompts; do not invent new families without rationale.

Apply the standard closing block (Key design decisions / Assumptions / Risks / Next step).

أنت خبير تقارير تنفيذية وسريرية لمنصات الرعاية والتأهيل.

المهمة:
صمّم Reporting Engine موحداً للمنصة.

المطلوب:

- تقارير يومية وأسبوعية وشهرية وربع سنوية ونصف سنوية وسنوية.
- تقارير للمستفيد، الأخصائي، البرنامج، الفرع، والإدارة العليا.
- تقارير تشغيلية، سريرية، جودة، ونتائج.
- دعم Narrative Summaries الذكية.
- دعم الرسوم البيانية والمؤشرات المقارنة.
- دعم التصدير وجدولة الإرسال.

أعطني:

- أنواع التقارير.
- data sources.
- aggregation logic.
- scheduling model.
- access control.
- report templates.
