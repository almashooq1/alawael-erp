import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Group as GroupIcon, Person as PersonIcon } from '@mui/icons-material';
import groupsService from 'services/groupsService';

function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await groupsService.getById(id);
        setGroup(res?.data || res);
      } catch {
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!group) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">لم يتم العثور على المجموعة</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
            <GroupIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {group.name}
            </Typography>
            {group.type && <Chip label={group.type} size="small" color="primary" />}
          </Box>
        </Box>
        {group.description && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {group.description}
          </Typography>
        )}
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {group.members?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أعضاء
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  تاريخ الإنشاء
                </Typography>
                <Typography fontWeight="bold">
                  {group.createdAt ? new Date(group.createdAt).toLocaleDateString('ar-SA') : '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  الحالة
                </Typography>
                <Chip
                  label={group.status || 'نشط'}
                  color={group.status === 'inactive' ? 'default' : 'success'}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {group.members && group.members.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              الأعضاء
            </Typography>
            <List>
              {group.members.map((m, i) => (
                <ListItem key={i} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#42a5f5' }}>
                      {(m.name || m.userId?.name || '')[0] || <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.name || m.userId?.name || `عضو ${i + 1}`}
                    secondary={m.role || m.email || ''}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default GroupDetail;
