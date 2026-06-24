'use strict';

/**
 * Sessions Admin compat surface — توحيد سطح إدارة الجلسات العلاجية
 *
 * يُثبَّت تحت `/api/v1/sessions/admin/*` قبل الـ secure router العام
 * (`/:sessionId`) حتى لا تُبتلع `admin` كـ sessionId.
 *
 * المرحلة الحالية:compat layer يُعيد استخدام `routes/therapy-sessions-admin.routes.js`
 * (الذي يعمل على `TherapySession` — نموذج القراءة/التحليلات W1240). في المرحلة
 * التالية، عند اكتمال projection/sync بين `ClinicalSession` و`TherapySession`،
 * تُستبدل هذه الطبقة بتنفيذ مباشر فوق `ClinicalSession`.
 */

const express = require('express');
const router = express.Router();

const adminRouter = require('../../../routes/therapy-sessions-admin.routes');

// The inner admin router carries its own auth + branch isolation; this wrapper
// only gives it the new unified URL prefix.
router.use(adminRouter);

module.exports = router;
