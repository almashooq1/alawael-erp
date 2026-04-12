/**
 * Unit Tests — assessment-report-generator.js
 * Pure static class — NO mocks needed
 */
'use strict';

const ReportGen = require('../../services/assessment-report-generator');

// ═══════════════════════════════════════
//  formatDate / formatDateTime
// ═══════════════════════════════════════
describe('formatDate', () => {
  it('returns dashes for falsy', () => {
    expect(ReportGen.formatDate(null)).toBe('—');
    expect(ReportGen.formatDate(undefined)).toBe('—');
  });

  it('formats a valid date', () => {
    const r = ReportGen.formatDate('2025-06-15');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
    expect(r).not.toBe('—');
  });
});

describe('formatDateTime', () => {
  it('returns dashes for falsy', () => {
    expect(ReportGen.formatDateTime(null)).toBe('—');
  });

  it('formats valid datetime', () => {
    const r = ReportGen.formatDateTime('2025-06-15T10:30:00');
    expect(typeof r).toBe('string');
    expect(r).not.toBe('—');
  });
});

// ═══════════════════════════════════════
//  severityColor
// ═══════════════════════════════════════
describe('severityColor', () => {
  it('returns green for low', () => {
    expect(ReportGen.severityColor('low')).toBe('#4caf50');
  });

  it('returns orange for moderate', () => {
    expect(ReportGen.severityColor('moderate')).toBe('#ff9800');
  });

  it('returns red for severe', () => {
    expect(ReportGen.severityColor('severe')).toBe('#d32f2f');
  });

  it('returns grey for unknown', () => {
    expect(ReportGen.severityColor('xyz')).toBe('#757575');
  });
});

// ═══════════════════════════════════════
//  severityIcon
// ═══════════════════════════════════════
describe('severityIcon', () => {
  it('returns ✅ for low', () => {
    expect(ReportGen.severityIcon('low')).toBe('✅');
  });

  it('returns 🔴 for high', () => {
    expect(ReportGen.severityIcon('high')).toBe('🔴');
  });

  it('returns ⚪ for unknown', () => {
    expect(ReportGen.severityIcon('xyz')).toBe('⚪');
  });
});

// ═══════════════════════════════════════
//  generateReport — text output
// ═══════════════════════════════════════
describe('generateReport (text)', () => {
  const baseDoc = {
    createdAt: '2025-06-15',
    beneficiary: { name: 'أحمد' },
    age_months: 36,
    assessor: { name: 'د. سارة' },
    status: 'completed',
  };

  it('generates M-CHAT report', () => {
    const doc = {
      ...baseDoc,
      risk_level: 'high',
      total_risk_score: 15,
      critical_items_failed: 3,
      auto_recommendations: ['إحالة فورية'],
    };
    const report = ReportGen.generateReport('mchat', doc);
    expect(report).toContain('M-CHAT');
    expect(report).toContain('مكتمل');
    expect(report).toContain('إحالة');
    expect(report).toContain('15');
  });

  it('generates SRS-2 report', () => {
    const doc = {
      ...baseDoc,
      total_raw_score: 120,
      total_t_score: 75,
      severity_classification: 'severe',
      dsm5_compatible: true,
      subscale_scores: { social: 30 },
    };
    const report = ReportGen.generateReport('srs2', doc);
    expect(report).toContain('SRS-2');
    expect(report).toContain('120');
    expect(report).toContain('نعم');
  });

  it('generates caregiver-burden report', () => {
    const doc = {
      ...baseDoc,
      total_score: 50,
      burden_level: 'moderate',
      dimension_scores: { personal: 20 },
      support_recommendations: ['استراحة مقدم الرعاية'],
    };
    const report = ReportGen.generateReport('caregiver-burden', doc);
    expect(report).toContain('Zarit');
    expect(report).toContain('50');
  });

  it('generates generic report for unknown type', () => {
    const report = ReportGen.generateReport('unknown-type', baseDoc);
    expect(report).toContain('أحمد');
    expect(report).toContain('بيانات التقييم');
  });

  it('includes header and footer', () => {
    const report = ReportGen.generateReport('mchat', {
      ...baseDoc,
      risk_level: 'low',
      total_risk_score: 2,
    });
    expect(report).toContain('تقرير تقييم');
    expect(report).toContain('نظام محرك التقييم الذكي');
    expect(report).toContain('لا يُعتبر تشخيصاً نهائياً');
  });
});

