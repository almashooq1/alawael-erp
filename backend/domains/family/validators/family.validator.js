/**
 * Family Validator — التحقق من صحة بيانات التواصل الأسري
 *
 * @module domains/family/validators/family.validator
 */

'use strict';

const VALID_RELATIONSHIPS = [
  'father',
  'mother',
  'brother',
  'sister',
  'grandfather',
  'grandmother',
  'uncle',
  'aunt',
  'guardian',
  'other',
];

const VALID_COMMUNICATION_TYPES = [
  'phone',
  'in-person',
  'email',
  'whatsapp',
  'sms',
  'video',
  'letter',
  'other',
];

const VALID_HOMEWORK_STATUSES = ['pending', 'completed', 'partial', 'missed'];

// ─── Validators ──────────────────────────────────────────────────────────────

function validateAddFamilyMember(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('اسم فرد الأسرة (name) مطلوب');
  }

  if (!body.relationship || typeof body.relationship !== 'string' || !body.relationship.trim()) {
    errors.push('صلة القرابة (relationship) مطلوبة');
  }

  if (body.relationship && !VALID_RELATIONSHIPS.includes(body.relationship)) {
    errors.push(`صلة القرابة غير صالحة. المقبول: ${VALID_RELATIONSHIPS.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateFamilyMember(body) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }

  if (body.relationship && !VALID_RELATIONSHIPS.includes(body.relationship)) {
    errors.push(`صلة القرابة غير صالحة. المقبول: ${VALID_RELATIONSHIPS.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateLogCommunication(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  if (!body.type || typeof body.type !== 'string' || !body.type.trim()) {
    errors.push('نوع التواصل (type) مطلوب');
  }

  if (body.type && !VALID_COMMUNICATION_TYPES.includes(body.type)) {
    errors.push(`نوع التواصل غير صالح. المقبول: ${VALID_COMMUNICATION_TYPES.join(', ')}`);
  }

  const hasSummary = body.summary && typeof body.summary === 'string' && body.summary.trim();
  const hasNotes = body.notes && typeof body.notes === 'string' && body.notes.trim();
  const hasContent = body.content && typeof body.content === 'string' && body.content.trim();

  if (!hasSummary && !hasNotes && !hasContent) {
    errors.push('يجب توفير summary أو notes أو content لتسجيل التواصل');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateAssignHomework(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  const hasTask = body.task && typeof body.task === 'string' && body.task.trim();
  const hasDescription =
    body.description && typeof body.description === 'string' && body.description.trim();
  const hasTitle = body.title && typeof body.title === 'string' && body.title.trim();

  if (!hasTask && !hasDescription && !hasTitle) {
    errors.push('يجب توفير task أو description أو title للواجب المنزلي');
  }

  if (!body.dueDate) {
    errors.push('تاريخ الاستحقاق (dueDate) مطلوب');
  } else if (isNaN(Date.parse(body.dueDate))) {
    errors.push('dueDate تاريخ غير صالح');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateHomeworkStatus(body) {
  const errors = [];

  if (!body.status || typeof body.status !== 'string' || !body.status.trim()) {
    errors.push('حالة الواجب (status) مطلوبة');
  }

  if (body.status && !VALID_HOMEWORK_STATUSES.includes(body.status)) {
    errors.push(`حالة الواجب غير صالحة. المقبول: ${VALID_HOMEWORK_STATUSES.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return next();
  };
}

module.exports = {
  validateAddFamilyMember,
  validateUpdateFamilyMember,
  validateLogCommunication,
  validateAssignHomework,
  validateUpdateHomeworkStatus,
  validate,
  VALID_RELATIONSHIPS,
  VALID_COMMUNICATION_TYPES,
  VALID_HOMEWORK_STATUSES,
};
