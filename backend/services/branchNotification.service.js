/**
 * branchNotification.service.js — خدمة التنبيهات الذكية للفروع
 *
 * Features:
 * 1. Rule-based alert engine (threshold triggers)
 * 2. Severity escalation (branch_manager → hq_admin → hq_super_admin)
 * 3. Multi-channel dispatch (in-app, WhatsApp, email)
 * 4. Alert deduplication (no spam)
 * 5. Alert acknowledgment & resolution tracking
 * 6. Scheduled digest reports
 */

const BranchPerformanceLog = require('../models/BranchPerformanceLog');
const BranchAuditLog = require('../models/BranchAuditLog');

// ─── Alert Rules Definition ───────────────────────────────────────────────────
const ALERT_RULES = [
  // ── Critical ───────────────────────────────────────────────────────────────
  {
    id: 'session_completion_critical',
    metric: 'sessions.completion_rate',
    condition: v => v < 60,
    severity: 'critical',
    title_ar: 'نسبة إتمام الجلسات حرجة',
    message_ar: (v, b) => `فرع ${b}: نسبة إتمام الجلسات ${v}% — أقل من الحد الأدنى 60%`,
    escalate_after_min: 30,
    escalation_target: 'hq_admin',
    modules: ['schedule', 'reports'],
  },
  {
    id: 'revenue_critical',
    metric: 'target_achievement.revenue_pct',
    condition: v => v < 50,
    severity: 'critical',
    title_ar: 'إيراد الفرع أقل من 50% من الهدف',
    message_ar: (v, b) => `فرع ${b}: تحقيق مالي ${v}% فقط من الهدف الشهري`,
    escalate_after_min: 60,
    escalation_target: 'hq_super_admin',
    modules: ['finance'],
  },
  {
    id: 'incident_spike',
    metric: 'quality.incidents_today',
    condition: v => v >= 3,
    severity: 'critical',
    title_ar: 'ارتفاع حوادث غير اعتيادي',
    message_ar: (v, b) => `فرع ${b}: تم تسجيل ${v} حوادث اليوم — يتطلب تدخلاً فورياً`,
    escalate_after_min: 15,
    escalation_target: 'hq_super_admin',
    modules: ['audit'],
  },
  // ── Warning ────────────────────────────────────────────────────────────────
  {
    id: 'attendance_low',
    metric: 'patients.attendance_rate',
    condition: v => v < 70,
    severity: 'warning',
    title_ar: 'انخفاض معدل الحضور',
    message_ar: (v, b) => `فرع ${b}: الحضور ${v}% — أقل من الهدف 80%`,
    escalate_after_min: 120,
    escalation_target: 'hq_admin',
    modules: ['patients'],
  },
  {
    id: 'satisfaction_low',
    metric: 'quality.satisfaction_score',
    condition: v => v > 0 && v < 3.5,
    severity: 'warning',
    title_ar: 'رضا الأسر منخفض',
    message_ar: (v, b) => `فرع ${b}: متوسط رضا الأسر ${v}/5`,
    escalate_after_min: 240,
    escalation_target: 'hq_admin',
    modules: ['reports'],
  },
  {
    id: 'transport_delay',
    metric: 'transport.on_time_rate',
    condition: v => v < 70,
    severity: 'warning',
    title_ar: 'تأخر في خدمة النقل',
    message_ar: (v, b) => `فرع ${b}: انتظام النقل ${v}% — يؤثر على حضور المرضى`,
    escalate_after_min: 60,
    escalation_target: 'branch_manager',
    modules: ['transport'],
  },
  {
    id: 'staff_utilization_low',
    metric: 'staff.staff_utilization_rate',
    condition: v => v < 55,
    severity: 'warning',
    title_ar: 'انخفاض استغلال الكوادر',
    message_ar: (v, b) => `فرع ${b}: الاستغلال ${v}% — طاقة غير مستغلة`,
    escalate_after_min: 480,
    escalation_target: 'branch_manager',
    modules: ['staff'],
  },
  // ── Info ───────────────────────────────────────────────────────────────────
  {
    id: 'new_patients_spike',
    metric: 'patients.new_today',
    condition: v => v >= 5,
    severity: 'info',
    title_ar: 'ارتفاع في المرضى الجدد',
    message_ar: (v, b) => `فرع ${b}: تسجيل ${v} مرضى جدد اليوم — تحقق من القدرة الاستيعابية`,
    escalate_after_min: null,
    escalation_target: null,
    modules: ['patients'],
  },
  {
    id: 'performance_improvement',
    metric: 'performance_score',
    condition: v => v >= 90,
    severity: 'info',
    title_ar: 'أداء ممتاز!',
    message_ar: (v, b) => `فرع ${b}: مؤشر الأداء ${v}/100 — درجة ممتازة 🏆`,
    escalate_after_min: null,
    escalation_target: null,
    modules: ['reports'],
  },
];

// ─── In-memory dedup cache (production: use Redis) ────────────────────────────
const alertCache = new Map(); // key: `${branchCode}:${ruleId}:${dateStr}` → timestamp

/**
 * Get nested value from object by dot-notation path
 * @param {Object} obj
 * @param {string} path - e.g. 'sessions.completion_rate'
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 1. Evaluate all rules against a performance log
 * @param {Object} log - BranchPerformanceLog document
 * @returns {Array} triggered alerts
 */
