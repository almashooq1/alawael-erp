'use strict';

/**
 * official-letters.routes.js — issuance registry for certificate letters (W1224).
 *
 * Mount: /api/hr/official-letters + /api/v1/hr/official-letters (self-authed,
 * same pattern as workforce-intelligence W1200).
 *
 *   GET  /verify/:token   PUBLIC — QR verification for banks/authorities.
 *                         Declared BEFORE the auth middleware on purpose.
 *   POST /                issue a letter (atomic ref number; employee subjects
 *                         are snapshotted SERVER-SIDE from the Employee record —
 *                         the client only names the employeeId).
 *   GET  /                issuance log (branch-scoped, paginated).
 *   GET  /:id             single letter detail.
 *   POST /:id/revoke      revoke (reason required; letter stays in the log and
 *                         the public verify endpoint reports REVOKED).
 *
 * Security: no raw request-body spread (W506/W507 doctrine); explicit field
 * picks; branchFilter on the log (W269); verify endpoint returns the minimum
 * a verifier needs (type, ref, date, subject name, status) — no internal ids.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../../middleware/branchScope.middleware');
const safeError = require('../../utils/safeError');
const OfficialLetter = require('../../models/OfficialLetter');
const { LETTER_TYPES } = require('../../models/OfficialLetter');

const WRITE_ROLES = [
  'admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr',
  'hr_officer', 'hr_specialist',
];
const REVOKE_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director'];

// ─── PUBLIC: QR verification ───────────────────────────────────────────────
// Declared BEFORE authenticateToken inside this router AND exported so the
// registry can additionally mount it at /api/(v1/)?public/letter-verify/:token
// — app.js gates the whole /api/v1/hr prefix with `authenticate` (multiple
// `app.use('/api/v1/hr', authenticate, …)` sites), so a public endpoint can
// never be reached under the /hr prefix. The /public mount is the real
// QR-facing URL; the in-router copy stays for completeness.
async function verifyLetterHandler(req, res) {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return res.status(400).json({ success: false, valid: false, message: 'Malformed token' });
    }
    const letter = await OfficialLetter.findOne({ verifyToken: token })
      .select('letterType refNumber status createdAt revokedAt subject.nameAr subject.nameEn')
      .lean();
    if (!letter) {
      return res.status(404).json({ success: false, valid: false, message: 'No such letter' });
    }
    return res.json({
      success: true,
      valid: letter.status === 'issued',
      data: {
        letterType: letter.letterType,
        letterLabelAr: LETTER_TYPES[letter.letterType]?.labelAr ?? letter.letterType,
        refNumber: letter.refNumber,
        status: letter.status,
        issuedAt: letter.createdAt,
        revokedAt: letter.revokedAt,
        subjectNameAr: letter.subject?.nameAr ?? null,
        subjectNameEn: letter.subject?.nameEn ?? null,
      },
    });
  } catch (err) {
    safeError(res, err, 'official-letters:verify');
  }
}

router.get('/verify/:token', verifyLetterHandler);

// ─── Everything below requires auth + branch context ──────────────────────
router.use(authenticateToken);
router.use(requireBranchAccess);

/** POST / — issue a letter. */
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const letterType = String(req.body.letterType || '');
    if (!LETTER_TYPES[letterType]) {
      return res.status(400).json({ success: false, message: 'Invalid letterType' });
    }

    // Subject snapshot — employee letters snapshot from the system of record.
    let subject = null;
    let branchId = null;
    if (letterType === 'employment_certificate' || letterType === 'salary_certificate') {
      const employeeId = String(req.body.employeeId || '');
      if (!mongoose.isValidObjectId(employeeId)) {
        return res.status(400).json({ success: false, message: 'employeeId is required' });
      }
      let Employee;
      try {
        Employee = mongoose.model('Employee');
      } catch {
        return res.status(503).json({ success: false, message: 'Employee model unavailable' });
      }
      const emp = await Employee.findById(employeeId)
        .select('name_ar name_en employee_number job_title_ar job_title_en hire_date branch_id')
        .lean();
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
      subject = {
        kind: 'employee',
        refId: emp._id,
        nameAr: emp.name_ar,
        nameEn: emp.name_en ?? null,
        number: emp.employee_number ?? null,
        jobTitle: emp.job_title_ar ?? emp.job_title_en ?? null,
        hireDate: emp.hire_date ?? null,
      };
      branchId = emp.branch_id ?? null;
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported letterType' });
    }

    // Salary letters carry an explicit HR-entered breakdown (no compensation
    // source of record exists) — validated, never spread from req.body.
    let payload = null;
    if (letterType === 'salary_certificate') {
      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      };
      const salary = req.body.salary || {};
      payload = {
        salary: {
          basic: num(salary.basic),
          housing: num(salary.housing),
          transport: num(salary.transport),
          other: num(salary.other),
        },
      };
      payload.salary.total =
        payload.salary.basic + payload.salary.housing + payload.salary.transport + payload.salary.other;
      if (payload.salary.basic <= 0) {
        return res.status(400).json({ success: false, message: 'salary.basic must be > 0' });
      }
    }

    const letter = await OfficialLetter.issue({
      letterType,
      subject,
      addressee: req.body.addressee ? String(req.body.addressee).slice(0, 300) : null,
      payload,
      issuer: {
        userId: req.user._id || req.user.id || req.user.userId,
        name: req.user.fullName || req.user.name || req.user.email || null,
      },
      branchId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: letter._id,
        refNumber: letter.refNumber,
        verifyToken: letter.verifyToken,
        issuedAt: letter.createdAt,
      },
    });
  } catch (err) {
    safeError(res, err, 'official-letters:issue');
  }
});

/** GET / — issuance log (branch-scoped, newest first). */
router.get('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = { ...branchFilter(req) };
    if (req.query.letterType && LETTER_TYPES[String(req.query.letterType)]) {
      filter.letterType = String(req.query.letterType);
    }
    if (req.query.status === 'issued' || req.query.status === 'revoked') {
      filter.status = req.query.status;
    }
    const [rows, total] = await Promise.all([
      OfficialLetter.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-payload')
        .lean(),
      OfficialLetter.countDocuments(filter),
    ]);
    res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (err) {
    safeError(res, err, 'official-letters:list');
  }
});

/** GET /:id — letter detail (includes payload for re-print). */
router.get('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const letter = await OfficialLetter.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!letter) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: letter });
  } catch (err) {
    safeError(res, err, 'official-letters:detail');
  }
});

/** POST /:id/revoke — revoke an issued letter (reason required). */
router.post('/:id/revoke', requireRole(REVOKE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ success: false, message: 'reason (≥5 chars) is required' });
    }
    const letter = await OfficialLetter.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!letter) return res.status(404).json({ success: false, message: 'Not found' });
    if (letter.status === 'revoked') {
      return res.status(409).json({ success: false, message: 'Already revoked' });
    }
    letter.status = 'revoked';
    letter.revokedAt = new Date();
    letter.revokedBy = req.user._id || req.user.id || req.user.userId;
    letter.revokeReason = reason;
    await letter.save();
    res.json({ success: true, data: { id: letter._id, status: letter.status } });
  } catch (err) {
    safeError(res, err, 'official-letters:revoke');
  }
});

module.exports = router;
module.exports.verifyLetterHandler = verifyLetterHandler;
