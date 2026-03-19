import React from 'react';
import { Card, CardContent, Typography, Stack } from '@mui/material';

/**
 * CaseSearch
 * الوصف: واجهة البحث المتقدم عن الحالات
 */
function CaseSearch({ _onSearch }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>🔍 البحث المتقدم</Typography>
        <Stack spacing={2}>
          {/* سيتم تطويره */}
          <Typography variant="body2" color="textSecondary">
            ميزات البحث المتقدم قيد التطوير
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CaseSearch;