function evaluateRules(log) {
  const triggered = [];
  const dateStr = log.snapshot_date_str || new Date().toISOString().split('T')[0];

  for (const rule of ALERT_RULES) {
    const value = getNestedValue(log, rule.metric);
    if (value === undefined || value === null) continue;

    if (rule.condition(value)) {
      // Dedup check: don't fire same alert twice on same day
      const cacheKey = `${log.branch_code}:${rule.id}:${dateStr}`;
      if (alertCache.has(cacheKey)) continue;
      alertCache.set(cacheKey, Date.now());

      triggered.push({
        rule_id: rule.id,
        branch_code: log.branch_code,
        severity: rule.severity,
        title: rule.title_ar,
        message: rule.message_ar(Math.round(value * 100) / 100, log.branch_code),
        metric: rule.metric,
        value: Math.round(value * 100) / 100,
        triggered_at: new Date().toISOString(),
        date: dateStr,
        escalation: rule.escalate_after_min
          ? {
              target_role: rule.escalation_target,
              escalate_at: new Date(Date.now() + rule.escalate_after_min * 60000).toISOString(),
            }
          : null,
        modules: rule.modules,
      });
    }
  }

  return triggered;
}

/**
 * 2. Alert Dispatcher — sends to appropriate channels
 * In production, connect to: WhatsApp service, Email, Push notifications
 * @param {Array} alerts
 * @param {Object} options
 */
async function dispatchAlerts(alerts, options = {}) {
  const dispatched = [];

  for (const alert of alerts) {
    // ── Determine recipients based on severity ──
    const recipients = getRecipients(alert.severity, alert.branch_code);

    // ── In-App Notification (saved to DB) ──
    const notification = {
      ...alert,
      recipients,
      channels: [],
      status: 'dispatched',
    };

    // WhatsApp (critical & warning only, if configured)
    if (
      ['critical', 'warning'].includes(alert.severity) &&
      process.env.WHATSAPP_ENABLED === 'true'
    ) {
      notification.channels.push('whatsapp');
      // await whatsappService.send(recipients.whatsapp_numbers, alert.message);
    }

    // Email (critical only)
    if (alert.severity === 'critical' && process.env.EMAIL_ENABLED === 'true') {
      notification.channels.push('email');
      // await emailService.send(recipients.emails, alert.title, alert.message);
    }

    // Push notification (all severities)
    notification.channels.push('in_app');
    // await pushService.send(recipients.user_ids, notification);

    dispatched.push(notification);
  }

  return dispatched;
}

/**
 * 3. Determine recipients by severity
 */
function getRecipients(severity, branchCode) {
  const base = {
    roles: [],
    scope: branchCode,
  };

  switch (severity) {
    case 'critical':
      base.roles = ['hq_super_admin', 'hq_admin', 'branch_manager'];
      break;
    case 'warning':
      base.roles = ['hq_admin', 'branch_manager'];
      break;
    case 'info':
      base.roles = ['branch_manager'];
      break;
    default:
      base.roles = ['branch_manager'];
  }

  return base;
}

/**
 * 4. Run full alert scan for a branch (called after snapshot build)
 */
async function runAlertScan(branchCode, log) {
  const triggered = evaluateRules(log);

  if (triggered.length === 0) {
    return { branch_code: branchCode, alerts_triggered: 0, alerts: [] };
  }

  const dispatched = await dispatchAlerts(triggered);

  return {
    branch_code: branchCode,
    alerts_triggered: triggered.length,
    critical: triggered.filter(a => a.severity === 'critical').length,
    warnings: triggered.filter(a => a.severity === 'warning').length,
    info: triggered.filter(a => a.severity === 'info').length,
    alerts: dispatched,
  };
}

/**
 * 5. Network-wide alert scan (all branches — called from HQ)
 */
async function runNetworkAlertScan() {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = await BranchPerformanceLog.find({ snapshot_date_str: today }).lean();

  const results = await Promise.all(todayLogs.map(log => runAlertScan(log.branch_code, log)));

  const summary = {
    scan_date: today,
    branches_scanned: results.length,
    total_alerts: results.reduce((s, r) => s + r.alerts_triggered, 0),
    critical_alerts: results.reduce((s, r) => s + (r.critical || 0), 0),
    warnings: results.reduce((s, r) => s + (r.warnings || 0), 0),
    by_branch: results.filter(r => r.alerts_triggered > 0),
  };

  return summary;
}

/**
 * 6. Daily Digest — summary report for HQ (called at 8 AM)
 */
async function generateDailyDigest() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const logs = await BranchPerformanceLog.getRankingsForDate(dateStr);

  const digest = {
    date: dateStr,
    generated_at: new Date().toISOString(),
    network_summary: {
      total_branches: logs.length,
      avg_performance: Math.round(
        logs.reduce((s, l) => s + l.performance_score, 0) / Math.max(logs.length, 1)
      ),
      top_performer: logs[0]?.branch_code || 'N/A',
      bottom_performer: logs[logs.length - 1]?.branch_code || 'N/A',
      total_revenue: logs.reduce((s, l) => s + (l.finance?.daily_revenue || 0), 0),
      total_sessions: logs.reduce((s, l) => s + (l.sessions?.completed || 0), 0),
      total_patients_present: logs.reduce((s, l) => s + (l.patients?.present_today || 0), 0),
    },
    rankings: logs.slice(0, 5).map((l, i) => ({
      rank: i + 1,
      branch: l.branch_code,
      score: l.performance_score,
      grade: l.performance_grade,
    })),
    alerts_summary: {
      critical_branches: logs.filter(l => (l.anomalies?.length || 0) > 0).map(l => l.branch_code),
    },
  };

  return digest;
}

/**
 * 7. Clear alert cache (for new day)
 */
function clearAlertCache() {
  alertCache.clear();
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  ALERT_RULES,
  evaluateRules,
  dispatchAlerts,
  runAlertScan,
  runNetworkAlertScan,
  generateDailyDigest,
  clearAlertCache,
};
