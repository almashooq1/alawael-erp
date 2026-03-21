/**
 * EmptyState — Displays a friendly message when a dashboard section has no data.
 *
 * Props:
 *   icon      – React element (MUI icon) shown above the message
 *   title     – primary text  (default: "لا توجد بيانات")
 *   subtitle  – secondary text (default: "سيتم عرض البيانات هنا عند توفرها")
 *   height    – container min-height (default: 200)
 */

import React from 'react';

const EmptyState = React.memo(({
  icon,
  title = 'لا توجد بيانات',
  subtitle = 'سيتم عرض البيانات هنا عند توفرها',
  height = 200,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: height,
      py: 4,
      textAlign: 'center',
      color: 'text.secondary',
    }}
  >
    <Box sx={{ fontSize: 56, mb: 1.5, opacity: 0.35 }}>
      {icon || <InboxIcon sx={{ fontSize: 56 }} />}
    </Box>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.disabled">
      {subtitle}
    </Typography>
  </Box>
));

EmptyState.displayName = 'EmptyState';

export default EmptyState;
