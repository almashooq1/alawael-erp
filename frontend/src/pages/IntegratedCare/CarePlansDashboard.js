import React, { useState } from 'react';
import { Box, Container, Paper, Typography, Button, Tabs, Tab } from '@mui/material';
import {
  School as SchoolIcon,
  Groups as GroupsIcon,
  Add as AddIcon,
  Assignment as PlanIcon,
  EventNote as SessionIcon,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

// ... imports ...

// --- Placeholder Components (Added to fix build errors) ---
const IntegratedCareStats = () => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Typography>Integrated Care Statistics Overview</Typography>
  </Paper>
);
const StudentPlansList = () => (
  <Paper sx={{ p: 2 }}>
    <Typography>List of Student Individual Plans</Typography>
  </Paper>
);
const GroupProgramsList = () => (
  <Paper sx={{ p: 2 }}>
    <Typography>List of Group Programs</Typography>
  </Paper>
);
// --------------------------------------------------------

function CarePlansDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PlanIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            Integrated Care System
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage Educational, Therapeutic, and Life Skills plans in one unified view.
          </Typography>
        </div>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SessionIcon />}
            size="large"
            sx={{ mr: 2 }}
            onClick={() => navigate('/integrated-care/session')}
          >
            Log Session
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="large"
            onClick={() => navigate('/integrated-care/create')}
          >
            New Plan / File
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <IntegratedCareStats />

      {/* Main Content */}
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SchoolIcon />} label="Individual Plans" />
          <Tab icon={<GroupsIcon />} label="Group Programs" />
          <Tab icon={<SessionIcon />} label="Recent Sessions" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <StudentPlansList />}
          {activeTab === 1 && <GroupProgramsList />}
          {activeTab === 2 && (
            <Typography variant="h6" align="center" color="text.secondary">
              Recent Sessions Log (Coming Soon)
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default CarePlansDashboard;
