/**
 * Dashboard Footer — status bar with connection, data source, session info
 * تذييل لوحة التحكم — شريط الحالة مع الاتصال ومصدر البيانات ومعلومات الجلسة
 */

import {
  Box,
  Chip,
  Typography,
  useTheme
} from '@mui/material';
import { brandColors, statusColors } from '../../theme/palette';

export default function DashboardFooter({
  socketConnected,
  isOnline,
  lastUpdated,
  relativeTime,
  dataSource,
  sessionDuration,
}) {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.5 }}
    >
      <Box
        sx={{
          mt: 5,
          pt: 3,
          pb: 2,
          borderTop: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: { xs: 1.5, sm: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: socketConnected ? brandColors.accentGreen : (!isOnline ? statusColors.error : statusColors.warning),
              boxShadow: socketConnected
                ? '0 0 8px rgba(67,233,123,0.4)'
                : '0 0 8px rgba(255,152,0,0.4)',
              animation: 'pulse-live 2s infinite',
              '@keyframes pulse-live': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
            {!isOnline
              ? 'غير متصل بالإنترنت — وضع عدم الاتصال'
              : socketConnected
              ? 'متصل مباشرة — جميع الأنظمة تعمل بشكل طبيعي'
              : 'جميع الأنظمة تعمل — الاتصال المباشر غير نشط'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          {lastUpdated && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              آخر تحديث: {relativeTime || lastUpdated.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
          <Chip
            size="small"
            variant="outlined"
            label={
              dataSource === 'socket' ? 'مباشر'
              : dataSource === 'cache' ? 'ذاكرة مؤقتة'
              : 'من الخادم'
            }
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 700,
              borderColor:
                dataSource === 'socket' ? 'rgba(67,233,123,0.3)'
                : dataSource === 'cache' ? 'rgba(255,152,0,0.3)'
                : 'rgba(102,126,234,0.2)',
              color:
                dataSource === 'socket' ? brandColors.accentGreen
                : dataSource === 'cache' ? statusColors.warning
                : 'text.disabled',
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontStyle: 'italic' }}>
            لوحة التحكم التنفيذية — نظام الأوائل v3.0
          </Typography>
          {sessionDuration && (
            <Chip
              size="small"
              variant="outlined"
              label={`مدة الجلسة: ${sessionDuration}`}
              sx={{
                height: 20,
                fontSize: '0.58rem',
                fontWeight: 600,
                borderColor: 'rgba(102,126,234,0.15)',
                color: 'text.disabled',
              }}
            />
          )}
        </Box>
      </Box>
    </motion.div>
  );
}
