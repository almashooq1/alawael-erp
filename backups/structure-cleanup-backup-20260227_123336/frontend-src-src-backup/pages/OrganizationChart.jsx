import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tab,
  Tabs,
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const OrganizationChart = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [organizationData, setOrganizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employees, setEmployees] = useState({});

  useEffect(() => {
    fetchOrganizationData();
    loadEmployees();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/organization/structure');
      setOrganizationData(response.data.data);
      setError(null);
    } catch (err) {
      setError('فشل تحميل البيانات التنظيمية');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = () => {
    const savedEmployees = localStorage.getItem('organizationEmployees');
    if (savedEmployees) {
      setEmployees(JSON.parse(savedEmployees));
    }
  };

  const saveEmployee = () => {
    if (!employeeName.trim()) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }

    const key = `${selectedPosition.id}_${Date.now()}`;
    const newEmployees = {
      ...employees,
      [key]: {
        id: key,
        positionId: selectedPosition.id,
        name: employeeName,
        position: selectedPosition.title,
        createdAt: new Date().toISOString(),
      },
    };

    setEmployees(newEmployees);
    localStorage.setItem('organizationEmployees', JSON.stringify(newEmployees));
    setOpenDialog(false);
    setEmployeeName('');
    setSelectedPosition(null);
  };

  const deleteEmployee = employeeId => {
    const newEmployees = { ...employees };
    delete newEmployees[employeeId];
    setEmployees(newEmployees);
    localStorage.setItem('organizationEmployees', JSON.stringify(newEmployees));
  };

  const openAddEmployeeDialog = position => {
    setSelectedPosition(position);
    setEmployeeName('');
    setOpenDialog(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1976d2' }}>
        🏢 الهيكل التنظيمي المتكامل
      </Typography>

      {/* CEO Section */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {organizationData?.chairman?.title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                الاسم: {organizationData?.chairman?.nameEnglish}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">الفرع: {organizationData?.chairman?.branch}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="organization tabs">
          <Tab label="🏛️ الأقسام الرئيسية" />
          <Tab label="🌳 الفروع (4 فروع)" />
        </Tabs>
      </Box>

      {/* Main Departments Tab */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3}>
            {organizationData?.departments?.map(dept => (
              <Grid item xs={12} md={6} key={dept.id}>
                <Card sx={{ height: '100%', boxShadow: 3, border: '2px solid #e0e0e0' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                      {dept.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                      {dept.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                      <strong>المدير:</strong> {dept.manager}
                    </Typography>

                    {/* Sections */}
                    {dept.sections && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                          الأقسام الفرعية:
                        </Typography>
                        {dept.sections.map(section => (
                          <Box
                            key={section.id}
                            sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              • {section.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: '#999', display: 'block', mb: 1 }}
                            >
                              {section.description}
                            </Typography>
                            {section.positions && (
                              <Box sx={{ ml: 2 }}>
                                {section.positions.map(pos => (
                                  <Box key={pos.title} sx={{ mb: 1, p: 0.5 }}>
                                    <Chip
                                      label={`${pos.title} (${pos.count || 1})`}
                                      size="small"
                                      sx={{ mr: 1, mb: 0.5 }}
                                    />
                                    <Button
                                      size="small"
                                      startIcon={<AddIcon />}
                                      onClick={() => openAddEmployeeDialog(pos)}
                                      sx={{ ml: 1 }}
                                    >
                                      إضافة موظف
                                    </Button>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Branches Tab */}
      {activeTab === 1 && (
        <Box>
          <Grid container spacing={3}>
            {organizationData?.branches?.map(branch => (
              <Grid item xs={12} key={branch.id}>
                <Card sx={{ boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1, color: '#c41c3b', fontWeight: 'bold' }}>
                      {branch.nameArabic}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                      📍 الموقع: {branch.location}
                    </Typography>

                    {/* Branch Departments */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {branch.departments?.map(dept => (
                        <Grid item xs={12} md={6} key={dept.id}>
                          <Paper sx={{ p: 2, bgcolor: '#fafafa', border: '1px solid #ddd' }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}
                            >
                              {dept.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                              {dept.description}
                            </Typography>

                            {/* Responsibilities */}
                            {dept.responsibilities && (
                              <Box sx={{ mb: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}
                                >
                                  المسؤوليات:
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '12px' }}>
                                  {dept.responsibilities.map((resp, idx) => (
                                    <li key={idx}>{resp}</li>
                                  ))}
                                </ul>
                              </Box>
                            )}

                            {/* Positions */}
                            {dept.positions && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}
                                >
                                  الوظائف:
                                </Typography>
                                {dept.positions.map(pos => (
                                  <Box key={pos.title} sx={{ mb: 1 }}>
                                    <Chip label={pos.title} size="small" sx={{ mr: 1, mb: 0.5 }} />
                                    <Button
                                      size="small"
                                      startIcon={<AddIcon />}
                                      onClick={() => openAddEmployeeDialog(pos)}
                                      sx={{ fontSize: '11px' }}
                                    >
                                      إضافة
                                    </Button>
                                    {/* Employee Table */}
                                    <EmployeesList
                                      employees={Object.values(employees).filter(
                                        e => e.positionId === pos.title
                                      )}
                                      onDelete={deleteEmployee}
                                    />
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            إضافة موظف جديد
          </Typography>
          {selectedPosition && (
            <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
              الوظيفة: <strong>{selectedPosition.title}</strong>
            </Typography>
          )}
          <TextField
            fullWidth
            label="اسم الموظف"
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            placeholder="أدخل اسم الموظف"
            sx={{ mb: 3 }}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => setOpenDialog(false)}>
              إلغاء
            </Button>
            <Button variant="contained" onClick={saveEmployee}>
              حفظ
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

// Employee List Component
const EmployeesList = ({ employees, onDelete }) => {
  if (employees.length === 0) return null;

  return (
    <Table size="small" sx={{ mt: 1, mb: 1 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: '#f0f0f0' }}>
          <TableCell sx={{ fontSize: '11px', fontWeight: 'bold' }}>الاسم</TableCell>
          <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
            الإجراءات
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {employees.map(emp => (
          <TableRow key={emp.id}>
            <TableCell sx={{ fontSize: '11px' }}>{emp.name}</TableCell>
            <TableCell align="center">
              <Tooltip title="حذف">
                <IconButton size="small" onClick={() => onDelete(emp.id)} sx={{ color: 'red' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OrganizationChart;
