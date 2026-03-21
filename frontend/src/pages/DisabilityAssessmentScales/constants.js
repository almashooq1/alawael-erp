

/* ─────────────── Icon Map ─────────────── */

import { Box } from '@mui/material';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HomeIcon from '@mui/icons-material/Home';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import SchoolIcon from '@mui/icons-material/School';
import DevicesIcon from '@mui/icons-material/Devices';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import BuildIcon from '@mui/icons-material/Build';
import AccessibilityIcon from '@mui/icons-material/Accessibility';
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
