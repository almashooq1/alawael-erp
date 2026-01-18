// Programs List Page - ProgramsList.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ProgramsList = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, [searchTerm]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/programs', {
        params: {
          search: searchTerm,
          per_page: 100
        }
      });
      setPrograms(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/programs/${selectedProgram.id}`);
      setPrograms(programs.filter(p => p.id !== selectedProgram.id));
      setOpenDelete(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleMenuOpen = (e, program) => {
    setSelectedProgram(program);
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h2>البرامج التأهيلية</h2>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/programs/new')}
        >
          برنامج جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="البحث عن البرامج..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        size="small"
      />

      {/* Programs Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {programs.length > 0 ? (
            programs.map((program) => (
              <Grid item xs={12} sm={6} md={4} key={program.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {program.program_name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, program)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={program.program_type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {program.description}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      المدة: {program.duration_weeks} أسبوع
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      البداية: {new Date(program.start_date).toLocaleDateString('ar-EG')}
                    </Typography>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(`/programs/${program.id}`)}
                    >
                      عرض التفاصيل
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  لا توجد برامج
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/programs/${selectedProgram?.id}`);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem
          onClick={() => {
            setOpenDelete(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف هذا البرنامج؟
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>إلغاء</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProgramsList;
