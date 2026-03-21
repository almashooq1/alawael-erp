import { useState, useEffect, useMemo } from 'react';



import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { getOrgEmployees, setOrgEmployees } from 'utils/storageService';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from 'theme/palette';
import { useConfirmDialog } from 'components/common/ConfirmDialog';

const OrganizationChart = () => {
  const showSnackbar = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [organizationData, setOrganizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employees, setEmployees] = useState({});
  const [confirmState, showConfirm] = useConfirmDialog();

  // Computed stats
  const stats = useMemo(() => {
    const deps = organizationData?.departments?.length || 0;
    const branches = organizationData?.branches?.length || 0;
    const emps = Object.keys(employees).length;
    return { deps, branches, emps };
  }, [organizationData, employees]);

  useEffect(() => {
    fetchOrganizationData();
    loadEmployees();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/organization/structure');
      setOrganizationData(data.data);
      setError(null);
    } catch (err) {
      setError('فشل تحميل البيانات التنظيمية');
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = () => {
    const savedEmployees = getOrgEmployees();
    if (savedEmployees) {
      setEmployees(JSON.parse(savedEmployees));
    }
  };

  const saveEmployee = () => {
    if (!employeeName.trim()) {
      showSnackbar('يرجى إدخال اسم الموظف', 'warning');
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
        createdAt: new Date().toISOString()
      }
    };

    setEmployees(newEmployees);
    setOrgEmployees(newEmployees);
    setOpenDialog(false);
    setEmployeeName('');
    setSelectedPosition(null);
  };

  const deleteEmployee = (employeeId) => {
    showConfirm({
      title: 'حذف الموظف',
      message: 'هل تريد حذف هذا الموظف من الهيكل التنظيمي؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: () => {
        const newEmployees = { ...employees };
        delete newEmployees[employeeId];
        setEmployees(newEmployees);
        setOrgEmployees(newEmployees);
        showSnackbar('تم حذف الموظف', 'success');
      },
    });
  };

  const openAddEmployeeDialog = (position) => {
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
      {/* Gradient Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.info, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
            <TreeIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>الهيكل التنظيمي المتكامل</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>عرض الأقسام والفروع والوظائف</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الأقسام', value: stats.deps, icon: <BusinessIcon />, color: statusColors.primaryBlue },
          { label: 'الفروع', value: stats.branches, icon: <LocationIcon />, color: statusColors.purple },
          { label: 'الموظفين المعيّنين', value: stats.emps, icon: <PeopleIcon />, color: statusColors.successDeep },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${s.color}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}22`, color: s.color }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CEO Section */}
      <Card sx={{ mb: 4, background: gradients.primary, color: 'white' }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {organizationData?.chairman?.title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">الاسم: {organizationData?.chairman?.nameEnglish}</Typography>
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
            {organizationData?.departments?.map((dept) => (
              <Grid item xs={12} md={6} key={dept.id}>
                <Card sx={{ height: '100%', boxShadow: 3, border: `2px solid ${surfaceColors.divider}` }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: statusColors.primaryBlue, fontWeight: 'bold' }}>
                      {dept.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textSecondary }}>
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
                        {dept.sections.map((section) => (
                          <Box key={section.id} sx={{ mb: 2, p: 1, bgcolor: surfaceColors.lightGray, borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              • {section.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: neutralColors.textMuted, display: 'block', mb: 1 }}>
                              {section.description}
                            </Typography>
                            {section.positions && (
                              <Box sx={{ ml: 2 }}>
                                {section.positions.map((pos) => (
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
            {organizationData?.branches?.map((branch) => (
              <Grid item xs={12} key={branch.id}>
                <Card sx={{ boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1, color: statusColors.errorDark, fontWeight: 'bold' }}>
                      {branch.nameArabic}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textSecondary }}>
                      📍 الموقع: {branch.location}
                    </Typography>

                    {/* Branch Departments */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {branch.departments?.map((dept) => (
                        <Grid item xs={12} md={6} key={dept.id}>
                          <Paper sx={{ p: 2, bgcolor: surfaceColors.background, border: `1px solid ${surfaceColors.borderLight}` }}>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: statusColors.primaryBlue }}>
                              {dept.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textSecondary }}>
                              {dept.description}
                            </Typography>

                            {/* Responsibilities */}
                            {dept.responsibilities && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                  المسؤوليات:
                                </Typography>
                                <List dense disablePadding>
                                  {dept.responsibilities.map((resp, idx) => (
                                    <ListItem key={idx} sx={{ py: 0, pl: 1 }}>
                                      <ListItemText primary={resp} primaryTypographyProps={{ variant: 'caption' }} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}

                            {/* Positions */}
                            {dept.positions && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                  الوظائف:
                                </Typography>
                                {dept.positions.map((pos) => (
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
                                      employees={Object.values(employees).filter(e => e.positionId === pos.title)}
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
            <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textSecondary }}>
              الوظيفة: <strong>{selectedPosition.title}</strong>
            </Typography>
          )}
          <TextField
            fullWidth
            label="اسم الموظف"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
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
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

// Employee List Component
const EmployeesList = ({ employees, onDelete }) => {
  if (employees.length === 0) return null;

  return (
    <Table size="small" sx={{ mt: 1, mb: 1 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: surfaceColors.softGray }}>
          <TableCell sx={{ fontSize: '11px', fontWeight: 'bold' }}>الاسم</TableCell>
          <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 'bold' }}>الإجراءات</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell sx={{ fontSize: '11px' }}>{emp.name}</TableCell>
            <TableCell align="center">
              <Tooltip title="حذف">
                <IconButton
                  size="small"
                  onClick={() => onDelete(emp.id)}
                  sx={{ color: 'red' }}
                  aria-label="حذف"
                >
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
