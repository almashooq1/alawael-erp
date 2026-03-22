import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotifIcon,
  CheckCircle as DoneIcon,
  Info as InfoIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import apiClient from 'services/api.client';
import { gradients } from 'theme/palette';

const iconMap = {
  success: <DoneIcon color="success" />,
  warning: <WarnIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/admin/overview');
        const data = res?.data || res;
        const items = data?.recentActivity || data?.notifications || [];
        setActivities(Array.isArray(items) ? items : []);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NotifIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              النشاطات
            </Typography>
            <Typography variant="body2">متابعة آخر الأنشطة والإشعارات في النظام</Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : activities.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            لا توجد نشاطات حديثة
          </Typography>
        ) : (
          <List>
            {activities.map((a, i) => (
              <ListItem key={a._id || a.id || i} divider>
                <ListItemIcon>{iconMap[a.type] || <InfoIcon color="action" />}</ListItemIcon>
                <ListItemText
                  primary={a.title || a.message || a.description}
                  secondary={
                    a.timestamp ? new Date(a.timestamp).toLocaleString('ar-SA') : a.user || ''
                  }
                />
                {a.type && <Chip label={a.type} size="small" variant="outlined" />}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}

export default Activity;
