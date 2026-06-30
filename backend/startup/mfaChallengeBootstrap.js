'use strict';

/**
 * mfaChallengeBootstrap.js — Wave 277 Pass 6 (final) of app.js refactor.
 *
 * Extracted verbatim from app.js (~61 LOC) into a single bootstrap
 * function. NO behaviour change — same service construction, same
 * default sessionUpdater fallback, same `/api/v1/mfa` mount, same
 * `app._mfaChallengeService` + `app._mfaSessionUpdater` references.
 *
 * Step-up MFA Challenge (Wave 36) operationalises Constitution §12.
 * The Wave-31 decide() returns STEP_UP_MFA_REQUIRED when actor.mfaLevel
 * < required tier — this router is the surface clients call to actually
 * obtain the higher tier:
 *
 *   POST /api/v1/mfa/challenge        → create challenge
 *   POST /api/v1/mfa/:id/verify       → submit OTP
 *   GET  /api/v1/mfa/:id              → status
 *
 * ── Ordering invariant ─────────────────────────────────────────
 *
 * `wireMfaChallenge` MUST run BEFORE any downstream bootstrap that
 * reads `app._mfaChallengeService` (notably W277 Pass 5 —
 * beneficiaryLifecycleBootstrap, which mounts loadMfaActor middleware
 * only when the service is wired). Don't reorder the call sites in
 * app.js.
 *
 * `mfaSettingsModel` is optional — when absent (test/dev), the service
 * falls back to a closed-fail verifier and tests inject their own.
 * `sessionUpdater` is a no-op-logging default; production wires this
 * to the real session store (express-session / JWT refresh / Redis)
 * by overriding `app._mfaSessionUpdater` BEFORE this bootstrap runs.
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireMfaChallenge(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('mfaChallengeBootstrap.wireMfaChallenge: app + logger required');
  }

  try {
    const { createMfaChallengeService } = require('../intelligence/mfa-challenge.service');
    const createMfaChallengeRouter = require('../routes/mfa-challenge.routes');

    let mfaSettingsModel = null;
    try {
      mfaSettingsModel = require('../models/MFASettings');
    } catch {
      /* model optional in test/dev — service falls back to closed-fail verifier */
    }

    // Pluggable session updater. Production should override this from
    // wherever the session lives (express-session, JWT refresh, Redis).
    // Exposed on `app` so other modules can swap it without re-importing.
    app._mfaSessionUpdater =
      app._mfaSessionUpdater ||
      async function defaultMfaSessionUpdater({ userId, mfaLevel, mfaAssertedAt }) {
        // Default: log only. Real session-store wiring is environment-specific.
        logger.info(
          `[MFA] session upgrade userId=${userId} mfaLevel=${mfaLevel} at=${mfaAssertedAt?.toISOString?.() || mfaAssertedAt}`
        );
      };

    let auditLogger = null;
    try {
      const { auditLogService } = require('../services/auditLog.service');
      if (auditLogService && typeof auditLogService.log === 'function') {
        auditLogger = auditLogService;
      }
    } catch {
      /* audit optional — challenge still works, no audit row */
    }

    // W1461c — email-OTP step-up sender (for users with no TOTP device).
    let emailSender = null;
    try {
      const sendEmail = require('../services/emailService');
      emailSender = async ({ to, code, expiresAt }) => {
        const mins = expiresAt
          ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
          : 5;
        await sendEmail({
          to,
          subject: 'رمز التحقق — منصّة الأوائل',
          html:
            '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;color:#1f2937">' +
            '<p>رمز التحقق الخاص بك لتنفيذ عملية حسّاسة تتطلّب رفع مستوى التحقق:</p>' +
            `<p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#1B4A8A">${code}</p>` +
            `<p style="color:#6b7280">صالح لمدة ${mins} دقائق. لا تشاركه مع أحد. إن لم تطلبه، تجاهل هذه الرسالة.</p>` +
            '</div>',
          text: `رمز التحقق: ${code} (صالح ${mins} دقائق). لا تشاركه مع أحد.`,
        });
      };
    } catch (e) {
      logger.warn('[MFA] email-OTP sender not wired:', e && e.message);
    }

    const mfaSvc = createMfaChallengeService({
      mfaSettingsModel,
      auditLogger,
      emailSender,
      sessionUpdater: (...args) => app._mfaSessionUpdater(...args),
      logger,
    });

    const { authenticate: mfaAuthMw } = require('../middleware/auth');
    app.use('/api/v1/mfa', mfaAuthMw, createMfaChallengeRouter({ service: mfaSvc, logger }));
    // Expose for other modules (route guards) that need `requireMfa(tier)`.
    app._mfaChallengeService = mfaSvc;
    logger.info('[MFA] ✓ step-up challenge routes mounted at /api/v1/mfa');
  } catch (mfaErr) {
    logger.warn('[MFA] routes skipped:', mfaErr.message);
  }
}

module.exports = { wireMfaChallenge };
