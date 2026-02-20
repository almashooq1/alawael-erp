import React, { useState, useEffect } from 'react';
import MontessoriLogin from './MontessoriLogin';
import { Box, Typography, AppBar, Toolbar, IconButton } from '@mui/material';
import MontessoriStudents from './MontessoriStudents';
import MontessoriPlans from './MontessoriPlans';
import MontessoriSessions from './MontessoriSessions';
import MontessoriEvaluations from './MontessoriEvaluations';
import MontessoriActivities from './MontessoriActivities';
import MontessoriTeam from './MontessoriTeam';
import MontessoriParents from './MontessoriParents';
import MontessoriReports from './MontessoriReports';
import MontessoriMedia from './MontessoriMedia';
import MontessoriParentPortal from './MontessoriParentPortal';
import MontessoriAnalytics from './MontessoriAnalytics';
import LogoutIcon from '@mui/icons-material/Logout';
import MontessoriNotifications from './MontessoriNotifications';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('montessori_user'));
  } catch {
    return null;
  }
}

export default function MontessoriDashboard() {
  const [user, setUser] = useState(getUser());
  // ...existing code...

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('montessori_token');
    localStorage.removeItem('montessori_user');
    setUser(null);
  };

  if (!user) return <MontessoriLogin onLogin={setUser} />;

  return (
    <Box>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            نظام منتسوري لتأهيل ذوي الإعاقة
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>{user.name} ({user.role})</Typography>
          <MontessoriNotifications />
          <IconButton color="inherit" onClick={handleLogout} title="تسجيل الخروج">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box p={3}>
        <Typography variant="h5" mb={2}>مرحباً {user.name}!</Typography>
        {/* لوحة تحكم المدير/المعلم/الأخصائي: إدارة الطلاب */}
        {(user.role === 'مدير' || user.role === 'معلم' || user.role === 'أخصائي') && <>
          <MontessoriAnalytics />
          <MontessoriStudents />
          <Box mt={4}>
            <MontessoriPlans />
          </Box>
          <Box mt={4}>
            <MontessoriSessions />
          </Box>
          <Box mt={4}>
            <MontessoriEvaluations />
          </Box>
          <Box mt={4}>
            <MontessoriActivities />
          </Box>
          <Box mt={4}>
            <MontessoriTeam />
          </Box>
          <Box mt={4}>
            <MontessoriParents />
          </Box>
          <Box mt={4}>
            <MontessoriReports />
          </Box>
          <Box mt={4}>
            <MontessoriMedia />
          </Box>
        </>}
        {/* لوحة ولي الأمر */}
        {user.role === 'ولي أمر' && <MontessoriParentPortal />}
      </Box>
    </Box>
  );
}
