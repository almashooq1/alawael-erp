/**
 * assessment-report-generator.js
 * ═══════════════════════════════════════════════════════════════
 * مولّد تقارير التقييم — Assessment Report Generator
 *
 * يُنتج تقريراً نصياً/HTML قابلاً للطباعة أو التصدير كـ PDF
 * لأي نوع من أنواع التقييم في النظام.
 *
 * الوظائف:
 *   — generateReport(type, assessmentDoc, options)
 *   — generateBeneficiaryFullReport(allAssessments, beneficiaryInfo)
 *   — generateProgressComparisonReport(pre, post, comparison)
 *   — formatDate(date)
 *   — severityColor(level)
 *
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

class AssessmentReportGenerator {
  /* ─── تاريخ محلي ─────────────────────────────────────────── */
  static formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

  static formatDateTime(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* ─── ألوان الشدة ────────────────────────────────────────── */
  static severityColor(level) {
    const map = {
      low: '#4caf50',
      mild: '#8bc34a',
      medium: '#ff9800',
      moderate: '#ff9800',
      high: '#f44336',
      severe: '#d32f2f',
      within_normal: '#4caf50',
      little_or_no: '#4caf50',
      mild_to_moderate: '#ff9800',
      moderate_to_severe: '#f57c00',
      severe_burden: '#d32f2f',
    };
    return map[level] || '#757575';
  }

  /* ─── أيقونة الشدة ────────────────────────────────────────── */
  static severityIcon(level) {
    const map = {
      low: '✅',
      mild: '🟡',
      medium: '🟠',
      moderate: '🟠',
      high: '🔴',
      severe: '🔴',
      within_normal: '✅',
    };
    return map[level] || '⚪';
  }

  /* ═══════════════════════════════════════════════════════════
     تقرير تقييم واحد
     ═══════════════════════════════════════════════════════════ */
  static generateReport(type, doc, options = {}) {
    const header = this._header(type, doc);
    const body = this._body(type, doc);
    const footer = this._footer(doc);

    if (options.format === 'html') {
      return this._wrapHTML(header, body, footer, type);
    }

    // نص عادي (للطباعة أو التحويل لـ PDF)
    return [header, '', body, '', footer].join('\n');
  }

  /* ─── رأس التقرير ────────────────────────────────────────── */
  static _header(type, doc) {
    const scaleNames = {
      mchat: 'M-CHAT-R/F — قائمة التحقق المعدلة للتوحد',
      cars2: 'CARS-2 — مقياس تقدير التوحد الطفولي',
      'sensory-profile': 'Sensory Profile 2 — الملف الحسي',
      brief2: 'BRIEF-2 — تقييم الوظائف التنفيذية',
      srs2: 'SRS-2 — مقياس الاستجابة الاجتماعية',
      portage: 'Portage Guide — دليل بورتاج النمائي',
      'abc-data': 'ABC Data — تحليل السلوك الوظيفي',
      'family-needs': 'Family Needs Survey — استبيان احتياجات الأسرة',
      'quality-of-life': 'QoL — تقييم جودة الحياة',
      transition: 'Transition — جاهزية الانتقال',
      'saudi-screening': 'Saudi Screening — الفحص النمائي السعودي',
      'behavioral-function': 'FBA — التقييم الوظيفي للسلوك',
      'caregiver-burden': 'Zarit — مقياس عبء مقدم الرعاية',
    };

    const lines = [
      '═══════════════════════════════════════════════════════════',
      `  📋 تقرير تقييم — ${scaleNames[type] || type}`,
      '═══════════════════════════════════════════════════════════',
      '',
      `📅 تاريخ التقييم: ${this.formatDate(doc.createdAt || doc.assessment_date)}`,
      `👤 المستفيد: ${doc.beneficiary?.name || doc.beneficiary || '—'}`,
      `🎂 العمر: ${doc.age_months ? `${doc.age_months} شهر (${(doc.age_months / 12).toFixed(1)} سنة)` : '—'}`,
      `👨‍⚕️ المقيّم: ${doc.assessor?.name || doc.assessor || '—'}`,
      `📊 الحالة: ${doc.status === 'completed' ? 'مكتمل ✅' : doc.status || '—'}`,
    ];

    return lines.join('\n');
  }

  /* ─── جسم التقرير حسب النوع ──────────────────────────────── */
  static _body(type, doc) {
    const generators = {
      mchat: () => this._mchatBody(doc),
      srs2: () => this._srs2Body(doc),
      'caregiver-burden': () => this._caregiverBody(doc),
      brief2: () => this._brief2Body(doc),
      'sensory-profile': () => this._sensoryBody(doc),
      portage: () => this._portageBody(doc),
      'quality-of-life': () => this._qolBody(doc),
      transition: () => this._transitionBody(doc),
      'behavioral-function': () => this._fbaBody(doc),
      'family-needs': () => this._familyNeedsBody(doc),
    };

    if (generators[type]) return generators[type]();
    return this._genericBody(doc);
  }

  // ── M-CHAT-R/F ──
  static _mchatBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│               نتائج M-CHAT-R/F                  │',
      '└─────────────────────────────────────────────────┘',
      '',
      `  ${this.severityIcon(doc.risk_level)} مستوى الخطر: ${doc.risk_level_ar || doc.risk_level} (${doc.total_risk_score}/20)`,
      `  ⚠️ البنود الحرجة الفاشلة: ${doc.critical_items_failed || 0}`,
      '',
    ];

    if (doc.risk_level === 'high') {
      lines.push('  ⛔ تنبيه: يُوصى بشدة بإحالة الطفل لتقييم تشخيصي شامل لاضطراب طيف التوحد');
    } else if (doc.risk_level === 'medium') {
      lines.push('  ⚠️ يُوصى بإجراء مقابلة المتابعة (Follow-up Interview)');
    } else {
      lines.push('  ✅ النتيجة ضمن الحدود الطبيعية — إعادة الفحص عند عمر 24 شهر');
    }

    if (doc.auto_recommendations?.length > 0) {
      lines.push('', '  📋 التوصيات:');
      doc.auto_recommendations.forEach((r, i) => lines.push(`    ${i + 1}. ${r}`));
    }

    return lines.join('\n');
  }

  // ── SRS-2 ──
  static _srs2Body(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│             نتائج SRS-2                         │',
      '└─────────────────────────────────────────────────┘',
      '',
      `  📊 الدرجة الخام الكلية: ${doc.total_raw_score || '—'}`,
      `  📈 الدرجة التائية (T-Score): ${doc.total_t_score || '—'}`,
      `  ${this.severityIcon(doc.severity_classification)} التصنيف: ${doc.severity_classification_ar || doc.severity_classification}`,
      `  🧬 متوافق مع DSM-5: ${doc.dsm5_compatible ? 'نعم' : 'لا'}`,
    ];

    if (doc.subscale_scores) {
      lines.push('', '  📋 المقاييس الفرعية:');
      Object.entries(doc.subscale_scores).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      });
    }

    return lines.join('\n');
  }

  // ── Caregiver Burden ──
  static _caregiverBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│        نتائج مقياس عبء مقدم الرعاية (Zarit)     │',
      '└─────────────────────────────────────────────────┘',
      '',
      `  📊 الدرجة الكلية: ${doc.total_score || '—'} / 88`,
      `  ${this.severityIcon(doc.burden_level)} مستوى العبء: ${doc.burden_level_ar || doc.burden_level}`,
    ];

    if (doc.dimension_scores) {
      lines.push('', '  📋 الأبعاد:');
      Object.entries(doc.dimension_scores).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${v}`);
      });
    }

    if (doc.support_recommendations?.length > 0) {
      lines.push('', '  💡 توصيات الدعم:');
      doc.support_recommendations.forEach((r, i) => lines.push(`    ${i + 1}. ${r}`));
    }

    return lines.join('\n');
  }

  // ── BRIEF-2 ──
  static _brief2Body(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│         نتائج BRIEF-2 (الوظائف التنفيذية)       │',
      '└─────────────────────────────────────────────────┘',
    ];

    if (doc.composite_scores) {
      lines.push('', '  📊 المؤشرات المركبة:');
      Object.entries(doc.composite_scores).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      });
    }

    if (doc.clinical_interpretation) {
      lines.push('', `  🔬 التفسير السريري: ${doc.clinical_interpretation}`);
    }

    return lines.join('\n');
  }

  // ── Sensory Profile ──
  static _sensoryBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│           نتائج الملف الحسي (Sensory Profile 2)  │',
      '└─────────────────────────────────────────────────┘',
    ];

    if (doc.quadrant_scores) {
      lines.push('', '  🧠 الأرباع الحسية:');
      Object.entries(doc.quadrant_scores).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      });
    }

    if (doc.sensory_profile_summary) {
      lines.push('', `  📋 الملخص: ${doc.sensory_profile_summary}`);
    }

    return lines.join('\n');
  }

  // ── Portage ──
  static _portageBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│         نتائج بورتاج النمائي                     │',
      '└─────────────────────────────────────────────────┘',
    ];

    if (doc.domain_summaries) {
      lines.push('', '  📊 ملخص المجالات:');
      Object.entries(doc.domain_summaries).forEach(([k, v]) => {
        lines.push(`    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      });
    }

    if (doc.developmental_analysis) {
      lines.push(
        '',
        `  🔬 التحليل النمائي: ${typeof doc.developmental_analysis === 'object' ? JSON.stringify(doc.developmental_analysis) : doc.developmental_analysis}`
      );
    }

    return lines.join('\n');
  }

  // ── Quality of Life ──
  static _qolBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│          نتائج جودة الحياة                       │',
      '└─────────────────────────────────────────────────┘',
      '',
      `  📊 الدرجة المحولة الكلية: ${doc.total_transformed_score || '—'} / 100`,
      `  📋 التفسير: ${doc.interpretation || '—'}`,
    ];

    return lines.join('\n');
  }

  // ── Transition Readiness ──
  static _transitionBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│         نتائج جاهزية الانتقال                    │',
      '└─────────────────────────────────────────────────┘',
      '',
      `  📊 نسبة الجاهزية الكلية: ${doc.overall_readiness || '—'}%`,
      `  🎯 نوع الانتقال: ${doc.transition_type || '—'}`,
    ];

    return lines.join('\n');
  }

  // ── FBA ──
  static _fbaBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│        نتائج التقييم الوظيفي للسلوك (FBA)        │',
      '└─────────────────────────────────────────────────┘',
    ];

    if (doc.target_behavior) {
      lines.push('', `  🎯 السلوك المستهدف: ${doc.target_behavior.description || '—'}`);
      lines.push(`  📊 التكرار: ${doc.target_behavior.frequency || '—'} مرة/يوم`);
      lines.push(`  ⏱️ المدة: ${doc.target_behavior.duration_minutes || '—'} دقيقة`);
      lines.push(`  ⚠️ الشدة: ${doc.target_behavior.severity || '—'}`);
    }

    if (doc.hypothesized_functions?.length > 0) {
      lines.push('', '  🔬 الوظائف المفترضة:');
      const fnNames = {
        attention: 'الحصول على انتباه',
        escape: 'الهروب/التجنب',
        tangible: 'الحصول على شيء ملموس',
        sensory: 'التحفيز الحسي',
      };
      doc.hypothesized_functions.forEach(f => lines.push(`    • ${fnNames[f] || f}`));
    }

    return lines.join('\n');
  }

  // ── Family Needs ──
  static _familyNeedsBody(doc) {
    const lines = [
      '┌─────────────────────────────────────────────────┐',
      '│        نتائج استبيان احتياجات الأسرة              │',
      '└─────────────────────────────────────────────────┘',
    ];

    if (doc.priority_needs?.length > 0) {
      lines.push('', '  🔴 الاحتياجات ذات الأولوية:');
      doc.priority_needs.forEach((n, i) => lines.push(`    ${i + 1}. ${n}`));
    }

    return lines.join('\n');
  }

  // ── Generic ──
  static _genericBody(doc) {
    return `  📋 بيانات التقييم:\n${JSON.stringify(doc, null, 2)
      .split('\n')
      .map(l => '    ' + l)
      .join('\n')}`;
  }

  /* ─── تذييل التقرير ──────────────────────────────────────── */
  static _footer(doc) {
    return [
      '',
      '═══════════════════════════════════════════════════════════',
      `  📅 تاريخ إنشاء التقرير: ${this.formatDateTime(new Date())}`,
      '  🏥 نظام محرك التقييم الذكي — Smart Assessment Engine',
      '  ⚠️ هذا التقرير لأغراض سريرية — لا يُعتبر تشخيصاً نهائياً',
      '═══════════════════════════════════════════════════════════',
    ].join('\n');
  }

  /* ─── تغليف HTML ─────────────────────────────────────────── */
  static _wrapHTML(header, body, footer, type) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>تقرير التقييم — ${type}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 40px; background: #fff; color: #333; line-height: 1.8; }
    .report { max-width: 800px; margin: 0 auto; border: 2px solid #1565c0; border-radius: 12px; padding: 30px; }
    .header { background: linear-gradient(135deg, #1565c0, #0d47a1); color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { font-size: 1.4rem; margin-bottom: 10px; }
    .header p { font-size: 0.9rem; opacity: 0.9; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .meta-item { background: #f5f5f5; padding: 10px; border-radius: 6px; }
    .meta-item label { font-size: 0.8rem; color: #666; display: block; }
    .meta-item span { font-weight: bold; }
    .body { white-space: pre-wrap; font-family: 'Courier New', monospace; background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 20px; }
    .footer { text-align: center; color: #999; font-size: 0.8rem; padding-top: 15px; border-top: 1px solid #e0e0e0; }
    @media print {
      body { padding: 20px; }
      .report { border: none; }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>📋 تقرير التقييم</h1>
    </div>
    <pre class="body">${header}\n\n${body}</pre>
    <div class="footer">${footer.replace(/\n/g, '<br>')}</div>
  </div>
</body>
</html>`;
  }

  /* ═══════════════════════════════════════════════════════════
     تقرير مستفيد شامل
     ═══════════════════════════════════════════════════════════ */
  static generateBeneficiaryFullReport(allAssessments, beneficiaryInfo = {}) {
    const lines = [
      '════════════════════════════════════════════════════════════════',
      `    📋 تقرير تقييم شامل — ${beneficiaryInfo.name || 'المستفيد'}`,
      '════════════════════════════════════════════════════════════════',
      '',
      `  📅 تاريخ التقرير: ${this.formatDate(new Date())}`,
      `  👤 الاسم: ${beneficiaryInfo.name || '—'}`,
      `  📁 رقم الملف: ${beneficiaryInfo.fileNumber || '—'}`,
      `  🎂 تاريخ الميلاد: ${this.formatDate(beneficiaryInfo.dateOfBirth)}`,
      `  🏥 التشخيص: ${beneficiaryInfo.diagnosis || '—'}`,
      '',
      '────────────────────────────────────────────────────────────────',
      '',
    ];

    let totalCount = 0;
    for (const [type, docs] of Object.entries(allAssessments)) {
      if (docs && docs.length > 0) {
        totalCount += docs.length;
        lines.push(`  📊 ${type} — ${docs.length} تقييم(ات)`);
        lines.push(`     آخر تقييم: ${this.formatDate(docs[0].createdAt)}`);
        lines.push('');
      }
    }

    lines.push(`  📋 الإجمالي: ${totalCount} تقييم`);
    lines.push('');
    lines.push('════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /* ═══════════════════════════════════════════════════════════
     تقرير مقارنة
     ═══════════════════════════════════════════════════════════ */
  static generateProgressComparisonReport(comparison) {
    const lines = [
      '════════════════════════════════════════════════════════════════',
      '    📊 تقرير مقارنة التقييمات (قبلي / بعدي)',
      '════════════════════════════════════════════════════════════════',
      '',
      `  📅 الفترة: ${comparison.days_between || '—'} يوم`,
      '',
    ];

    if (comparison.changes) {
      lines.push('  ┌──────────────┬────────┬────────┬────────┬──────────┐');
      lines.push('  │    البُعد     │ القبلي │ البعدي │ التغيير │ الاتجاه  │');
      lines.push('  ├──────────────┼────────┼────────┼────────┼──────────┤');

      for (const [field, data] of Object.entries(comparison.changes)) {
        const name = field.padEnd(12).substring(0, 12);
        lines.push(
          `  │ ${name} │ ${String(data.pre).padStart(6)} │ ${String(data.post).padStart(6)} │ ${String(data.change > 0 ? '+' + data.change : data.change).padStart(6)} │ ${data.direction.padEnd(8)} │`
        );
      }

      lines.push('  └──────────────┴────────┴────────┴────────┴──────────┘');
    }

    if (comparison.effect_size) {
      lines.push('');
      lines.push(`  📈 حجم الأثر (Cohen's d): ${comparison.effect_size.effect_size?.toFixed(3)}`);
      lines.push(
        `  📋 التفسير: ${comparison.effect_size.interpretation_ar || comparison.effect_size.interpretation}`
      );
    }

    lines.push('');
    lines.push('════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

module.exports = AssessmentReportGenerator;
