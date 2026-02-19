const AuditLog = require('../models/AuditLog');

// تسجيل حدث في السجل
async function logAction({ user, action, entity, entityId, details }) {
  try {
    await AuditLog.create({
      user: user?._id || user,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    // يمكن تسجيل الخطأ في ملف لوج أو تجاهله
    console.error('AuditLog error:', err);
  }
}

module.exports = { logAction };
