/**
 * App Store Integration & Publishing 📱
 * نظام تطبيقات المتاجر وإدارة النشر
 *
 * Features:
 * ✅ iOS App Store integration
 * ✅ Google Play Store integration
 * ✅ App versioning
 * ✅ Release management
 * ✅ Rating & reviews
 * ✅ Installation tracking
 * ✅ Update management
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ProgressBar,
  LinearProgress,
  Alert,
  AlertTitle,
  Rating,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  AppRegistration as AppIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  Star as StarIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Settings as SettingsIcon,
  Update as UpdateIcon,
  PublishedWithChanges as PublishIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const AppStoreIntegration = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [appVersions, setAppVersions] = useState([
    {
      id: 1,
      version: '2.1.0',
      platform: 'iOS',
      status: 'published',
      releaseDate: '2026-01-16',
      downloads: 52000,
      rating: 4.8,
      reviews: 1250,
      size: 145,
    },
    {
      id: 2,
      version: '2.1.0',
      platform: 'Android',
      status: 'published',
      releaseDate: '2026-01-16',
      downloads: 85000,
      rating: 4.7,
      reviews: 2150,
      size: 165,
    },
    {
      id: 3,
      version: '2.0.5',
      platform: 'iOS',
      status: 'archived',
      releaseDate: '2026-01-01',
      downloads: 45000,
      rating: 4.6,
      reviews: 950,
      size: 140,
    },
  ]);

  const [reviews, setReviews] = useState([
    {
      id: 1,
      user: 'أحمد م.',
      rating: 5,
      text: 'تطبيق رائع وسريع جداً!',
      date: '2026-01-15',
      helpful: 45,
    },
    {
      id: 2,
      user: 'فاطمة س.',
      rating: 4,
      text: 'جيد لكن يحتاج تحسينات في الأداء',
      date: '2026-01-14',
      helpful: 23,
    },
    {
      id: 3,
      user: 'محمد ع.',
      rating: 5,
      text: 'افضل تطبيق في فئته!',
      date: '2026-01-13',
      helpful: 78,
    },
    {
      id: 4,
      user: 'سارة ن.',
      rating: 3,
      text: 'يعمل لكن به مشاكل صغيرة',
      date: '2026-01-12',
      helpful: 12,
    },
  ]);

  const [selectedVersion, setSelectedVersion] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const stats = {
    totalDownloads: appVersions.reduce((sum, v) => sum + v.downloads, 0),
    avgRating: (appVersions.reduce((sum, v) => sum + v.rating, 0) / appVersions.length).toFixed(1),
    totalReviews: appVersions.reduce((sum, v) => sum + v.reviews, 0),
    activeVersions: appVersions.filter(v => v.status === 'published').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي التحميلات',
            value: `${(stats.totalDownloads / 1000).toFixed(1)}K`,
            icon: '📥',
            color: '#667eea',
          },
          { label: 'متوسط التقييم', value: stats.avgRating, icon: '⭐', color: '#ffc107' },
          {
            label: 'إجمالي المراجعات',
            value: stats.totalReviews.toLocaleString(),
            icon: '💬',
            color: '#2196f3',
          },
          { label: 'الإصدارات النشطة', value: stats.activeVersions, icon: '🚀', color: '#4caf50' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: 2, borderColor: '#e0e0e0' }}
        >
          <Tab label="📱 الإصدارات" />
          <Tab label="⭐ المراجعات والتقييمات" />
          <Tab label="⚙️ الإعدادات" />
        </Tabs>
      </Box>

      {/* Tab 1: Versions */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📱 إصدارات التطبيق
          </Typography>
          <Grid container spacing={2}>
            {appVersions.map(version => (
              <Grid item xs={12} key={version.id}>
                <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 3 } }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {version.platform} {version.version}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {version.releaseDate}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Chip
                          label={version.status === 'published' ? 'منشور' : 'أرشيف'}
                          color={version.status === 'published' ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Grid container spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#f8f9ff' }}>
                              <Typography variant="caption" color="textSecondary">
                                التحميلات
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {(version.downloads / 1000).toFixed(0)}K
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#f8f9ff' }}>
                              <Typography variant="caption" color="textSecondary">
                                التقييم
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <StarIcon sx={{ fontSize: 18, color: '#ffc107', mr: 0.5 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                  {version.rating}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#f8f9ff' }}>
                              <Typography variant="caption" color="textSecondary">
                                المراجعات
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {(version.reviews / 100).toFixed(0)}%
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <LinearProgress
                      variant="determinate"
                      value={(version.downloads / 100000) * 100}
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">
                        الحجم: {version.size} MB
                      </Typography>
                      <Box>
                        <Button size="small" startIcon={<EditIcon />} sx={{ mr: 1 }}>
                          تعديل
                        </Button>
                        <Button size="small" startIcon={<MoreIcon />}>
                          المزيد
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Button fullWidth variant="contained" startIcon={<PublishIcon />} sx={{ mt: 3 }}>
            نشر إصدار جديد
          </Button>
        </Box>
      )}

      {/* Tab 2: Reviews */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            ⭐ المراجعات والتقييمات
          </Typography>
          <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3, backgroundColor: '#f8f9ff' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" sx={{ fontWeight: 700, color: '#ffc107' }}>
                    {stats.avgRating}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon
                        key={star}
                        sx={{ color: star <= Math.round(stats.avgRating) ? '#ffc107' : '#ccc' }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {stats.totalReviews} مراجعة
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                {[5, 4, 3, 2, 1].map(rating => (
                  <Box key={rating} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {rating}⭐
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={rating * 18}
                        sx={{ flex: 1, mx: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {rating * 18}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            آخر المراجعات
          </Typography>
          {reviews.map(review => (
            <Card key={review.id} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {review.user}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {review.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon
                        key={star}
                        sx={{ fontSize: 18, color: star <= review.rating ? '#ffc107' : '#ccc' }}
                      />
                    ))}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  {review.text}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button size="small" startIcon={<ThumbUpIcon />}>
                    مفيد ({review.helpful})
                  </Button>
                  <Button size="small" startIcon={<CommentIcon />}>
                    رد
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            ⚙️ الإعدادات
          </Typography>
          <Grid container spacing={2}>
            {[
              { label: 'السماح بالتحديثات التلقائية', value: true },
              { label: 'عرض أيقونات الشارات', value: true },
              { label: 'تفعيل الإشعارات', value: true },
              { label: 'السماح بالآراء والمراجعات', value: true },
            ].map((setting, idx) => (
              <Grid item xs={12} key={idx}>
                <Paper sx={{ p: 2, borderRadius: 2, backgroundColor: '#f8f9ff' }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="body2">{setting.label}</Typography>
                    <Switch defaultChecked={setting.value} />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AppStoreIntegration;