// ═══════════════════════════════════════
//  generateReport — HTML output
// ═══════════════════════════════════════
describe('generateReport (HTML)', () => {
  it('generates valid HTML', () => {
    const doc = { risk_level: 'low', total_risk_score: 2, status: 'completed' };
    const html = ReportGen.generateReport('mchat', doc, { format: 'html' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<title>تقرير التقييم');
    expect(html).toContain('</html>');
  });
});

// ═══════════════════════════════════════
//  specific body generators
// ═══════════════════════════════════════
describe('specific type bodies', () => {
  it('brief2', () => {
    const r = ReportGen.generateReport('brief2', {
      composite_scores: { gec: 70 },
      clinical_interpretation: 'Clinical note',
    });
    expect(r).toContain('BRIEF-2');
    expect(r).toContain('Clinical note');
  });

  it('sensory-profile', () => {
    const r = ReportGen.generateReport('sensory-profile', {
      quadrant_scores: { seeking: 40 },
      sensory_profile_summary: 'Normal',
    });
    expect(r).toContain('Sensory Profile');
    expect(r).toContain('Normal');
  });

  it('portage', () => {
    const r = ReportGen.generateReport('portage', {
      domain_summaries: { motor: 80 },
      developmental_analysis: 'On track',
    });
    expect(r).toContain('بورتاج');
    expect(r).toContain('On track');
  });

  it('quality-of-life', () => {
    const r = ReportGen.generateReport('quality-of-life', {
      total_transformed_score: 75,
      interpretation: 'Good',
    });
    expect(r).toContain('جودة الحياة');
    expect(r).toContain('75');
  });

  it('transition', () => {
    const r = ReportGen.generateReport('transition', {
      overall_readiness: 85,
      transition_type: 'school',
    });
    expect(r).toContain('جاهزية');
    expect(r).toContain('85');
  });

  it('behavioral-function (FBA)', () => {
    const r = ReportGen.generateReport('behavioral-function', {
      target_behavior: { description: 'العض', frequency: 5, duration_minutes: 2, severity: 'high' },
      hypothesized_functions: ['attention', 'escape'],
    });
    expect(r).toContain('FBA');
    expect(r).toContain('العض');
    expect(r).toContain('الحصول على انتباه');
    expect(r).toContain('الهروب');
  });

  it('family-needs', () => {
    const r = ReportGen.generateReport('family-needs', {
      priority_needs: ['دعم مالي', 'تدريب'],
    });
    expect(r).toContain('احتياجات الأسرة');
    expect(r).toContain('دعم مالي');
  });

  it('M-CHAT medium risk', () => {
    const r = ReportGen.generateReport('mchat', { risk_level: 'medium', total_risk_score: 5 });
    expect(r).toContain('مقابلة المتابعة');
  });
});

// ═══════════════════════════════════════
//  generateBeneficiaryFullReport
// ═══════════════════════════════════════
describe('generateBeneficiaryFullReport', () => {
  it('generates comprehensive report', () => {
    const r = ReportGen.generateBeneficiaryFullReport(
      {
        mchat: [{ createdAt: '2025-01-01' }],
        srs2: [{ createdAt: '2025-02-01' }, { createdAt: '2025-03-01' }],
      },
      { name: 'أحمد', fileNumber: 'F001', diagnosis: 'ASD' }
    );
    expect(r).toContain('أحمد');
    expect(r).toContain('F001');
    expect(r).toContain('ASD');
    expect(r).toContain('mchat');
    expect(r).toContain('1 تقييم');
    expect(r).toContain('2 تقييم');
    expect(r).toContain('الإجمالي: 3 تقييم');
  });

  it('handles empty assessments', () => {
    const r = ReportGen.generateBeneficiaryFullReport({}, {});
    expect(r).toContain('الإجمالي: 0 تقييم');
  });
});

// ═══════════════════════════════════════
//  generateProgressComparisonReport
// ═══════════════════════════════════════
describe('generateProgressComparisonReport', () => {
  it('generates comparison table', () => {
    const comparison = {
      days_between: 90,
      changes: {
        total_score: { pre: 40, post: 30, change: -10, direction: 'تحسن' },
      },
      effect_size: { effect_size: 0.8, interpretation_ar: 'كبير' },
    };
    const r = ReportGen.generateProgressComparisonReport(comparison);
    expect(r).toContain('قبلي / بعدي');
    expect(r).toContain('90 يوم');
    expect(r).toContain('total_score');
    expect(r).toContain("Cohen's d");
    expect(r).toContain('كبير');
  });

  it('handles no changes', () => {
    const r = ReportGen.generateProgressComparisonReport({ days_between: 30 });
    expect(r).toContain('قبلي / بعدي');
  });
});
