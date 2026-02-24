const notificationTemplateAuditController = require('../controllers/notificationTemplateAuditController');
// سجل تغييرات القالب
router.get('/:templateId/audit', notificationTemplateAuditController.listByTemplate);
// backend/routes/notificationTemplates.js
const express = require('express');
const router = express.Router();
const notificationTemplateController = require('../controllers/notificationTemplateController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// جميع المسارات تتطلب مصادقة وصلاحية إدارة الإشعارات
router.use(authenticateToken);
router.use(checkPermission('notifications', 'manage'));

router.post('/', notificationTemplateController.create);
router.put('/:id', notificationTemplateController.update);
router.delete('/:id', notificationTemplateController.remove);
router.get('/', notificationTemplateController.list);
router.get('/:id', notificationTemplateController.get);

module.exports = router;
