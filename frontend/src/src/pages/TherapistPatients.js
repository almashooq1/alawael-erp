import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  ViewList as ViewListIcon,
  ViewAgenda as ViewAgendaIcon,
} from '@mui/icons-material';
import { therapistService } from '../services/therapistService';

const TherapistPatients = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await therapistService.getTherapistPatients('TH001');
        setPatients(data);
        setFilteredPatients(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading patients:', error);
        setLoading(false);
      }
    };
    loadPatients();
  }, []);

  useEffect(() => {
    let filtered = patients;

    if (searchText) {
      filtered = filtered.filter(p => p.name.includes(searchText) || p.id.includes(searchText) || p.phone.includes(searchText));
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    setFilteredPatients(filtered);
  }, [searchText, filterStatus, patients]);

  const handleViewDetails = patient => {
    setSelectedPatient(patient);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedPatient(null);
  };

  const getStatusColor = status => {
    switch (status) {
      case 'نشط':
        return 'success';
      case 'متوقف مؤقتاً':
        return 'warning';
      case 'مكتمل':
        return 'info';
      default:
        return 'default';
    }
  };

  const getProgressColor = progress => {
    if (progress >= 75) return '#4caf50';
    if (progress >= 50) return '#2196f3';
    if (progress >= 25) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل بيانات المرضى...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          👥 إدارة المرضى والطلاب
        </Typography>

        {/* الإحصائيات السريعة */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي المرضى
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                  {patients.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  المرضى النشطون
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {patients.filter(p => p.status === 'نشط').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  بحاجة متابعة
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {patients.filter(p => p.status === 'متوقف مؤقتاً').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  معدل التحسن
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                  {Math.round(patients.reduce((sum, p) => sum + p.progress, 0) / patients.length || 0)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* البحث والفلترة */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="البحث عن مريض..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <ToggleButtonGroup
            value={filterStatus}
            exclusive
            onChange={(e, newStatus) => {
              if (newStatus) setFilterStatus(newStatus);
            }}
            size="small"
          >
            <ToggleButton value="all">الكل</ToggleButton>
            <ToggleButton value="نشط">نشط</ToggleButton>
            <ToggleButton value="متوقف مؤقتاً">متوقف</ToggleButton>
            <ToggleButton value="مكتمل">مكتمل</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => {
              if (newMode) setViewMode(newMode);
            }}
            size="small"
          >
            <ToggleButton value="table">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="grid">
              <ViewAgendaIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Button variant="contained" startIcon={<AddIcon />}>
            مريض جديد
          </Button>
        </Box>
      </Box>

      {/* جدول المرضى */}
      {viewMode === 'table' ? (
        <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التشخيص</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التقدم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPatients.map(patient => (
                  <TableRow key={patient.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 35, height: 35 }}>{patient.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {patient.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#999' }}>
                            {patient.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.diagnosis}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={patient.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#f0f0f0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getProgressColor(patient.progress),
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 35 }}>
                          {patient.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={patient.status} color={getStatusColor(patient.status)} size="small" />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handleViewDetails(patient)}>
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        /* عرض الشبكة */
        <Grid container spacing={2}>
          {filteredPatients.map(patient => (
            <Grid item xs={12} sm={6} md={4} key={patient.id}>
              <Card sx={{ borderRadius: 2, boxShadow: 3, cursor: 'pointer' }}>
                <CardContent>
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 60,
                        height: 60,
                        margin: '0 auto',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '1.5rem',
                      }}
                    >
                      {patient.name.charAt(0)}
                    </Avatar>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, textAlign: 'center' }}>
                    {patient.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', display: 'block', textAlign: 'center', mb: 1 }}>
                    {patient.id}
                  </Typography>

                  <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {patient.diagnosis}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      التقدم
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={patient.progress}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        mt: 0.5,
                        backgroundColor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getProgressColor(patient.progress),
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                      {patient.progress}%
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip label={patient.status} color={getStatusColor(patient.status)} size="small" fullWidth />
                  </Box>

                  <Button variant="contained" fullWidth size="small" onClick={() => handleViewDetails(patient)}>
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog تفاصيل المريض */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        {selectedPatient && (
          <>
            <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>بيانات المريض: {selectedPatient.name}</DialogTitle>
            <DialogContent sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      margin: '0 auto',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '2rem',
                    }}
                  >
                    {selectedPatient.name.charAt(0)}
                  </Avatar>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PhoneIcon sx={{ color: '#2196f3' }} />
                    <Typography>{selectedPatient.phone}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <EmailIcon sx={{ color: '#2196f3' }} />
                    <Typography>{selectedPatient.email}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon sx={{ color: '#2196f3' }} />
                    <Typography>{selectedPatient.address}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sx={{ borderTop: '1px solid #eee', pt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    معلومات طبية:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>التشخيص:</strong> {selectedPatient.diagnosis}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>تاريخ البداية:</strong> {selectedPatient.startDate}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>عدد الجلسات:</strong> {selectedPatient.sessionCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>معدل التحسن:</strong> {selectedPatient.progress}%
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDetails}>إغلاق</Button>
              <Button variant="contained">تحديث البيانات</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default TherapistPatients;
