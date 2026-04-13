/**
 * DisabilityAssessmentTests – shared constants & helpers
 */
import {
  Groups as GroupsIcon,
  AccessibilityNew as AccessibilityIcon,
  Psychology as PsychologyIcon,
  Translate as TranslateIcon,
  TouchApp as TouchAppIcon,
} from '@mui/icons-material';
import { Box } from '@mui/material';
import { assessmentColors } from '../../theme/palette';

/* ─── Icon map ─── */
export const TEST_ICONS = {
  Groups: <GroupsIcon />,
  AccessibilityNew: <AccessibilityIcon />,
  Psychology: <PsychologyIcon />,
  Translate: <TranslateIcon />,
  TouchApp: <TouchAppIcon />,
};

/* ─── Tab Panel Helper ─── */
export function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null;
}

/* ─── Level color by percentage ─── */
export const getLevelColor = pct => {
  if (pct >= 75) return assessmentColors.normal;
  if (pct >= 50) return assessmentColors.mild;
  if (pct >= 25) return assessmentColors.moderate;
  return assessmentColors.severe;
};
