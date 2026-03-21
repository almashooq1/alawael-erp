/**
 * StatCards — Session statistics cards with gradient backgrounds
 * Updated with 6 cards matching backend stat keys
 */

import { gradients } from '../../theme/palette';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Typography
} from '@mui/material';
import Assignment from '@mui/icons-material/Assignment';
import Schedule from '@mui/icons-material/Schedule';
import ThumbUp from '@mui/icons-material/ThumbUp';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';

const STAT_DEFS = [
  { key: 'total',     label: 'إجمالي الجلسات',   icon: <Assignment fontSize="large" />,  gradient: gradients.primary },
  { key: 'scheduled', label: 'مجدولة',             icon: <Schedule fontSize="large" />,    gradient: gradients.info },
  { key: 'confirmed', label: 'مؤكدة',              icon: <ThumbUp fontSize="large" />,     gradient: gradients.info },
  { key: 'completed', label: 'مكتملة',             icon: <CheckCircle fontSize="large" />, gradient: gradients.success },
  { key: 'cancelled', label: 'ملغاة',              icon: <Cancel fontSize="large" />,      gradient: gradients.warning },
  { key: 'noShow',    label: 'لم يحضر',            icon: <PersonOff fontSize="large" />,   gradient: gradients.warning },
];

const StatCards = ({ stats, loading }) => (
  <Grid container spacing={3} sx={{ mb: 4 }}>
    {STAT_DEFS.map((s, i) => (
      <Grid item xs={6} sm={4} md={2} key={s.key}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card sx={{ background: s.gradient, color: '#fff', borderRadius: 3 }} elevation={3}>
            <CardContent sx={{ px: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>{s.label}</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {loading ? <Skeleton width={40} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : (stats[s.key] ?? 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>
                  {s.icon}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>
    ))}
  </Grid>
);

export default StatCards;
