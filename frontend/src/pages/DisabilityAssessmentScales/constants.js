import {
  DirectionsRun as DirectionsRunIcon,
  Home as HomeIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  Psychology as PsychologyIcon,
  Favorite as FavoriteIcon,
  Visibility as VisibilityIcon,
  Lightbulb as LightbulbIcon,
  AccountTree as AccountTreeIcon,
  LocalHospital as LocalHospitalIcon,
  ChildCare as ChildCareIcon,
  School as SchoolIcon,
  Devices as DevicesIcon,
  VolunteerActivism as VolunteerActivismIcon,
  Groups as GroupsIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Build as BuildIcon,
  Accessibility as AccessibilityIcon,
  SentimentVerySatisfied as SentimentIcon,
} from '@mui/icons-material';
import { Box } from '@mui/material';

/* ─────────────── Icon Map ─────────────── */

export const SCALE_ICONS = {
  DirectionsRun: <DirectionsRunIcon />,
  Home: <HomeIcon />,
  RecordVoiceOver: <RecordVoiceOverIcon />,
  Psychology: <PsychologyIcon />,
  Favorite: <FavoriteIcon />,
  Visibility: <VisibilityIcon />,
  Lightbulb: <LightbulbIcon />,
  AccountTree: <AccountTreeIcon />,
  LocalHospital: <LocalHospitalIcon />,
  ChildCare: <ChildCareIcon />,
  School: <SchoolIcon />,
  Devices: <DevicesIcon />,
  VolunteerActivism: <VolunteerActivismIcon />,
  Groups: <GroupsIcon />,
  EmojiEmotions: <EmojiEmotionsIcon />,
  People: <PeopleIcon />,
  Work: <WorkIcon />,
  FamilyRestroom: <FamilyRestroomIcon />,
  Build: <BuildIcon />,
  Accessibility: <AccessibilityIcon />,
  SentimentVerySatisfied: <SentimentIcon />,
};

/* ─────────────── Tab Panel ─────────────── */

export function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null;
}
