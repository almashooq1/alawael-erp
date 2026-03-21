

import { useNavigate } from 'react-router-dom';
import { statusColors } from 'theme/palette';
import {
  Avatar,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import People from '@mui/icons-material/People';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Assessment from '@mui/icons-material/Assessment';
import School from '@mui/icons-material/School';

const QUICK_ACTIONS = [
  { title: 'تسجيل مستفيد', icon: <People />, color: statusColors.info, path: '/student-registration' },
  { title: 'جدولة جلسة', icon: <CalendarToday />, color: statusColors.success, path: '/sessions' },
  { title: 'إنشاء تقرير', icon: <Assessment />, color: statusColors.warning, path: '/reports' },
  { title: 'إدارة الموظفين', icon: <School />, color: statusColors.purple, path: '/hr' },
];

/** 4-tile quick action panel */
const QuickActionsPanel = () => {
  const navigate = useNavigate();

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          إجراءات سريعة
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {QUICK_ACTIONS.map((action, index) => (
            <Grid item xs={6} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: '2px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: action.color,
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => navigate(action.path)}
              >
                <Avatar
                  sx={{
                    bgcolor: action.color,
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography variant="body2" fontWeight="medium">
                  {action.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;
