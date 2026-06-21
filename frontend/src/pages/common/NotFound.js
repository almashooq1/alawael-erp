import { Container, Typography, Paper, Box, Button, Stack } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

// Action-route suffixes whose target form/screen is not built yet.
// Hitting one means a "create / add / upload" button pointed at an
// unimplemented route — show an honest "under development" message
// instead of a bare 404.
const ACTION_SUFFIXES = [
  '/new', '/create', '/add', '/edit', '/upload',
  '/register', '/compose', '/config', '/receive',
];

function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = (location?.pathname || '').replace(/\/$/, '');
  const isAction = ACTION_SUFFIXES.some((s) => path.endsWith(s));

  const title = isAction ? 'قيد التطوير' : '404';
  const heading = isAction ? 'هذه الميزة قيد التطوير' : 'الصفحة غير موجودة';
  const body = isAction
    ? 'هذه الشاشة لم تُفعّل بعد. نعمل على إتاحتها قريباً — يمكنك العودة والمتابعة من القائمة.'
    : 'عذراً، الصفحة التي تبحث عنها غير موجودة.';

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }} dir="rtl">
      <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Typography
          variant="h1"
          sx={{ fontWeight: 800, color: isAction ? 'warning.main' : 'primary.main', fontSize: { xs: 56, sm: 72 } }}
          gutterBottom
        >
          {isAction ? '🛠️' : title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          {heading}
        </Typography>
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography color="text.secondary">{body}</Typography>
          {path ? (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              {path}
            </Typography>
          ) : null}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button variant="outlined" onClick={() => navigate(-1)}>
            رجوع
          </Button>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            لوحة التحكم
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

export default NotFound;
