/**
 * Student Announcements Page
 * صفحة الإعلانات للطالب
 */

import { useState, useEffect, useCallback } from 'react';

import studentPortalService from 'services/studentPortalService';
import logger from 'utils/logger';
import { gradients, statusColors, neutralColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventIcon from '@mui/icons-material/Event';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import FilterIcon from '@mui/icons-material/Filter';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { CalendarIcon, ViewIcon } from 'utils/iconAliases';

const StudentAnnouncements = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('الكل');
  const [selectedType, setSelectedType] = useState('الكل');
  const [viewMode, setViewMode] = useState('grid');

  const priorities = ['الكل', 'عاجل', 'عالي', 'متوسط', 'منخفض'];
  const types = ['الكل', 'اختبارات', 'فعاليات', 'عام', 'ورش عمل', 'رياضة', 'أكاديمي'];

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const studentId = userId;
      const data = await studentPortalService.getAnnouncements(studentId);
      setAnnouncements(data);
    } catch (error) {
      logger.error('Error loading announcements:', error);
      showSnackbar('خطأ في تحميل الإعلانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      selectedPriority === 'الكل' || announcement.priority === selectedPriority;

    const matchesType = selectedType === 'الكل' || announcement.type === selectedType;

    return matchesSearch && matchesPriority && matchesType;
  });

  const getPriorityColor = priority => {
    switch (priority) {
      case 'عاجل':
        return statusColors.error;
      case 'عالي':
        return statusColors.warning;
      case 'متوسط':
        return statusColors.info;
      case 'منخفض':
        return statusColors.success;
      default:
        return neutralColors.inactive;
    }
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'اختبارات':
        return '📝';
      case 'فعاليات':
        return '🎉';
      case 'ورش عمل':
        return '💡';
      case 'رياضة':
        return '⚽';
      case 'أكاديمي':
        return '🎓';
      default:
        return '📢';
    }
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          جاري التحميل...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          background: gradients.primary,
          borderRadius: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
          <Badge badgeContent={announcements.length} color="error">
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 60, height: 60 }}>
              <NotificationsIcon sx={{ fontSize: 35 }} />
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              الإعلانات المدرسية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              جميع الإعلانات والأخبار المهمة
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {announcements.length}
                  </Typography>
                  <Typography variant="body1">إجمالي الإعلانات</Typography>
                </Box>
                <CampaignIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: gradients.redStatus, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {announcements.filter(a => a.priority === 'عاجل').length}
                  </Typography>
                  <Typography variant="body1">إعلانات عاجلة</Typography>
                </Box>
                <PriorityIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: gradients.greenStatus, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {announcements.filter(a => a.type === 'فعاليات').length}
                  </Typography>
                  <Typography variant="body1">فعاليات قادمة</Typography>
                </Box>
                <EventIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: gradients.orangeStatus, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {announcements.filter(a => a.type === 'اختبارات').length}
                  </Typography>
                  <Typography variant="body1">إعلانات اختبارات</Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="ابحث في الإعلانات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* View Mode */}
          <Grid item xs={12} md={2}>
            <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} fullWidth>
              <ToggleButton value="grid">شبكة</ToggleButton>
              <ToggleButton value="list">قائمة</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Priority Filter */}
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <FilterIcon sx={{ mt: 1, color: 'text.secondary' }} />
              {priorities.map(priority => (
                <Chip
                  key={priority}
                  label={priority}
                  onClick={() => setSelectedPriority(priority)}
                  color={selectedPriority === priority ? 'primary' : 'default'}
                  variant={selectedPriority === priority ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Grid>

          {/* Type Filter */}
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {types.slice(0, 4).map(type => (
                <Chip
                  key={type}
                  label={type}
                  onClick={() => setSelectedType(type)}
                  color={selectedType === type ? 'secondary' : 'default'}
                  variant={selectedType === type ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Announcements Display */}
      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredAnnouncements.map((announcement, index) => (
            <Grid item xs={12} md={6} lg={4} key={announcement.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                  animation: 'fadeIn 0.5s ease-in',
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'scale(0.9)' },
                    to: { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                        <Box component="span" sx={{ fontSize: '1.5rem', mr: 1 }}>
                          {getTypeIcon(announcement.type)}
                        </Box>
                        {announcement.title}
                      </Typography>
                      <Chip
                        label={announcement.priority}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor(announcement.priority),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </Stack>

                    {/* Type and Date */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={announcement.type}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {announcement.date}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Divider />

                    {/* Content */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        minHeight: 60,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {announcement.content}
                    </Typography>

                    {/* Author */}
                    {announcement.author && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {announcement.author}
                        </Typography>
                      </Stack>
                    )}

                    {/* Actions */}
                    <Button
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      fullWidth
                      sx={{
                        borderColor: getPriorityColor(announcement.priority),
                        color: getPriorityColor(announcement.priority),
                        '&:hover': {
                          bgcolor: getPriorityColor(announcement.priority),
                          color: 'white',
                        },
                      }}
                    >
                      قراءة المزيد
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box>
          {filteredAnnouncements.map((announcement, index) => (
            <Accordion
              key={announcement.id}
              sx={{
                mb: 2,
                animation: 'slideIn 0.5s ease-in',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                '@keyframes slideIn': {
                  from: { opacity: 0, transform: 'translateX(-20px)' },
                  to: { opacity: 1, transform: 'translateX(0)' },
                },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                  <Typography variant="h4">{getTypeIcon(announcement.type)}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {announcement.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip label={announcement.type} size="small" variant="outlined" />
                      <Chip
                        label={announcement.priority}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor(announcement.priority),
                          color: 'white',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {announcement.date}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Divider />
                  <Typography variant="body1">{announcement.content}</Typography>
                  {announcement.author && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonIcon sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        المعلن: {announcement.author}
                      </Typography>
                    </Stack>
                  )}
                  {announcement.location && (
                    <Alert severity="info" icon={<InfoIcon />}>
                      الموقع: {announcement.location}
                    </Alert>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {filteredAnnouncements.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          لا توجد إعلانات تطابق معايير البحث. حاول تغيير الفلاتر.
        </Alert>
      )}
    </Box>
  );
};

export default StudentAnnouncements;
