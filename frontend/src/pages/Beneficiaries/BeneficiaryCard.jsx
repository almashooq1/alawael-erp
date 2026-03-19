/**
 * بطاقة المستفيد — عرض شبكي و قائمة
 * Beneficiary Card — grid & list view mode
 */

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Stack,
  Tooltip,
  LinearProgress,
  Fade,
} from '@mui/material';
import {
  Edit,
  Visibility,
  Star,
  StarBorder,
  CalendarMonth,
} from '@mui/icons-material';
import { statusColors, neutralColors } from 'theme/palette';
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_COLORS,
} from './beneficiariesConstants';

const BeneficiaryCard = ({
  beneficiary,
  viewMode,
  onView,
  onEdit,
  onToggleFavorite,
  onNavigateSchedule,
}) => (
  <Fade in timeout={400}>
    <Card elevation={0} sx={{
      borderRadius: 3, height: '100%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      transition: 'all 0.3s',
      display: viewMode === 'list' ? 'flex' : 'block',
      alignItems: viewMode === 'list' ? 'center' : undefined,
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
    }}>
      <CardContent sx={{
        width: '100%',
        display: viewMode === 'list' ? 'flex' : 'block',
        alignItems: viewMode === 'list' ? 'center' : undefined,
        gap: viewMode === 'list' ? 3 : 0,
      }}>
        {/* Avatar + Name */}
        <Box display="flex" justifyContent="space-between" alignItems="start"
          mb={viewMode === 'list' ? 0 : 2}
          sx={{ minWidth: viewMode === 'list' ? 260 : undefined }}>
          <Box display="flex" gap={2}>
            <Avatar sx={{
              width: 52, height: 52,
              bgcolor: CATEGORY_COLORS[beneficiary.category] || neutralColors.fallback,
              fontWeight: 'bold',
            }}>
              {(beneficiary.name || '?').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {beneficiary.name || 'بدون اسم'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {beneficiary.nameEn || ''}
              </Typography>
              {beneficiary.nationalId && (
                <Box>
                  <Chip label={beneficiary.nationalId} size="small" sx={{ mt: 0.5, fontSize: 11 }} />
                </Box>
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => onToggleFavorite(beneficiary.id || beneficiary._id)}
            aria-label="تبديل المفضلة">
            {beneficiary.favorite ? <Star color="warning" /> : <StarBorder />}
          </IconButton>
        </Box>

        {viewMode === 'grid' && <Divider sx={{ my: 1.5 }} />}

        {/* Details */}
        <Box sx={{ flex: viewMode === 'list' ? 1 : undefined }}>
          <Grid container spacing={1} sx={{ mb: viewMode === 'grid' ? 2 : 0 }}>
            <Grid item xs={viewMode === 'list' ? 'auto' : 6}>
              <Typography variant="caption" color="text.secondary">العمر</Typography>
              <Typography variant="body2" fontWeight="bold">
                {beneficiary.age ? `${beneficiary.age} سنة` : '—'}
              </Typography>
            </Grid>
            <Grid item xs={viewMode === 'list' ? 'auto' : 6}>
              <Typography variant="caption" color="text.secondary">الجلسات</Typography>
              <Typography variant="body2" fontWeight="bold">
                {beneficiary.sessions ?? '—'}
              </Typography>
            </Grid>
            {viewMode === 'grid' && (
              <>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">تاريخ الانضمام</Typography>
                  <Typography variant="body2">{beneficiary.joinDate || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">آخر زيارة</Typography>
                  <Typography variant="body2">{beneficiary.lastVisit || 'لا يوجد'}</Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ minWidth: viewMode === 'list' ? 160 : undefined, mb: viewMode === 'grid' ? 2 : 0 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="caption" color="text.secondary">التقدم</Typography>
            <Typography variant="caption" fontWeight="bold">
              {beneficiary.progress ?? 0}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={beneficiary.progress || 0}
            sx={{
              height: 6, borderRadius: 3, bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: (beneficiary.progress || 0) > 70 ? statusColors.success
                  : (beneficiary.progress || 0) > 40 ? statusColors.warning : statusColors.error,
                borderRadius: 3,
              },
            }} />
        </Box>

        {/* Status Chips */}
        <Stack direction="row" spacing={1}
          sx={{ mb: viewMode === 'grid' ? 2 : 0, minWidth: viewMode === 'list' ? 140 : undefined }}>
          <Chip size="small"
            label={STATUS_LABELS[beneficiary.status] || beneficiary.status || '—'}
            sx={{ bgcolor: STATUS_COLORS[beneficiary.status] || neutralColors.inactive, color: 'white', fontWeight: 'bold' }} />
          <Chip size="small" variant="outlined"
            label={CATEGORY_LABELS[beneficiary.category] || beneficiary.category || '—'} />
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={1}>
          <Tooltip title="عرض الملف"><span>
            <IconButton size="small" onClick={() => onView(beneficiary.id || beneficiary._id)}>
              <Visibility fontSize="small" />
            </IconButton>
          </span></Tooltip>
          <Tooltip title="تعديل"><span>
            <IconButton size="small" color="primary" onClick={() => onEdit(beneficiary.id || beneficiary._id)}>
              <Edit fontSize="small" />
            </IconButton>
          </span></Tooltip>
          <Tooltip title="الجدول"><span>
            <IconButton size="small" onClick={onNavigateSchedule}>
              <CalendarMonth fontSize="small" />
            </IconButton>
          </span></Tooltip>
        </Stack>
      </CardContent>
    </Card>
  </Fade>
);

export default BeneficiaryCard;
