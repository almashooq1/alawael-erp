/**
 * ثوابت ومكونات مُنسّقة لصفحة إدارة المستفيدين
 * Constants & styled components for Beneficiaries page
 */

import { Card } from '@mui/material';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { gradients, statusColors, neutralColors } from 'theme/palette';

export const PAGE_SIZE = 9;

export const STATUS_LABELS = { active: 'نشط', pending: 'انتظار', inactive: 'غير نشط' };
export const STATUS_COLORS = {
  active: statusColors.success,
  pending: statusColors.warning,
  inactive: statusColors.error,
};
export const CATEGORY_LABELS = {
  physical: 'حركية',
  mental: 'ذهنية',
  sensory: 'حسية',
  multiple: 'متعددة',
  other: 'أخرى',
};
export const CATEGORY_COLORS = {
  physical: statusColors.info,
  mental: statusColors.pink,
  sensory: statusColors.warning,
  multiple: statusColors.purple,
  other: neutralColors.fallback,
};

export const GradientHeader = styled(Box)(() => ({
  background: gradients.primary,
  borderRadius: '0 0 28px 28px',
  padding: '32px 24px 48px',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
  },
}));

export const KpiCard = styled(Card)(({ gradient }) => ({
  background: gradient,
  color: 'white',
  borderRadius: 16,
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 28px rgba(0,0,0,0.12)' },
}));
