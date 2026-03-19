/**
 * departmentColors.js — Unified department color mapping
 * Superset of all department colors used across the application.
 * Single source of truth — imported by pages & components.
 */
import { statusColors, neutralColors } from 'theme/palette';

export const DEPT_COLORS = {
  'تقنية المعلومات': statusColors.primaryBlue,
  'الموارد البشرية': statusColors.purple,
  المالية: statusColors.successDeep,
  التعليم: statusColors.warningDarker,
  'العلاج الطبيعي': statusColors.lightBlue,
  الإدارة: statusColors.errorDark,
  التأهيل: statusColors.lightBlue,
  العمليات: statusColors.limeGreen,
  الخدمات: neutralColors.brown,
  الاستقبال: neutralColors.fallback,
  'العلاج الوظيفي': statusColors.purpleDark,
  'علاج النطق': statusColors.cyanDark,
  'الخدمات المساندة': statusColors.limeGreen,
  التمريض: statusColors.pinkDark,
  الإشراف: statusColors.pinkDark,
  'خدمة العملاء': statusColors.tealDark,
  التسويق: statusColors.pinkDark,
  المستودعات: neutralColors.brownDark,
};

export default DEPT_COLORS;
