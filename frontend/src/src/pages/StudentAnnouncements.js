/**
 * Student Announcements Page
 * صفحة الإعلانات للطالب
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Stack,
  Avatar,
  Paper,
  Alert,
  LinearProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  PriorityHigh as PriorityIcon,
  Info as InfoIcon,
  Event as EventIcon,
  School as SchoolIcon,
  Campaign as CampaignIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import studentPortalService from '../services/studentPortalService';

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('الكل');
  const [selectedType, setSelectedType] = useState('الكل');
  const [viewMode, setViewMode] = useState('grid');

  const priorities = ['الكل', 'عاجل', 'عالي', 'متوسط', 'منخفض'];
  const types = ['الكل', 'اختبارات', 'فعاليات', 'عام', 'ورش عمل', 'رياضة', 'أكاديمي'];

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001';
      const data = await studentPortalService.getAnnouncements(studentId);
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = selectedPriority === 'الكل' || announcement.priority === selectedPriority;

    const matchesType = selectedType === 'الكل' || announcement.type === selectedType;

    return matchesSearch && matchesPriority && matchesType;
  });

  const getPriorityColor = priority => {
    switch (priority) {
      case 'عاجل':
        return '#F44336';
      case 'عالي':
        return '#FF9800';
      case 'متوسط':
        return '#2196F3';
      case 'منخفض':
        return '#4CAF50';
      default:
        return '#9E9E9E';
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
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
          <Card sx={{ background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)', color: 'white' }}>
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
          <Card sx={{ background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)', color: 'white' }}>
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
          <Card sx={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', color: 'white' }}>
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
                        <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>{getTypeIcon(announcement.type)}</span>
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
                      <Chip label={announcement.type} size="small" variant="outlined" color="primary" />
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
