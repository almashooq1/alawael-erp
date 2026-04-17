/**
 * TransportManagement — placeholder.
 *
 * Original file (2223 lines) lost 470+ imports during a prior refactor
 * (MUI components, recharts, and icon components were all stripped but
 * the JSX still references them). Broke the whole CI build.
 *
 * Archived as _TransportManagement.broken.js; this stub keeps the
 * /fleet/transport + /transport-management routes mounted and informs
 * users the module is under reconstruction.
 */

import { Box, Container, Paper, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function TransportManagement() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }} dir="rtl">
      <Paper sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
        <Box sx={{ fontSize: 64, mb: 2 }}>🚌</Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          نظام إدارة النقل والمواصلات
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          هذه الصفحة قيد إعادة البناء. ستعود قريباً بواجهة محدّثة وأداء أفضل.
        </Typography>
        <Button component={Link} to="/dashboard" variant="contained">
          العودة للوحة التحكم
        </Button>
      </Paper>
    </Container>
  );
}
