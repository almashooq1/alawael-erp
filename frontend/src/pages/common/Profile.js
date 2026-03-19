import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Avatar,
  Chip,
  Divider,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Save as SaveIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';
import apiClient from 'services/api.client';
import { gradients } from 'theme/palette';

function Profile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/employee-portal/profile');
        const data = res?.data || res;
        setProfile(data);
        setForm({ name: data?.name || '', phone: data?.phone || '', email: data?.email || '' });
      } catch {
        // Use auth context as fallback
        if (currentUser) {
          setProfile(currentUser);
          setForm({
            name: currentUser.name || '',
            phone: currentUser.phone || '',
            email: currentUser.email || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleSave = async () => {
    try {
      await apiClient.put('/employee-portal/profile', form);
      setProfile(prev => ({ ...prev, ...form }));
      setEditing(false);
    } catch {
      // silent
    }
  };

  const user = profile || currentUser || {};

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.accent, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الملف الشخصي
            </Typography>
            <Typography variant="body2">عرض وتعديل بيانات حسابك الشخصي</Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: '#1976d2', fontSize: 32 }}>
            {user.name?.[0] || <PersonIcon />}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {user.name || 'المستخدم'}
            </Typography>
            <Typography color="text.secondary">
              {user.role || user.position || ''} {user.department ? `— ${user.department}` : ''}
            </Typography>
            {user.empId && (
              <Chip label={`رقم الموظف: ${user.empId}`} size="small" sx={{ mt: 0.5 }} />
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {editing ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الجوال"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                حفظ
              </Button>
              <Button sx={{ ml: 1 }} onClick={() => setEditing(false)}>
                إلغاء
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {[
              { label: 'البريد الإلكتروني', val: user.email },
              { label: 'رقم الجوال', val: user.phone },
              { label: 'تاريخ الانضمام', val: user.joinDate || user.createdAt?.slice(0, 10) },
              { label: 'الدور', val: user.role },
            ]
              .filter(f => f.val)
              .map((f, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Typography variant="body2" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography fontWeight="bold">{f.val}</Typography>
                </Grid>
              ))}
            <Grid item xs={12}>
              <Button variant="outlined" onClick={() => setEditing(true)} sx={{ mt: 1 }}>
                تعديل الملف الشخصي
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
}

export default Profile;
