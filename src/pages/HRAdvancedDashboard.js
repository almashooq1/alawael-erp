import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import axios from 'axios';

const HRAdvancedDashboard = () => {
  const [tabInfo, setTabInfo] = useState({ value: 0 }); // 0: Attendance, 1: Payroll, 2: Performance
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    if (tabInfo.value === 0) loadAttendance();
    if (tabInfo.value === 1) loadPayroll();
    if (tabInfo.value === 2) loadLeaves(); // Using "Leaves" for the third tab temporarily or merge
  }, [tabInfo]);

  const loadAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get(`/api/hr-system/attendance?date=${today}`);
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPayroll = async () => {
    try {
      const res = await axios.get('/api/hr-system/payroll?month=1&year=2026'); // Mock query
      setPayroll(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLeaves = async () => {
    try {
      const res = await axios.get('/api/hr-system/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    try {
      // Mock employee ID usage, in real app assumes auth token handles it
      await axios.post('/api/hr-system/attendance/checkin', {
        location: { lat: 0, lng: 0 },
      });
      loadAttendance();
    } catch (error) {
      alert('Check-in failed');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Advanced HR System
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabInfo.value} onChange={(e, val) => setTabInfo({ value: val })}>
          <Tab label="Attendance & Leaves" />
          <Tab label="Payroll" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      {/* Tab 0: Attendance */}
      {tabInfo.value === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box mb={2}>
              <Button variant="contained" color="success" onClick={handleCheckIn} sx={{ mr: 2 }}>
                Check In
              </Button>
              <Button variant="outlined" color="error">
                Check Out
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Time In</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map(row => (
                    <TableRow key={row._id}>
                      <TableCell>
                        {row.employeeId?.firstName} {row.employeeId?.lastName}
                      </TableCell>
                      <TableCell>{new Date(row.checkIn).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Chip label={row.status} color="primary" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Leave Requests</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.map(l => (
                    <TableRow key={l._id}>
                      <TableCell>{l.employeeId?.firstName}</TableCell>
                      <TableCell>{l.type}</TableCell>
                      <TableCell>
                        {l.startDate} - {l.endDate}
                      </TableCell>
                      <TableCell>{l.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Payroll */}
      {tabInfo.value === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Month</TableCell>
                <TableCell>Gross</TableCell>
                <TableCell>Net</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payroll.map(p => (
                <TableRow key={p._id}>
                  <TableCell>
                    {p.employeeId?.firstName} {p.employeeId?.lastName}
                  </TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell>{p.totalGross}</TableCell>
                  <TableCell>{p.totalNet}</TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
              {payroll.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No Records</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Performance */}
      {tabInfo.value === 2 && (
        <Box>
          <Typography>Performance Reviews Module (Placeholder)</Typography>
          <Button variant="contained">Create New review</Button>
        </Box>
      )}
    </Container>
  );
};

export default HRAdvancedDashboard;
