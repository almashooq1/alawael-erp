/**
 * ModuleKPICard — Shared lightweight KPI card for module dashboards.
 * Previously duplicated inline across 7 dashboard files.
 *
 * Props:
 *   title    – card label (e.g. "إجمالي الجلسات")
 *   value    – numeric or string value
 *   subtitle – optional secondary text
 *   icon     – React element (MUI icon)
 *   color    – MUI palette key (e.g. "primary", "success")
 */

import React from 'react';

const ModuleKPICard = React.memo(({ title, value, subtitle, icon, color }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      height: '100%',
      transition: 'all 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.lighter`, color: `${color}.main`, width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
));

ModuleKPICard.displayName = 'ModuleKPICard';

export default ModuleKPICard;
