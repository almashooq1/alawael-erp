/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Template Engine — محرك القوالب
 * ═══════════════════════════════════════════════════════════════
 *
 * Professional Arabic RTL HTML email templates with company branding.
 * All templates are responsive, support dark mode, and follow
 * email client best practices (Outlook, Gmail, Apple Mail).
 */

const path = require('path');
const fs = require('fs').promises;
const config = require('./EmailConfig');
const logger = require('../../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 🎨 BRAND CONSTANTS
// ═══════════════════════════════════════════════════════════════

const BRAND = {
  name: config.brand.name,
  nameEn: config.brand.nameEn,
  logo: config.brand.logo,
  primaryColor: config.brand.primaryColor,
  secondaryColor: config.brand.secondaryColor,
  textColor: config.brand.textColor,
  bgColor: config.brand.bgColor,
  footerColor: config.brand.footerColor,
  year: new Date().getFullYear(),
};

// ═══════════════════════════════════════════════════════════════
// 🎨 CSS STYLES (Inline-ready for email clients)
// ═══════════════════════════════════════════════════════════════

const STYLES = `
  body { margin: 0; padding: 0; background-color: ${BRAND.bgColor}; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  .email-wrapper { width: 100%; background: ${BRAND.bgColor}; padding: 20px 10px; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e8e8e8; }
  .header { background: linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.secondaryColor}); padding: 32px 30px 28px; text-align: center; }
  .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: 0.5px; }
  .header .subtitle { color: rgba(255,255,255,0.88); font-size: 13px; margin-top: 8px; font-weight: 400; }
  .header .logo { max-height: 55px; margin-bottom: 12px; }
  .body { padding: 32px 30px; color: ${BRAND.textColor}; line-height: 1.85; font-size: 15px; }
  .body h2 { color: ${BRAND.primaryColor}; font-size: 20px; margin: 0 0 16px; font-weight: 700; }
  .body p { margin: 0 0 14px; }
  .info-card { background: ${BRAND.bgColor}; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid ${BRAND.primaryColor}; }
  .info-card .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; align-items: center; }
  .info-card .row:last-child { border-bottom: none; }
  .info-card .label { color: ${BRAND.footerColor}; font-size: 13px; min-width: 120px; }
  .info-card .value { color: ${BRAND.textColor}; font-weight: 600; font-size: 14px; text-align: left; }
  .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.secondaryColor}); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 18px 0; text-align: center; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.92; }
  .btn-success { background: linear-gradient(135deg, #28a745, #20c997); }
  .btn-danger { background: linear-gradient(135deg, #dc3545, #e74c3c); }
  .btn-warning { background: linear-gradient(135deg, #ffc107, #ffb300); color: ${BRAND.textColor} !important; }
  .btn-outline { background: transparent; border: 2px solid ${BRAND.primaryColor}; color: ${BRAND.primaryColor} !important; }
  .alert { padding: 16px 20px; border-radius: 10px; margin: 16px 0; font-size: 14px; line-height: 1.7; }
  .alert-info { background: #e3f2fd; color: #1565c0; border-right: 4px solid #1565c0; }
  .alert-success { background: #e8f5e9; color: #2e7d32; border-right: 4px solid #2e7d32; }
  .alert-warning { background: #fff3e0; color: #e65100; border-right: 4px solid #e65100; }
  .alert-danger { background: #ffebee; color: #c62828; border-right: 4px solid #c62828; }
  .divider { height: 1px; background: linear-gradient(to left, transparent, #e0e0e0, transparent); margin: 28px 0; }
  .footer { background: ${BRAND.bgColor}; padding: 28px 30px; text-align: center; border-top: 1px solid #e9ecef; }
  .footer p { color: ${BRAND.footerColor}; font-size: 12px; margin: 5px 0; line-height: 1.6; }
  .footer a { color: ${BRAND.primaryColor}; text-decoration: none; font-weight: 500; }
  .footer .social-links { margin: 12px 0; }
  .footer .social-links a { display: inline-block; margin: 0 6px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .badge-success { background: #e8f5e9; color: #2e7d32; }
  .badge-warning { background: #fff3e0; color: #e65100; }
  .badge-danger { background: #ffebee; color: #c62828; }
  .badge-info { background: #e3f2fd; color: #1565c0; }
  .badge-primary { background: #ede7f6; color: #5c2d91; }
  .otp-box { display: inline-block; background: ${BRAND.bgColor}; border: 2px dashed ${BRAND.primaryColor}; border-radius: 14px; padding: 22px 48px; margin: 20px 0; }
  .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: ${BRAND.primaryColor}; font-family: 'Courier New', monospace; }
  .progress-bar { background: #e9ecef; border-radius: 8px; overflow: hidden; height: 8px; margin: 12px 0; }
  .progress-fill { height: 100%; border-radius: 8px; background: linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.secondaryColor}); }
  .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  .data-table th { background: ${BRAND.primaryColor}; color: #fff; padding: 12px 14px; text-align: right; font-weight: 600; }
  .data-table td { padding: 11px 14px; border-bottom: 1px solid #e9ecef; }
  .data-table tr:nth-child(even) { background: ${BRAND.bgColor}; }
  .data-table tr:hover { background: #f0f4ff; }
  .stats-grid { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
  .stat-card { flex: 1; min-width: 120px; background: ${BRAND.bgColor}; border-radius: 10px; padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 800; color: ${BRAND.primaryColor}; display: block; }
  .stat-label { font-size: 12px; color: ${BRAND.footerColor}; margin-top: 4px; display: block; }
  .timeline { position: relative; padding-right: 30px; margin: 16px 0; }
  .timeline-item { position: relative; padding-bottom: 20px; padding-right: 24px; border-right: 2px solid #e0e0e0; }
  .timeline-item:last-child { border-right-color: transparent; padding-bottom: 0; }
  .timeline-dot { position: absolute; right: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: ${BRAND.primaryColor}; border: 2px solid #fff; }
  .timeline-time { font-size: 12px; color: ${BRAND.footerColor}; }
  @media (max-width: 600px) {
    .container { margin: 0; border-radius: 0; border: none; }
    .body { padding: 22px 18px; }
    .header { padding: 22px 18px; }
    .footer { padding: 22px 18px; }
    .stats-grid { flex-direction: column; }
  }
`;

// ═══════════════════════════════════════════════════════════════
// 🏗️ TEMPLATE ENGINE CLASS
// ═══════════════════════════════════════════════════════════════

class EmailTemplateEngine {
  constructor() {
    this._cache = new Map();
    this._templateVersions = new Map(); // templateName → { version, createdAt, updatedAt }
    this._fileWatcher = null;
    this._renderCount = 0;
  }

  // ─── Template Version Registry ────────────────────────────

  /**
   * Get version info for a template
   */
  getTemplateVersion(templateName) {
    return this._templateVersions.get(templateName) || null;
  }

  /**
   * Get all template versions
   */
  getAllVersions() {
    const versions = {};
    for (const [name, info] of this._templateVersions) {
      versions[name] = info;
    }
    return versions;
  }

  /**
   * Register/update a template version.
   * Called automatically on first render of each built-in template.
   */
  _trackVersion(templateName) {
    if (!this._templateVersions.has(templateName)) {
      this._templateVersions.set(templateName, {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        renderCount: 0,
      });
    }
    const info = this._templateVersions.get(templateName);
    info.renderCount++;
    info.lastRenderedAt = new Date().toISOString();
  }

  // ─── File Watcher (Hot-Reload) ────────────────────────────

  /**
   * Start watching the templates directory for file changes.
   * When a template file changes on disk, it's evicted from cache.
   */
  startWatching() {
    const templatesDir = config.templates?.dir;
    if (!templatesDir) {
      logger.debug('[TemplateEngine] No templates dir configured, skipping watch');
      return;
    }

    try {
      const _fs = require('fs');
      if (!_fs.existsSync(templatesDir)) {
        logger.debug(`[TemplateEngine] Templates dir does not exist: ${templatesDir}`);
        return;
      }

      this._fileWatcher = _fs.watch(templatesDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const basename = filename.replace(/\\/g, '/');
        logger.info(`[TemplateEngine] 🔄 Template file changed: ${basename} (${eventType})`);

        // Evict changed file from cache
        for (const [key] of this._cache) {
          if (key.includes(basename) || key.includes(filename)) {
            this._cache.delete(key);
            logger.debug(`[TemplateEngine] Evicted from cache: ${key}`);
          }
        }
      });

      logger.info(`[TemplateEngine] 👁️ Watching templates dir: ${templatesDir}`);
    } catch (err) {
      logger.debug(`[TemplateEngine] File watcher failed: ${err.message}`);
    }
  }

  /**
   * Stop watching for template file changes.
   */
  stopWatching() {
    if (this._fileWatcher) {
      this._fileWatcher.close();
      this._fileWatcher = null;
      logger.info('[TemplateEngine] File watcher stopped');
    }
  }

  /**
   * Get template engine stats
   */
  getStats() {
    return {
      cacheSize: this._cache.size,
      trackedTemplates: this._templateVersions.size,
      totalRenders: this._renderCount,
      watching: !!this._fileWatcher,
    };
  }

  // ─── Layout Wrapper ──────────────────────────────────────

  /**
   * Wrap body HTML in the professional branded layout
   */
  wrapInLayout(title, bodyHtml, options = {}) {
    const {
      showFooterLinks = true,
      preheader = '',
      showLogo = true,
      showUnsubscribe = false,
      customFooter = '',
    } = options;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${this._escape(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    td, th { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
  <style>${STYLES}</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bgColor};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${BRAND.bgColor};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${this._escape(preheader)} ${'‌ '.repeat(40)}</div>` : ''}
  <div class="email-wrapper">
    <div class="container">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
      <div class="header">
        ${showLogo && BRAND.logo ? `<img src="${BRAND.logo}" alt="${BRAND.name}" class="logo">` : ''}
        <h1>${BRAND.name}</h1>
        <div class="subtitle">${BRAND.nameEn}</div>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        ${
          showFooterLinks
            ? `
          <p>
            <a href="${config.frontendUrl}">الموقع الإلكتروني</a>
            &nbsp;|&nbsp;
            <a href="${config.frontendUrl}/support">الدعم الفني</a>
            &nbsp;|&nbsp;
            <a href="${config.frontendUrl}/settings/notifications">إعدادات الإشعارات</a>
          </p>
        `
            : ''
        }
        ${customFooter || ''}
        <p>© ${BRAND.year} ${BRAND.name}. جميع الحقوق محفوظة.</p>
        ${showUnsubscribe ? `<p style="font-size:11px;"><a href="${config.frontendUrl}/unsubscribe?email={{email}}" style="color:#999;">إلغاء الاشتراك</a></p>` : ''}
        <p style="font-size:11px;color:#adb5bd;">هذه رسالة آلية من نظام ${BRAND.name}. في حال عدم الرغبة بالاستلام، تواصل مع الدعم الفني.</p>
      </div>
      <!--[if mso]></td></tr></table><![endif]-->
    </div>
  </div>
</body>
</html>`;
  }

  // ─── Component Builders ─────────────────────────────────

  /** Info card from key-value pairs */
  buildInfoCard(items) {
    const rows = items
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(
        ([label, value]) =>
          `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`
      )
      .join('');
    return `<div class="info-card">${rows}</div>`;
  }

  /** CTA button */
  buildButton(text, url, type = 'primary') {
    const cls = type === 'primary' ? 'btn' : `btn btn-${type}`;
    return `<div style="text-align:center;"><a href="${url}" class="${cls}" target="_blank">${text}</a></div>`;
  }

  /** Alert box */
  buildAlert(message, type = 'info') {
    return `<div class="alert alert-${type}">${message}</div>`;
  }

  /** Badge */
  buildBadge(text, type = 'info') {
    return `<span class="badge badge-${type}">${text}</span>`;
  }

  /** Divider */
  buildDivider() {
    return '<div class="divider"></div>';
  }

  /** Data table */
  buildTable(headers, rows) {
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    const trs = rows
      .map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');
    return `<table class="data-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  }

  /** Stats grid */
  buildStatsGrid(stats) {
    const cards = stats
      .map(
        ({ value, label, color }) =>
          `<div class="stat-card"><span class="stat-value" style="${color ? `color:${color}` : ''}">${value}</span><span class="stat-label">${label}</span></div>`
      )
      .join('');
    return `<div class="stats-grid">${cards}</div>`;
  }

  /** Progress bar */
  buildProgressBar(percent, label = '') {
    return `
      ${label ? `<p style="margin:0 0 4px;font-size:13px;color:${BRAND.footerColor};">${label}</p>` : ''}
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, percent))}%;"></div></div>
    `;
  }

  /** Timeline */
  buildTimeline(items) {
    const entries = items
      .map(
        ({ time, title, description }) =>
          `<div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-time">${time}</div>
            <div style="font-weight:600;">${title}</div>
            ${description ? `<div style="font-size:13px;color:${BRAND.footerColor};">${description}</div>` : ''}
          </div>`
      )
      .join('');
    return `<div class="timeline">${entries}</div>`;
  }

  // ─── Predefined Templates ──────────────────────────────

  /** Get all template names */
  getTemplateNames() {
    return Object.keys(this.templates);
  }

  /** Render a predefined template */
  render(templateName, data = {}) {
    const templateFn = this.templates[templateName];
    if (!templateFn) {
      throw new Error(`Template not found: ${templateName}`);
    }
    this._trackVersion(templateName);
    this._renderCount++;
    return typeof templateFn === 'function' ? templateFn.call(this, data) : templateFn;
  }

  // ── Authentication Templates ──────────────────────────────

  get templates() {
    return {
      // ── Welcome ──
      WELCOME: data => ({
        subject: `مرحباً بك في ${BRAND.name}${data.name ? ` — ${data.name}` : ''}`,
        html: this.wrapInLayout(
          'ترحيب',
          `
          <h2>مرحباً بك! 👋</h2>
          <p>عزيزي/عزيزتي <strong>${data.name || data.fullName || 'مستخدم جديد'}</strong>،</p>
          <p>يسعدنا انضمامك إلى <strong>${BRAND.name}</strong>. تم إنشاء حسابك بنجاح في نظام إدارة المركز.</p>
          ${this.buildInfoCard([
            ['البريد الإلكتروني', data.email],
            ['الدور', data.role || 'مستخدم'],
            ['القسم', data.department || ''],
            ['تاريخ التسجيل', _formatDate(new Date())],
          ])}
          <p>يمكنك الآن تسجيل الدخول والبدء في استخدام النظام:</p>
          ${this.buildButton('تسجيل الدخول', `${config.frontendUrl}/login`)}
          ${this.buildAlert('💡 ننصح بتفعيل المصادقة الثنائية (2FA) لتعزيز أمان حسابك.', 'info')}
        `,
          { preheader: `مرحباً ${data.name || data.fullName} — تم إنشاء حسابك بنجاح` }
        ),
      }),

      // ── Password Reset ──
      PASSWORD_RESET: data => ({
        subject: 'إعادة تعيين كلمة المرور — نظام الأوائل',
        html: this.wrapInLayout(
          'إعادة تعيين كلمة المرور',
          `
          <h2>إعادة تعيين كلمة المرور 🔑</h2>
          <p>مرحباً <strong>${data.name || data.fullName || data.username || ''}</strong>،</p>
          <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
          ${this.buildButton('إعادة تعيين كلمة المرور', `${config.frontendUrl}/reset-password/${data.resetToken || data.token}`)}
          ${this.buildAlert('⚠️ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط. لا تشارك هذا الرابط مع أي شخص.', 'warning')}
          <p style="font-size:13px;color:${BRAND.footerColor};">إذا لم تطلب هذا الإجراء، تجاهل هذا البريد. حسابك آمن ولن يتم تغيير أي شيء.</p>
        `,
          { preheader: 'تعليمات إعادة تعيين كلمة المرور — نظام الأوائل' }
        ),
      }),

      // ── Email Verification ──
      EMAIL_VERIFICATION: data => ({
        subject: 'تأكيد بريدك الإلكتروني — نظام الأوائل',
        html: this.wrapInLayout(
          'تأكيد البريد',
          `
          <h2>تأكيد البريد الإلكتروني ✉️</h2>
          <p>مرحباً <strong>${data.name || data.fullName || ''}</strong>،</p>
          <p>لإكمال تسجيلك وتفعيل حسابك، يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه:</p>
          ${this.buildButton('تأكيد البريد الإلكتروني', `${config.frontendUrl}/verify-email/${data.verificationToken || data.token}`, 'success')}
          ${this.buildAlert('⏱️ هذا الرابط صالح لمدة <strong>24 ساعة</strong>.', 'info')}
        `,
          { preheader: 'أكد بريدك الإلكتروني لإكمال التسجيل' }
        ),
      }),

      // ── OTP Code ──
      OTP_CODE: data => ({
        subject: `رمز التحقق: ${data.otp || data.code}`,
        html: this.wrapInLayout(
          'رمز التحقق',
          `
          <h2>رمز التحقق 🔐</h2>
          <p>مرحباً <strong>${data.name || data.username || ''}</strong>،</p>
          <p>رمز التحقق الخاص بك هو:</p>
          <div style="text-align:center;margin:28px 0;">
            <div class="otp-box">
              <span class="otp-code">${data.otp || data.code}</span>
            </div>
          </div>
          ${this.buildAlert(`⏱️ هذا الرمز صالح لمدة <strong>${data.expiry || 5} دقائق</strong>. لا تشاركه مع أي شخص.`, 'warning')}
          <p style="font-size:13px;color:${BRAND.footerColor};">إذا لم تطلب رمز التحقق، تجاهل هذا البريد.</p>
        `,
          { preheader: `رمز التحقق: ${data.otp || data.code}` }
        ),
      }),

      // ── 2FA Enabled ──
      TWO_FA_ENABLED: data => ({
        subject: 'تم تفعيل المصادقة الثنائية — نظام الأوائل',
        html: this.wrapInLayout(
          'المصادقة الثنائية',
          `
          <h2>تم تفعيل المصادقة الثنائية ✅</h2>
          <p>مرحباً <strong>${data.username || data.email || ''}</strong>،</p>
          <p>تم تفعيل المصادقة الثنائية (2FA) على حسابك بنجاح.</p>
          ${this.buildAlert('🛡️ حسابك الآن محمي بطبقة أمان إضافية. ستحتاج لإدخال رمز التحقق عند كل تسجيل دخول.', 'success')}
          ${this.buildInfoCard([
            ['الحساب', data.email],
            ['الحالة', this.buildBadge('مفعّل ✅', 'success')],
            ['التاريخ', _formatDate(new Date())],
          ])}
          <p style="font-size:13px;color:${BRAND.footerColor};">إذا لم تقم بهذا الإجراء، يرجى التواصل مع الدعم الفني فوراً.</p>
        `
        ),
      }),

      // ── 2FA Disabled ──
      TWO_FA_DISABLED: data => ({
        subject: 'تم إلغاء المصادقة الثنائية — نظام الأوائل',
        html: this.wrapInLayout(
          'المصادقة الثنائية',
          `
          <h2>تم إلغاء المصادقة الثنائية ⚠️</h2>
          <p>مرحباً <strong>${data.username || data.email || ''}</strong>،</p>
          <p>تم إلغاء تفعيل المصادقة الثنائية (2FA) على حسابك.</p>
          ${this.buildAlert('⚠️ حسابك الآن أقل أماناً. ننصح بشدة بإعادة تفعيل المصادقة الثنائية.', 'warning')}
          ${this.buildButton('إعادة تفعيل 2FA', `${config.frontendUrl}/settings/security`)}
        `
        ),
      }),

      // ── Login Alert ──
      LOGIN_ALERT: data => ({
        subject: '🔔 تسجيل دخول جديد إلى حسابك',
        html: this.wrapInLayout(
          'تنبيه أمني',
          `
          <h2>تسجيل دخول جديد 🔔</h2>
          <p>مرحباً <strong>${data.name || data.username || ''}</strong>،</p>
          <p>تم تسجيل دخول جديد إلى حسابك:</p>
          ${this.buildInfoCard([
            ['الجهاز', data.device || 'غير معروف'],
            ['المتصفح', data.browser || 'غير معروف'],
            ['الموقع', data.location || 'غير معروف'],
            ['عنوان IP', data.ip || ''],
            ['التاريخ والوقت', _formatDateTime(new Date())],
          ])}
          ${this.buildAlert('إذا لم تقم بتسجيل الدخول، يرجى تغيير كلمة المرور فوراً:', 'danger')}
          ${this.buildButton('تغيير كلمة المرور', `${config.frontendUrl}/settings/security`, 'danger')}
        `,
          { preheader: 'تم رصد تسجيل دخول جديد إلى حسابك' }
        ),
      }),

      // ── Account Locked ──
      ACCOUNT_LOCKED: data => ({
        subject: '🔒 تم قفل حسابك — نظام الأوائل',
        html: this.wrapInLayout(
          'حساب مقفل',
          `
          <h2>تم قفل حسابك 🔒</h2>
          <p>مرحباً <strong>${data.name || data.email || ''}</strong>،</p>
          <p>تم قفل حسابك بسبب محاولات تسجيل دخول فاشلة متعددة.</p>
          ${this.buildInfoCard([
            ['عدد المحاولات', data.attempts || ''],
            ['آخر محاولة', _formatDateTime(data.lastAttempt || new Date())],
            ['مدة القفل', data.lockDuration || '30 دقيقة'],
          ])}
          ${this.buildAlert('🔓 سيتم فتح حسابك تلقائياً بعد انتهاء المدة، أو يمكنك إعادة تعيين كلمة المرور:', 'warning')}
          ${this.buildButton('إعادة تعيين كلمة المرور', `${config.frontendUrl}/forgot-password`)}
        `
        ),
      }),

      // ══ Appointments & Therapy ══════════════════════════════

      APPOINTMENT_REMINDER: data => ({
        subject: `تذكير بموعد: ${data.type || 'جلسة علاجية'} — ${_formatDate(data.date)}`,
        html: this.wrapInLayout(
          'تذكير بموعد',
          `
          <h2>تذكير بموعدك القادم 📅</h2>
          <p>عزيزي/عزيزتي <strong>${data.patientName || data.beneficiaryName || data.name || ''}</strong>،</p>
          <p>نذكّرك بموعدك القادم في ${BRAND.name}:</p>
          ${this.buildInfoCard([
            ['نوع الموعد', data.type || data.sessionType || 'جلسة علاجية'],
            ['التاريخ', _formatDate(data.date)],
            ['الوقت', data.startTime || _formatTime(data.time)],
            ['المعالج', data.therapistName || data.doctorName || ''],
            ['المكان', data.location || data.room || 'المركز الرئيسي'],
          ])}
          ${this.buildAlert('📌 يرجى الحضور قبل الموعد بـ 15 دقيقة. في حالة عدم القدرة على الحضور، يرجى الإلغاء مسبقاً.', 'info')}
          ${this.buildButton('عرض تفاصيل الموعد', `${config.frontendUrl}/appointments`)}
        `,
          { preheader: `تذكير: موعدك يوم ${_formatDate(data.date)}` }
        ),
      }),

      APPOINTMENT_CONFIRMATION: data => ({
        subject: `تأكيد الموعد — ${_formatDate(data.date)}`,
        html: this.wrapInLayout(
          'تأكيد موعد',
          `
          <h2>تم تأكيد موعدك ✅</h2>
          <p>عزيزي/عزيزتي <strong>${data.patientName || data.beneficiaryName || data.name || ''}</strong>،</p>
          <p>تم تأكيد موعدك بنجاح:</p>
          ${this.buildInfoCard([
            ['نوع الموعد', data.type || 'جلسة علاجية'],
            ['التاريخ', _formatDate(data.date)],
            ['الوقت', data.startTime || _formatTime(data.time)],
            ['المعالج', data.therapistName || data.doctorName || ''],
            ['الحالة', this.buildBadge('مؤكد ✅', 'success')],
          ])}
          ${this.buildButton('إضافة إلى التقويم', `${config.frontendUrl}/appointments/calendar`)}
        `
        ),
      }),

      APPOINTMENT_CANCELLATION: data => ({
        subject: 'إلغاء موعد — نظام الأوائل',
        html: this.wrapInLayout(
          'إلغاء موعد',
          `
          <h2>تم إلغاء الموعد ❌</h2>
          <p>عزيزي/عزيزتي <strong>${data.patientName || data.beneficiaryName || data.name || ''}</strong>،</p>
          <p>نأسف لإبلاغك بأنه تم إلغاء موعدك:</p>
          ${this.buildInfoCard([
            ['التاريخ الأصلي', _formatDate(data.date)],
            ['المعالج', data.therapistName || data.doctorName || ''],
            ['سبب الإلغاء', data.reason || 'غير محدد'],
          ])}
          <p>لحجز موعد جديد:</p>
          ${this.buildButton('حجز موعد جديد', `${config.frontendUrl}/appointments/new`)}
        `
        ),
      }),

      SESSION_SUMMARY: data => ({
        subject: `ملخص الجلسة العلاجية — ${_formatDate(data.date)}`,
        html: this.wrapInLayout(
          'ملخص جلسة',
          `
          <h2>ملخص الجلسة العلاجية 📋</h2>
          <p>عزيزي/عزيزتي <strong>${data.guardianName || 'ولي الأمر'}</strong>،</p>
          <p>نرفق لكم ملخص الجلسة العلاجية للمستفيد <strong>${data.beneficiaryName || data.patientName || ''}</strong>:</p>
          ${this.buildInfoCard([
            ['التاريخ', _formatDate(data.date)],
            ['نوع الجلسة', data.sessionType || data.type || ''],
            ['المعالج', data.therapistName || ''],
            ['المدة', data.duration ? `${data.duration} دقيقة` : ''],
            ['الحالة', data.status || 'مكتملة'],
          ])}
          ${data.notes ? `<div class="info-card"><p style="margin:0;"><strong>ملاحظات المعالج:</strong></p><p style="margin:8px 0 0;">${data.notes}</p></div>` : ''}
          ${data.goals ? this.buildProgressSection(data.goals) : ''}
          ${data.recommendations ? this.buildAlert(`📝 <strong>التوصيات:</strong> ${data.recommendations}`, 'info') : ''}
          ${this.buildButton('عرض التفاصيل الكاملة', `${config.frontendUrl}/sessions`)}
        `,
          { preheader: `ملخص جلسة ${_formatDate(data.date)}` }
        ),
      }),

      // ══ HR / Employee Affairs ═══════════════════════════════

      LEAVE_REQUEST: data => ({
        subject: `طلب إجازة: ${data.employeeName || ''} — ${data.leaveType || data.type || ''}`,
        html: this.wrapInLayout(
          'طلب إجازة',
          `
          <h2>طلب إجازة جديد 🏖️</h2>
          <p>تم تقديم طلب إجازة جديد يحتاج لمراجعتك:</p>
          ${this.buildInfoCard([
            ['الموظف', data.employeeName || data.name || ''],
            ['القسم', data.department || ''],
            ['نوع الإجازة', data.leaveType || data.type || ''],
            ['من', _formatDate(data.startDate)],
            ['إلى', _formatDate(data.endDate)],
            ['المدة', data.duration ? `${data.duration} يوم` : ''],
            ['السبب', data.reason || ''],
          ])}
          ${this.buildButton('مراجعة الطلب', data.approvalLink || `${config.frontendUrl}/hr/leaves`)}
        `,
          { preheader: `طلب إجازة من ${data.employeeName || data.name}` }
        ),
      }),

      LEAVE_STATUS_UPDATE: data => ({
        subject: `تحديث حالة الإجازة: ${_leaveStatusText(data.status)}`,
        html: this.wrapInLayout(
          'تحديث إجازة',
          `
          <h2>تحديث حالة طلب الإجازة</h2>
          <p>عزيزي/عزيزتي <strong>${data.employeeName || data.name || ''}</strong>،</p>
          <p>تم تحديث حالة طلب إجازتك:</p>
          ${this.buildInfoCard([
            ['نوع الإجازة', data.leaveType || data.type || ''],
            ['من', _formatDate(data.startDate)],
            ['إلى', _formatDate(data.endDate)],
            ['الحالة', _leaveStatusBadge(data.status)],
            ['ملاحظات', data.reviewNotes || data.notes || ''],
          ])}
        `
        ),
      }),

      SALARY_NOTIFICATION: data => ({
        subject: `إشعار الراتب — ${data.month || _getCurrentMonth()}`,
        html: this.wrapInLayout(
          'إشعار الراتب',
          `
          <h2>إشعار صرف الراتب 💰</h2>
          <p>عزيزي/عزيزتي <strong>${data.employeeName || data.name || ''}</strong>،</p>
          <p>نعلمك بأنه تم صرف راتبك عن شهر <strong>${data.month || _getCurrentMonth()}</strong>.</p>
          ${this.buildInfoCard([
            ['الراتب الأساسي', data.base ? `${_formatCurrency(data.base)}` : ''],
            ['البدلات', data.allowances ? `${_formatCurrency(data.allowances)}` : ''],
            ['الخصومات', data.deductions ? `${_formatCurrency(data.deductions)}` : ''],
            ['صافي الراتب', `<strong>${_formatCurrency(data.net || data.amount || 0)}</strong>`],
          ])}
          ${this.buildAlert('✅ تم تحويل المبلغ إلى حسابك البنكي المسجل لدينا.', 'success')}
          ${this.buildButton('عرض كشف الراتب', `${config.frontendUrl}/hr/payslip`)}
        `,
          { preheader: `تم صرف راتبك عن شهر ${data.month || _getCurrentMonth()}` }
        ),
      }),

      ATTENDANCE_ALERT: data => ({
        subject: `تنبيه حضور: ${data.employeeName || data.name || ''}`,
        html: this.wrapInLayout(
          'تنبيه حضور',
          `
          <h2>تنبيه حضور ⏰</h2>
          <p>عزيزي/عزيزتي <strong>${data.employeeName || data.name || ''}</strong>،</p>
          ${this.buildAlert(
            `${data.alertType === 'absence' ? '❌' : '⚠️'} ${data.message || `تم تسجيل ${data.alertType === 'absence' ? 'غياب' : 'تأخير'} بتاريخ ${_formatDate(data.date)}`}`,
            data.alertType === 'absence' ? 'danger' : 'warning'
          )}
          ${this.buildInfoCard([
            ['التاريخ', _formatDate(data.date)],
            [
              'النوع',
              data.alertType === 'absence'
                ? 'غياب'
                : data.alertType === 'late'
                  ? 'تأخير'
                  : data.alertType || '',
            ],
            ['الوقت المسجل', data.checkInTime || ''],
            ['ملاحظات', data.notes || ''],
          ])}
        `
        ),
      }),

      // ══ Finance ═════════════════════════════════════════════

      INVOICE: data => ({
        subject: `فاتورة رقم ${data.invoiceNumber || data.number || ''} — ${BRAND.name}`,
        html: this.wrapInLayout(
          'فاتورة',
          `
          <h2>فاتورة ضريبية 🧾</h2>
          <p>عزيزي/عزيزتي <strong>${data.customerName || data.name || ''}</strong>،</p>
          <p>مرفق فاتورتكم من ${BRAND.name}:</p>
          ${this.buildInfoCard([
            ['رقم الفاتورة', data.invoiceNumber || data.number || ''],
            ['التاريخ', _formatDate(data.date || data.invoiceDate)],
            ['تاريخ الاستحقاق', _formatDate(data.dueDate)],
            [
              'المبلغ الإجمالي',
              `<strong>${_formatCurrency(data.total || data.amount || data.totalAmount || 0)}</strong>`,
            ],
            ['الحالة', data.status || 'معلقة'],
          ])}
          ${data.items && data.items.length ? this._buildInvoiceItemsTable(data.items) : ''}
          ${this.buildAlert('💳 يرجى السداد قبل تاريخ الاستحقاق المحدد أعلاه.', 'info')}
          ${this.buildButton('سداد الفاتورة', `${config.frontendUrl}/finance/invoices`)}
        `,
          {
            preheader: `فاتورة رقم ${data.invoiceNumber || data.number} — ${_formatCurrency(data.total || data.amount)}`,
          }
        ),
      }),

      PAYMENT_CONFIRMATION: data => ({
        subject: `تأكيد الدفع — ${_formatCurrency(data.amount || 0)}`,
        html: this.wrapInLayout(
          'تأكيد دفع',
          `
          <h2>تم استلام الدفعة ✅</h2>
          <p>عزيزي/عزيزتي <strong>${data.customerName || data.name || ''}</strong>،</p>
          <p>تم استلام دفعتك بنجاح. شكراً لك!</p>
          ${this.buildInfoCard([
            ['رقم العملية', data.transactionId || data.receiptNumber || ''],
            ['المبلغ', `<strong>${_formatCurrency(data.amount)}</strong>`],
            ['طريقة الدفع', data.method || data.paymentMethod || ''],
            ['التاريخ', _formatDate(data.date || new Date())],
            ['رقم الفاتورة', data.invoiceNumber || ''],
          ])}
          ${this.buildAlert('✅ تم تسجيل الدفعة وتحديث حسابك.', 'success')}
        `
        ),
      }),

      PAYMENT_REMINDER: data => ({
        subject: `تذكير بالسداد — فاتورة رقم ${data.invoiceNumber || data.number || ''}`,
        html: this.wrapInLayout(
          'تذكير سداد',
          `
          <h2>تذكير بالسداد 🔔</h2>
          <p>عزيزي/عزيزتي <strong>${data.customerName || data.name || ''}</strong>،</p>
          <p>نود تذكيرك بأن الفاتورة التالية لم يتم سدادها بعد:</p>
          ${this.buildInfoCard([
            ['رقم الفاتورة', data.invoiceNumber || data.number || ''],
            [
              'المبلغ المستحق',
              `<strong>${_formatCurrency(data.amount || data.totalAmount || 0)}</strong>`,
            ],
            ['تاريخ الاستحقاق', _formatDate(data.dueDate)],
            ['أيام التأخير', data.overdueDays ? `${data.overdueDays} يوم` : ''],
          ])}
          ${this.buildAlert('⚠️ يرجى السداد في أقرب وقت لتجنب الرسوم الإضافية.', 'danger')}
          ${this.buildButton('سداد الآن', `${config.frontendUrl}/finance/pay`)}
        `,
          {
            preheader: `تذكير: فاتورة رقم ${data.invoiceNumber || data.number} — ${_formatCurrency(data.amount)}`,
          }
        ),
      }),

      // ══ Supply Chain ════════════════════════════════════════

      ORDER_CONFIRMATION: data => ({
        subject: `تأكيد الطلب رقم ${data.orderId || data.orderNumber || ''}`,
        html: this.wrapInLayout(
          'تأكيد طلب',
          `
          <h2>تم تأكيد طلبك ✅</h2>
          <p>تم تأكيد طلبك بنجاح:</p>
          ${this.buildInfoCard([
            ['رقم الطلب', data.orderId || data.orderNumber || ''],
            ['التاريخ', _formatDate(data.date || new Date())],
            ['المبلغ الإجمالي', data.totalAmount ? _formatCurrency(data.totalAmount) : ''],
            ['التسليم المتوقع', _formatDate(data.deliveryDate || data.expectedDate)],
            ['الحالة', this.buildBadge('مؤكد ✅', 'success')],
          ])}
          ${data.items && data.items.length ? this._buildOrderItemsTable(data.items) : ''}
          ${this.buildButton('تتبع الطلب', `${config.frontendUrl}/orders/${data.orderId || data.orderNumber || ''}`)}
        `
        ),
      }),

      ORDER_STATUS_UPDATE: data => {
        const statusMap = {
          processing: { text: 'قيد المعالجة', badge: 'info', icon: '🔄' },
          shipped: { text: 'تم الشحن', badge: 'info', icon: '🚚' },
          in_transit: { text: 'في الطريق', badge: 'warning', icon: '🚛' },
          delivered: { text: 'تم التسليم', badge: 'success', icon: '✅' },
          cancelled: { text: 'ملغي', badge: 'danger', icon: '❌' },
          returned: { text: 'مرتجع', badge: 'warning', icon: '↩️' },
        };
        const s = statusMap[data.status] || {
          text: data.status || 'محدث',
          badge: 'info',
          icon: '📦',
        };

        return {
          subject: `تحديث الطلب رقم ${data.orderId || data.orderNumber || ''} — ${s.text}`,
          html: this.wrapInLayout(
            'تحديث طلب',
            `
            <h2>${s.icon} تحديث حالة الطلب</h2>
            <p>تم تحديث حالة طلبك:</p>
            ${this.buildInfoCard([
              ['رقم الطلب', data.orderId || data.orderNumber || ''],
              ['الحالة الجديدة', this.buildBadge(s.text, s.badge)],
              ['التاريخ', _formatDate(new Date())],
              ['ملاحظات', data.notes || ''],
            ])}
            ${data.trackingNumber ? this.buildInfoCard([['رقم التتبع', data.trackingNumber]]) : ''}
            ${this.buildButton('عرض تفاصيل الطلب', `${config.frontendUrl}/orders/${data.orderId || data.orderNumber || ''}`)}
          `
          ),
        };
      },

      LOW_STOCK_ALERT: data => ({
        subject: `⚠️ تنبيه مخزون منخفض: ${data.itemName || data.productName || ''}`,
        html: this.wrapInLayout(
          'تنبيه مخزون',
          `
          <h2>تنبيه مخزون منخفض ⚠️</h2>
          <p>المنتج التالي وصل إلى الحد الأدنى للمخزون:</p>
          ${this.buildInfoCard([
            ['المنتج', data.itemName || data.productName || ''],
            ['الكمية الحالية', `${data.currentStock || 0}`],
            ['الحد الأدنى', `${data.minStock || data.reorderLevel || 0}`],
            ['المستودع', data.warehouse || ''],
          ])}
          ${this.buildAlert('📦 يرجى إعادة الطلب لتجنب نفاد المخزون.', 'warning')}
          ${this.buildButton('طلب تجديد المخزون', `${config.frontendUrl}/supply-chain/reorder`)}
        `
        ),
      }),

      // ══ Government Integration ══════════════════════════════

      GOV_DOCUMENT_UPDATE: data => {
        const statusMap = {
          submitted: { text: 'تم التقديم', badge: 'info', icon: '📤' },
          under_review: { text: 'قيد المراجعة', badge: 'warning', icon: '🔍' },
          approved: { text: 'معتمد', badge: 'success', icon: '✅' },
          rejected: { text: 'مرفوض', badge: 'danger', icon: '❌' },
          completed: { text: 'مكتمل', badge: 'success', icon: '🏁' },
        };
        const s = statusMap[data.status] || {
          text: data.status || 'محدث',
          badge: 'info',
          icon: '📄',
        };

        return {
          subject: `تحديث المعاملة الحكومية: ${data.documentName || data.name || ''} — ${s.text}`,
          html: this.wrapInLayout(
            'معاملة حكومية',
            `
            <h2>${s.icon} تحديث المعاملة الحكومية</h2>
            <p>عزيزي/عزيزتي <strong>${data.userName || data.name || ''}</strong>،</p>
            <p>تم تحديث حالة معاملتك الحكومية:</p>
            ${this.buildInfoCard([
              ['اسم المعاملة', data.documentName || data.name || ''],
              ['الجهة', data.authority || data.entity || ''],
              ['الحالة', this.buildBadge(s.text, s.badge)],
              ['رقم المرجع', data.referenceNumber || ''],
              ['التاريخ', _formatDate(new Date())],
            ])}
            ${data.notes ? this.buildAlert(`📝 ${data.notes}`, 'info') : ''}
          `
          ),
        };
      },

      // ══ Reports & Analytics ═════════════════════════════════

      REPORT_READY: data => ({
        subject: `التقرير جاهز: ${data.title || data.name || ''}`,
        html: this.wrapInLayout(
          'تقرير',
          `
          <h2>تقريرك جاهز 📊</h2>
          <p>تم إنشاء التقرير التالي بنجاح:</p>
          ${this.buildInfoCard([
            ['اسم التقرير', data.title || data.name || ''],
            ['الفترة', data.period || ''],
            ['تاريخ الإنشاء', _formatDate(data.date || new Date())],
            ['النوع', data.type || ''],
          ])}
          ${data.summary ? `<div class="info-card"><p style="margin:0;"><strong>الملخص:</strong></p><p style="margin:8px 0 0;">${data.summary}</p></div>` : ''}
          ${data.stats ? this.buildStatsGrid(data.stats) : ''}
          ${this.buildButton(data.downloadLink ? 'تحميل التقرير' : 'عرض التقرير', data.downloadLink || `${config.frontendUrl}/reports`, data.downloadLink ? 'success' : 'primary')}
        `,
          { preheader: `التقرير ${data.title || data.name} جاهز` }
        ),
      }),

      // ══ System Alerts ═══════════════════════════════════════

      ALERT_NOTIFICATION: data => ({
        subject: `${data.severity === 'critical' ? '🚨' : '⚠️'} تنبيه: ${data.title || data.type || ''}`,
        html: this.wrapInLayout(
          'تنبيه',
          `
          <h2>${data.severity === 'critical' ? '🚨 تنبيه حرج' : '⚠️ تنبيه النظام'}</h2>
          ${this.buildAlert(
            `<strong>${data.title || data.type || 'تنبيه النظام'}</strong><br>${data.message || ''}`,
            data.severity === 'critical' ? 'danger' : 'warning'
          )}
          ${this.buildInfoCard([
            [
              'الأولوية',
              data.severity === 'critical'
                ? this.buildBadge('حرج', 'danger')
                : this.buildBadge('تحذير', 'warning'),
            ],
            ['الوقت', _formatDateTime(new Date())],
            ['المصدر', data.source || 'النظام'],
          ])}
          ${data.actionUrl ? this.buildButton('عرض التفاصيل', data.actionUrl) : ''}
        `
        ),
      }),

      // ══ General / Notification ══════════════════════════════

      NOTIFICATION: data => ({
        subject: data.subject || data.title || 'إشعار من نظام الأوائل',
        html: this.wrapInLayout(
          'إشعار',
          `
          <h2>${data.title || 'إشعار'}</h2>
          <p>${data.message || data.body || ''}</p>
          ${data.details ? `<div class="info-card">${data.details}</div>` : ''}
          ${data.actionUrl ? this.buildButton(data.actionText || 'عرض المزيد', data.actionUrl) : ''}
        `,
          {
            preheader: data.message ? data.message.substring(0, 100) : '',
            showUnsubscribe: data.unsubscribable === true,
          }
        ),
      }),

      // ══ Document Ready ══════════════════════════════════════

      DOCUMENT_READY: data => ({
        subject: `مستند جاهز: ${data.documentName || data.name || data.type || 'مستند'}`,
        html: this.wrapInLayout(
          'مستند جاهز',
          `
          <h2>مستندك جاهز 📄</h2>
          <p>عزيزي/عزيزتي <strong>${data.userName || data.name || ''}</strong>،</p>
          <p>نود إبلاغك بأن المستند التالي أصبح جاهزاً:</p>
          ${this.buildInfoCard([
            ['اسم المستند', data.documentName || data.name || ''],
            ['النوع', data.documentType || data.type || ''],
            ['التاريخ', _formatDate(data.date || new Date())],
          ])}
          ${this.buildButton(data.downloadLink ? 'تحميل المستند' : 'عرض المستندات', data.downloadLink || `${config.frontendUrl}/documents`, 'success')}
        `
        ),
      }),

      // ══ Communication ═══════════════════════════════════════

      NEW_COMMUNICATION: data => ({
        subject: `رسالة جديدة: ${data.subject || data.title || ''}`,
        html: this.wrapInLayout(
          'رسالة جديدة',
          `
          <h2>رسالة جديدة 💬</h2>
          <p>لديك رسالة جديدة:</p>
          ${this.buildInfoCard([
            ['من', data.senderName || data.from || ''],
            ['الموضوع', data.subject || data.title || ''],
            ['التاريخ', _formatDateTime(data.date || new Date())],
            ['الأولوية', data.priority || 'عادي'],
          ])}
          ${data.preview ? `<div class="info-card"><p style="margin:0;">${data.preview}</p></div>` : ''}
          ${this.buildButton('قراءة الرسالة', data.url || `${config.frontendUrl}/communications`)}
        `,
          { preheader: `رسالة جديدة من ${data.senderName || data.from}` }
        ),
      }),

      APPROVAL_REQUEST: data => ({
        subject: `طلب اعتماد: ${data.requestType || data.type || ''}`,
        html: this.wrapInLayout(
          'طلب اعتماد',
          `
          <h2>طلب اعتماد جديد 📋</h2>
          <p>يوجد طلب جديد يحتاج لاعتمادك:</p>
          ${this.buildInfoCard([
            ['نوع الطلب', data.requestType || data.type || ''],
            ['مقدم الطلب', data.requesterName || data.requestedBy || ''],
            ['التاريخ', _formatDate(data.date || new Date())],
            ['التفاصيل', data.details || ''],
          ])}
          <div style="text-align:center;margin:20px 0;">
            ${this.buildButton('✅ اعتماد', data.approveUrl || `${config.frontendUrl}/approvals`, 'success')}
            &nbsp;&nbsp;
            ${this.buildButton('❌ رفض', data.rejectUrl || `${config.frontendUrl}/approvals`, 'danger')}
          </div>
        `,
          { preheader: `طلب اعتماد من ${data.requesterName || data.requestedBy}` }
        ),
      }),

      STATUS_CHANGE: data => ({
        subject: `تغيير حالة: ${data.entityType || ''} — ${data.newStatus || ''}`,
        html: this.wrapInLayout(
          'تغيير حالة',
          `
          <h2>تغيير حالة 🔄</h2>
          <p>تم تغيير حالة ${data.entityType || 'العنصر'}:</p>
          ${this.buildInfoCard([
            ['العنصر', data.entityName || data.name || ''],
            ['الحالة السابقة', data.oldStatus || ''],
            ['الحالة الجديدة', data.newStatus || ''],
            ['بواسطة', data.changedBy || ''],
            ['التاريخ', _formatDateTime(data.date || new Date())],
          ])}
          ${data.notes ? this.buildAlert(`📝 ${data.notes}`, 'info') : ''}
          ${data.url ? this.buildButton('عرض التفاصيل', data.url) : ''}
        `
        ),
      }),

      // ══ Scheduled Digest / Summary ══════════════════════════

      DAILY_DIGEST: data => ({
        subject: `ملخص يومي — ${_formatDate(new Date())}`,
        html: this.wrapInLayout(
          'ملخص يومي',
          `
          <h2>ملخصك اليومي 📋</h2>
          <p>مرحباً <strong>${data.name || ''}</strong>، هذا ملخص أنشطة اليوم:</p>
          ${data.stats ? this.buildStatsGrid(data.stats) : ''}
          ${this.buildDivider()}
          ${
            data.tasks && data.tasks.length
              ? `
            <h3 style="color:${BRAND.primaryColor};">المهام المعلقة (${data.tasks.length})</h3>
            ${this.buildTable(
              ['المهمة', 'الأولوية', 'الموعد النهائي'],
              data.tasks.map(t => [t.title, t.priority || 'عادي', _formatDate(t.dueDate)])
            )}
          `
              : ''
          }
          ${
            data.appointments && data.appointments.length
              ? `
            <h3 style="color:${BRAND.primaryColor};">المواعيد القادمة (${data.appointments.length})</h3>
            ${this.buildTable(
              ['الموعد', 'الوقت', 'المكان'],
              data.appointments.map(a => [
                a.type || a.title,
                a.time || _formatTime(a.startTime),
                a.location || '',
              ])
            )}
          `
              : ''
          }
          ${
            data.notifications && data.notifications.length
              ? `
            <h3 style="color:${BRAND.primaryColor};">إشعارات (${data.notifications.length})</h3>
            ${data.notifications.map(n => `<p>• ${n.message || n.title}</p>`).join('')}
          `
              : ''
          }
          ${this.buildButton('فتح لوحة التحكم', `${config.frontendUrl}/dashboard`)}
        `,
          {
            preheader: `ملخصك اليومي — ${data.tasksCount || 0} مهام، ${data.appointmentsCount || 0} مواعيد`,
          }
        ),
      }),
    };
  }

  // ─── Helper Template Methods ──────────────────────────────

  buildProgressSection(goals) {
    if (!goals || !goals.length) return '';
    const rows = goals
      .map(
        g =>
          `<div style="margin:10px 0;">
            <div style="display:flex;justify-content:space-between;font-size:13px;">
              <span>${g.name || g.goal}</span>
              <span style="font-weight:600;">${g.progress || 0}%</span>
            </div>
            ${this.buildProgressBar(g.progress || 0)}
          </div>`
      )
      .join('');
    return `<div class="info-card"><p style="margin:0 0 8px;font-weight:700;">تقدم الأهداف:</p>${rows}</div>`;
  }

  _buildInvoiceItemsTable(items) {
    if (!items || !items.length) return '';
    return this.buildTable(
      ['البند', 'الكمية', 'السعر', 'الإجمالي'],
      items.map(item => [
        item.description || item.name || '',
        item.quantity || 1,
        _formatCurrency(item.price || item.unitPrice || 0),
        _formatCurrency((item.quantity || 1) * (item.price || item.unitPrice || 0)),
      ])
    );
  }

  _buildOrderItemsTable(items) {
    if (!items || !items.length) return '';
    return this.buildTable(
      ['المنتج', 'الكمية', 'السعر'],
      items.map(item => [
        item.name || item.description || '',
        item.quantity || 1,
        _formatCurrency(item.price || 0),
      ])
    );
  }

  // ─── File Template Loader ────────────────────────────────

  /**
   * Load and render HTML template from file
   */
  async loadTemplate(templateFile, variables = {}) {
    const cacheKey = templateFile;

    if (config.templates.cacheEnabled && this._cache.has(cacheKey)) {
      const cached = this._cache.get(cacheKey);
      if (Date.now() - cached.time < config.templates.cacheTTL) {
        return this._interpolate(cached.html, variables);
      }
    }

    const filePath = path.isAbsolute(templateFile)
      ? templateFile
      : path.join(config.templates.dir, templateFile);

    try {
      const html = await fs.readFile(filePath, 'utf-8');
      this._cache.set(cacheKey, { html, time: Date.now() });
      return this._interpolate(html, variables);
    } catch (err) {
      throw new Error(`Template file not found: ${filePath}`);
    }
  }

  /** Variable interpolation {{variableName}} */
  _interpolate(html, vars) {
    return html.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), vars);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /** HTML escape */
  _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Clear cached templates */
  clearCache() {
    this._cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function _formatDate(date) {
  if (!date) return 'غير محدد';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'غير محدد';
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'غير محدد';
  }
}

function _formatDateTime(date) {
  if (!date) return 'غير محدد';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'غير محدد';
    return (
      d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' — ' +
      d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return 'غير محدد';
  }
}

function _formatTime(time) {
  if (!time) return '';
  if (typeof time === 'string' && time.includes(':')) return time;
  try {
    return new Date(time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function _getCurrentMonth() {
  return new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
}

function _formatCurrency(amount, currency = 'ر.س') {
  if (amount === undefined || amount === null) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${amount} ${currency}`;
  return `${num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function _leaveStatusText(status) {
  const map = {
    approved: 'مقبولة ✅',
    rejected: 'مرفوضة ❌',
    pending: 'معلقة ⏳',
    مقبولة: 'مقبولة ✅',
    مرفوضة: 'مرفوضة ❌',
    معلقة: 'معلقة ⏳',
  };
  return map[status] || status || '';
}

function _leaveStatusBadge(status) {
  const map = {
    approved: '<span class="badge badge-success">مقبولة ✅</span>',
    rejected: '<span class="badge badge-danger">مرفوضة ❌</span>',
    pending: '<span class="badge badge-warning">معلقة ⏳</span>',
    مقبولة: '<span class="badge badge-success">مقبولة ✅</span>',
    مرفوضة: '<span class="badge badge-danger">مرفوضة ❌</span>',
    معلقة: '<span class="badge badge-warning">معلقة ⏳</span>',
  };
  return map[status] || `<span class="badge badge-info">${status}</span>`;
}

module.exports = { EmailTemplateEngine, BRAND };
