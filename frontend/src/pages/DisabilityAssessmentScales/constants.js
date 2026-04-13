


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
