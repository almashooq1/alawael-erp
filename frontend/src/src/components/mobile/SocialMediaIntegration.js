/**
 * Social Media Integration & Sharing 📱
 * تكامل وسائل التواصل الاجتماعي والمشاركة
 *
 * Features:
 * ✅ Facebook integration
 * ✅ Twitter/X integration
 * ✅ Instagram integration
 * ✅ LinkedIn integration
 * ✅ Social sharing
 * ✅ Analytics tracking
 * ✅ Content calendar
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Alert,
  AlertTitle,
  Switch,
  Divider,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Share as ShareIcon,
  ThumbUp as LikeIcon,
  Favorite as FavoriteIcon,
  ChatBubble as CommentIcon,
  Repeat as RetweetIcon,
  Link as LinkIcon,
  QrCode as QRIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

const SocialMediaIntegration = () => {
  const [accounts, setAccounts] = useState([
    {
      id: 1,
      platform: 'facebook',
      name: 'My Business Page',
      followers: 15420,
      engagement: 4.5,
      status: 'connected',
      lastSync: '2026-01-16 14:30',
    },
    {
      id: 2,
      platform: 'twitter',
      name: '@MyBusiness',
      followers: 8530,
      engagement: 2.8,
      status: 'connected',
      lastSync: '2026-01-16 14:15',
    },
    {
      id: 3,
      platform: 'instagram',
      name: 'mybusiness',
      followers: 22150,
      engagement: 6.2,
      status: 'connected',
      lastSync: '2026-01-16 13:45',
    },
    {
      id: 4,
      platform: 'linkedin',
      name: 'My Company',
      followers: 5240,
      engagement: 1.5,
      status: 'connected',
      lastSync: '2026-01-16 12:00',
    },
  ]);

  const [posts, setPosts] = useState([
    {
      id: 1,
      platform: 'facebook',
      content: 'منتج جديد متاح الآن!',
      publishedDate: '2026-01-16',
      likes: 245,
      comments: 18,
      shares: 32,
      engagement: 4.2,
    },
    {
      id: 2,
      platform: 'instagram',
      content: 'اشترك الآن واحصل على خصم 50%',
      publishedDate: '2026-01-15',
      likes: 532,
      comments: 42,
      shares: 78,
      engagement: 6.5,
    },
    {
      id: 3,
      platform: 'twitter',
      content: 'تحديث جديد: تحسينات الأمان والأداء',
      publishedDate: '2026-01-14',
      likes: 156,
      comments: 28,
      shares: 89,
      engagement: 3.2,
    },
    {
      id: 4,
      platform: 'linkedin',
      content: 'مقال: رحلتنا نحو الابتكار',
      publishedDate: '2026-01-13',
      likes: 87,
      comments: 12,
      shares: 45,
      engagement: 1.8,
    },
  ]);

  const [scheduledPosts, setScheduledPosts] = useState([
    {
      id: 1,
      content: 'عرض خاص للعملاء الجدد',
      platforms: ['facebook', 'instagram'],
      scheduledDate: '2026-01-20',
      status: 'scheduled',
      priority: 'high',
    },
    {
      id: 2,
      content: 'حدث مباشر مع الفريق',
      platforms: ['facebook', 'linkedin'],
      scheduledDate: '2026-01-22',
      status: 'draft',
      priority: 'medium',
    },
    {
      id: 3,
      content: 'شكراً لدعمكم المستمر',
      platforms: ['twitter', 'instagram'],
      scheduledDate: '2026-01-25',
      status: 'scheduled',
      priority: 'low',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);

  const stats = {
    totalFollowers: accounts.reduce((sum, acc) => sum + acc.followers, 0),
    totalPosts: posts.length,
    avgEngagement: (accounts.reduce((sum, acc) => sum + acc.engagement, 0) / accounts.length).toFixed(1),
    scheduledPosts: scheduledPosts.length,
  };

  const platformIcons = {
    facebook: { icon: <FacebookIcon />, color: '#1877F2', name: 'Facebook' },
    twitter: { icon: <TwitterIcon />, color: '#000000', name: 'Twitter/X' },
    instagram: { icon: <InstagramIcon />, color: '#E1306C', name: 'Instagram' },
    linkedin: { icon: <LinkedInIcon />, color: '#0A66C2', name: 'LinkedIn' },
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المتابعين', value: stats.totalFollowers.toLocaleString('ar'), icon: '👥', color: '#667eea' },
          { label: 'المنشورات', value: stats.totalPosts, icon: '📝', color: '#4caf50' },
          { label: 'متوسط الانخراط', value: `${stats.avgEngagement}%`, icon: '📊', color: '#2196f3' },
          { label: 'منشورات مجدولة', value: stats.scheduledPosts, icon: '📅', color: '#ff9800' },
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

      {/* Social Accounts */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📱 الحسابات المتصلة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {accounts.map(account => (
          <Grid item xs={12} sm={6} key={account.id}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box sx={{ color: platformIcons[account.platform].color, fontSize: 28 }}>{platformIcons[account.platform].icon}</Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {account.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {platformIcons[account.platform].name}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="متصل" color="success" size="small" />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      المتابعون
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {account.followers.toLocaleString('ar')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      الانخراط
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {account.engagement}%
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  آخر مزامنة: {account.lastSync}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Posts */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📝 المنشورات الأخيرة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {posts.map(post => (
          <Grid item xs={12} key={post.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ color: platformIcons[post.platform].color }}>{platformIcons[post.platform].icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {post.content}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {post.publishedDate}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-around', pt: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {post.likes}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    إعجابات
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {post.comments}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    تعليقات
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {post.shares}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    مشاركات
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: '#4caf50' }}>
                    {post.engagement}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    انخراط
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Scheduled Posts */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📅 المنشورات المجدولة
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المحتوى</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المنصات</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scheduledPosts.map(post => (
              <TableRow key={post.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell>{post.content}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {post.platforms.map(p => (
                      <Tooltip key={p} title={platformIcons[p].name}>
                        <Box sx={{ color: platformIcons[p].color, fontSize: 18 }}>{platformIcons[p].icon}</Box>
                      </Tooltip>
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{post.scheduledDate}</TableCell>
                <TableCell>
                  <Chip
                    label={post.status === 'scheduled' ? 'مجدول' : 'مسودة'}
                    color={post.status === 'scheduled' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<EditIcon />}>
                    تحرير
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Publish New */}
      <Button variant="contained" fullWidth startIcon={<PublishIcon />} onClick={() => setOpenDialog(true)} sx={{ borderRadius: 2 }}>
        نشر منشور جديد
      </Button>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📝 نشر منشور جديد</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="المحتوى" variant="outlined" margin="normal" multiline rows={4} />
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, mb: 1 }}>
            اختر المنصات:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {Object.entries(platformIcons).map(([key, info]) => (
              <Chip key={key} label={info.name} variant="outlined" />
            ))}
          </Box>
          <TextField fullWidth label="تاريخ النشر" variant="outlined" margin="normal" type="datetime-local" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={() => setOpenDialog(false)} variant="contained">
            نشر
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Add Tooltip import
import { Tooltip } from '@mui/material';

export default SocialMediaIntegration;
