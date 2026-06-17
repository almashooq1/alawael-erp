# Production Secrets Cutover — Print Pack (W1406)

**Purpose:** War-room printable pack for production cutover execution.  
**Includes:** One-page English + one-page Arabic.  
**Date:** [DD]/[MM]/[YYYY]

---

## Page 1 — English (One-Page)

**Window:** [HH:MM] → [HH:MM] (Asia/Riyadh)  
**Ticket/CAB:** [fill]  
**Owner:** [fill]

### 1) GO / NO-GO precheck (all must be ✅)

- [ ] Managed secret source reachable
- [ ] 5 strict keys present: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`
- [ ] Runtime identity has read-only access (least privilege)
- [ ] Previous key versions available for rollback
- [ ] No plaintext secrets in CI/deploy logs

**Precheck Decision:** ☐ GO ☐ NO-GO  
**By:** [fill] **Time:** [HH:MM]

### 2) Execution

- [ ] Freeze config changes — [HH:MM]
- [ ] Bind deployment to managed secret source — [HH:MM]
- [ ] Run `npm run env:check` (prod-like context) — [HH:MM]
- [ ] Deploy/restart services — [HH:MM]
- [ ] Health checks green (API/frontend/db/redis) — [HH:MM]
- [ ] Auth sanity OK (issue/refresh) — [HH:MM]
- [ ] Protected read endpoint OK — [HH:MM]

### 3) Rollback triggers (any = rollback)

- [ ] `env:check` fails
- [ ] Startup strict-env validation fails
- [ ] Auth signing/encryption mismatch
- [ ] Critical health check fails post-deploy

### 4) Rollback actions

- [ ] Rebind previous known-good secret versions
- [ ] Redeploy services
- [ ] Re-run `npm run env:check`
- [ ] Re-validate health + auth sanity

**Rollback executed:** ☐ Yes ☐ No  
**By:** [fill] **Time:** [HH:MM]

### 5) Final decision

- [ ] All 5 strict keys resolved from managed source
- [ ] `env:check` passed
- [ ] Startup healthy
- [ ] Auth sanity passed
- [ ] Evidence attached

**Final Decision:** ☐ GO ☐ NO-GO  
**Approver:** [fill] **Signature:** [fill] **Time:** [HH:MM]

### 6) Evidence refs

- Secret source snapshot (masked): [fill]
- `env:check` output: [fill]
- Health outputs: [fill]
- Auth sanity output: [fill]
- Incident/notes: [fill]

<!-- pagebreak -->

---

## Page 2 — العربية (صفحة واحدة)

**النافذة:** [HH:MM] → [HH:MM] (Asia/Riyadh)  
**مرجع التذكرة/CAB:** [fill]  
**المالك:** [fill]

### 1) فحص GO / NO-GO (كلها يجب أن تكون ✅)

- [ ] مصدر الأسرار المُدار متاح
- [ ] المفاتيح الصارمة الخمسة موجودة: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`
- [ ] هوية التشغيل لديها صلاحية قراءة فقط (Least Privilege)
- [ ] إصدار سابق من المفاتيح متاح للرجوع
- [ ] لا توجد أسرار بنص صريح في سجلات CI/النشر

**قرار الفحص المسبق:** ☐ GO ☐ NO-GO  
**بواسطة:** [fill] **الوقت:** [HH:MM]

### 2) التنفيذ

- [ ] تجميد تغييرات الإعدادات — [HH:MM]
- [ ] ربط النشر بمصدر الأسرار المُدار — [HH:MM]
- [ ] تشغيل `npm run env:check` في سياق مماثل للإنتاج — [HH:MM]
- [ ] نشر/إعادة تشغيل الخدمات — [HH:MM]
- [ ] نجاح فحوصات الصحة (API/frontend/db/redis) — [HH:MM]
- [ ] نجاح فحص المصادقة (issue/refresh) — [HH:MM]
- [ ] نجاح قراءة endpoint محمي واحد — [HH:MM]

### 3) محفزات الرجوع (أي بند = Rollback)

- [ ] فشل `env:check`
- [ ] فشل startup بسبب strict env validation
- [ ] خلل في توقيع/تشفير المصادقة
- [ ] فشل health check حرج بعد النشر

### 4) إجراءات الرجوع

- [ ] إعادة ربط الإصدارات السابقة المعروفة من الأسرار
- [ ] إعادة نشر الخدمات
- [ ] إعادة تشغيل `npm run env:check`
- [ ] إعادة التحقق من الصحة + المصادقة

**تم تنفيذ الرجوع:** ☐ نعم ☐ لا  
**بواسطة:** [fill] **الوقت:** [HH:MM]

### 5) القرار النهائي

- [ ] تم حل المفاتيح الصارمة الخمسة من مصدر مُدار
- [ ] `env:check` ناجح
- [ ] startup صحي
- [ ] فحص المصادقة ناجح
- [ ] تم إرفاق الأدلة

**القرار النهائي:** ☐ GO ☐ NO-GO  
**المعتمد:** [fill] **التوقيع:** [fill] **الوقت:** [HH:MM]

### 6) مراجع الأدلة

- لقطة مصدر الأسرار (masked): [fill]
- مخرجات `env:check`: [fill]
- مخرجات health: [fill]
- مخرجات فحص المصادقة: [fill]
- الحوادث/الملاحظات: [fill]

---

## Related detailed docs

- `docs/runbooks/production-secrets-cutover-checklist-w1406.md`
- `docs/runbooks/production-secrets-cutover-runsheet-w1406.md`
- `docs/runbooks/production-secrets-cutover-runsheet-w1406-onepage.md`
- `docs/runbooks/production-secrets-cutover-runsheet-w1406-onepage-ar.md`
