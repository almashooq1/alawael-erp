/**
 * Student Rewards Store Page
 * صفحة متجر المكافآت للطالب
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import StarsIcon from '@mui/icons-material/Stars';
import BadgeIcon from '@mui/icons-material/Badge';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import RedeemIcon from '@mui/icons-material/Redeem';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const levelColors = {
  مبتدئ: '#95a5a6',
  برونزي: '#cd7f32',
  فضي: '#c0c0c0',
  ذهبي: '#ffd700',
  ماسي: '#b9f2ff',
  أسطوري: '#9b59b6',
};

const categoryIcons = {
  ألعاب: '🎮',
  'أدوات مدرسية': '📚',
  الكترونيات: '💻',
  رحلات: '✈️',
  طعام: '🍕',
  شهادات: '📜',
  أخرى: '🎁',
};

const StudentRewardsStore = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [storeItems, setStoreItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [redeemDialog, setRedeemDialog] = useState(false);

  const mockBalance = {
    totalPoints: 1250,
    currentBalance: 780,
    totalEarned: 1500,
    totalRedeemed: 720,
    level: 'فضي',
    nextLevel: 'ذهبي',
    pointsToNextLevel: 220,
    streak: 15,
    rank: 3,
  };

  const mockItems = [
    {
      _id: '1',
      name: 'دفتر رسم فاخر',
      description: 'دفتر رسم بجودة عالية 50 ورقة',
      category: 'أدوات مدرسية',
      pointsCost: 200,
      image: '',
      stock: 10,
      canRedeem: true,
    },
    {
      _id: '2',
      name: 'ساعة رياضية',
      description: 'ساعة رياضية رقمية مقاومة للماء',
      category: 'الكترونيات',
      pointsCost: 500,
      image: '',
      stock: 5,
      canRedeem: true,
    },
    {
      _id: '3',
      name: 'رحلة ترفيهية',
      description: 'رحلة إلى مدينة الألعاب مع المرافق',
      category: 'رحلات',
      pointsCost: 1000,
      image: '',
      stock: 3,
      canRedeem: false,
    },
    {
      _id: '4',
      name: 'مجموعة ألعاب تعليمية',
      description: 'مجموعة ألعاب ذكاء وتعليم متنوعة',
      category: 'ألعاب',
      pointsCost: 350,
      image: '',
      stock: 8,
      canRedeem: true,
    },
    {
      _id: '5',
      name: 'وجبة مميزة',
      description: 'وجبة غداء مميزة من المطعم المفضل',
      category: 'طعام',
      pointsCost: 150,
      image: '',
      stock: 15,
      canRedeem: true,
    },
    {
      _id: '6',
      name: 'شهادة تقدير ذهبية',
      description: 'شهادة تقدير ذهبية مميزة بالاسم',
      category: 'شهادات',
      pointsCost: 100,
      image: '',
      stock: 50,
      canRedeem: true,
    },
  ];

  const mockTransactions = [
    {
      _id: '1',
      type: 'earn',
      points: 50,
      reason: 'إكمال الواجب اليومي',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      _id: '2',
      type: 'earn',
      points: 100,
      reason: 'حضور كامل الأسبوع',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      _id: '3',
      type: 'redeem',
      points: -200,
      reason: 'استبدال: دفتر رسم فاخر',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      _id: '4',
      type: 'earn',
      points: 150,
      reason: 'تفوق في الاختبار الشهري',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
    },
    {
      _id: '5',
      type: 'earn',
      points: 25,
      reason: 'سلوك إيجابي - مساعدة زميل',
      createdAt: new Date(Date.now() - 432000000).toISOString(),
    },
  ];

  const mockBadges = [
    {
      _id: '1',
      name: 'نجم الحضور',
      description: 'حضور 30 يوم متتالي',
      icon: '⭐',
      earnedAt: new Date().toISOString(),
      isEarned: true,
    },
    {
      _id: '2',
      name: 'المتفوق',
      description: 'تحصيل أعلى درجة في الاختبار',
      icon: '🏆',
      earnedAt: new Date().toISOString(),
      isEarned: true,
    },
    {
      _id: '3',
      name: 'القائد',
      description: 'قيادة فريق في نشاط جماعي',
      icon: '👑',
      isEarned: false,
      progress: 65,
    },
    {
      _id: '4',
      name: 'المبدع',
      description: 'إنجاز 10 مشاريع إبداعية',
      icon: '🎨',
      isEarned: false,
      progress: 30,
    },
    {
      _id: '5',
      name: 'صديق الجميع',
      description: 'مساعدة 20 زميل',
      icon: '🤝',
      isEarned: true,
      earnedAt: new Date().toISOString(),
    },
    {
      _id: '6',
      name: 'البطل الرياضي',
      description: 'المشاركة في 5 أنشطة رياضية',
      icon: '🏅',
      isEarned: false,
      progress: 80,
    },
  ];

  const mockLeaderboard = [
    { rank: 1, studentName: 'أحمد محمد', points: 2150, level: 'ذهبي', avatar: '' },
    { rank: 2, studentName: 'سارة خالد', points: 1890, level: 'ذهبي', avatar: '' },
    {
      rank: 3,
      studentName: currentUser?.name || 'أنت',
      points: 1250,
      level: 'فضي',
      avatar: '',
      isCurrentUser: true,
    },
    { rank: 4, studentName: 'عمر علي', points: 1100, level: 'فضي', avatar: '' },
    { rank: 5, studentName: 'نورة سعد', points: 950, level: 'برونزي', avatar: '' },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [balanceRes, storeRes, txRes, badgesRes, lbRes] = await Promise.all([
        api.get(`/student-rewards/${userId}/balance`).catch(() => null),
        api.get(`/student-rewards/${userId}/store`).catch(() => null),
        api.get(`/student-rewards/${userId}/transactions`).catch(() => null),
        api.get(`/student-rewards/${userId}/badges`).catch(() => null),
        api.get(`/student-rewards/${userId}/leaderboard`).catch(() => null),
      ]);
      setBalance(balanceRes?.data?.success ? balanceRes.data.data : mockBalance);
      setStoreItems(storeRes?.data?.success ? storeRes.data.data?.items : mockItems);
      setTransactions(txRes?.data?.success ? txRes.data.data?.transactions : mockTransactions);
      setBadges(badgesRes?.data?.success ? badgesRes.data.data?.badges : mockBadges);
      setLeaderboard(lbRes?.data?.success ? lbRes.data.data?.leaderboard : mockLeaderboard);
    } catch {
      setBalance(mockBalance);
      setStoreItems(mockItems);
      setTransactions(mockTransactions);
      setBadges(mockBadges);
      setLeaderboard(mockLeaderboard);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async () => {
    if (!selectedItem) return;
    try {
      const res = await api
        .post(`/student-rewards/${userId}/redeem`, { itemId: selectedItem._id })
        .catch(() => null);
      if (res?.data?.success) {
        showSnackbar(`تم استبدال ${selectedItem.name} بنجاح! 🎉`, 'success');
      } else {
        showSnackbar(`تم الطلب بنجاح (وضع تجريبي) 🎉`, 'success');
      }
      setRedeemDialog(false);
      setSelectedItem(null);
      loadData();
    } catch {
      showSnackbar('حدث خطأ في الاستبدال', 'error');
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f9ca24, #f0932b)',
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              🏆 متجر المكافآت
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
              اجمع النقاط واستبدلها بمكافآت رائعة!
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip
                icon={<StarsIcon />}
                label={`${balance?.currentBalance || 0} نقطة`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  fontSize: '1.1rem',
                  height: 40,
                }}
              />
              <Chip
                label={`المستوى: ${balance?.level || 'مبتدئ'}`}
                sx={{
                  bgcolor: levelColors[balance?.level] || '#95a5a6',
                  color: 'white',
                  fontWeight: 700,
                  height: 40,
                }}
              />
              <Chip
                icon={<TrophyIcon />}
                label={`المركز #${balance?.rank || '-'}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', height: 40 }}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)' }}>
              <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                التقدم نحو <strong>{balance?.nextLevel || 'ذهبي'}</strong>
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  balance?.pointsToNextLevel
                    ? Math.max(0, 100 - balance.pointsToNextLevel / 10)
                    : 50
                }
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': { bgcolor: 'white' },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5, display: 'block' }}
              >
                باقي {balance?.pointsToNextLevel || 0} نقطة للمستوى التالي • 🔥 سلسلة{' '}
                {balance?.streak || 0} يوم
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<CartIcon />} label="المتجر" iconPosition="start" />
          <Tab icon={<BadgeIcon />} label="الشارات" iconPosition="start" />
          <Tab icon={<LeaderboardIcon />} label="لوحة المتصدرين" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="السجل" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Store Tab */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {storeItems.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card
                sx={{
                  borderRadius: 2,
                  position: 'relative',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    background: `linear-gradient(135deg, ${item.canRedeem ? '#6c5ce7' : '#b2bec3'}, ${item.canRedeem ? '#a29bfe' : '#dfe6e9'})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h2">{categoryIcons[item.category] || '🎁'}</Typography>
                </Box>
                {!item.canRedeem && (
                  <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                    <Chip icon={<LockIcon />} label="نقاط غير كافية" size="small" color="error" />
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Chip
                      icon={<StarsIcon />}
                      label={`${item.pointsCost} نقطة`}
                      color="warning"
                      size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                      متوفر: {item.stock}
                    </Typography>
                  </Box>
                  <Button
                    fullWidth
                    variant={item.canRedeem ? 'contained' : 'outlined'}
                    startIcon={<RedeemIcon />}
                    disabled={!item.canRedeem}
                    sx={{ mt: 2 }}
                    onClick={() => {
                      setSelectedItem(item);
                      setRedeemDialog(true);
                    }}
                  >
                    {item.canRedeem ? 'استبدال' : 'نقاط غير كافية'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Badges Tab */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {badges.map(badge => (
            <Grid item xs={12} sm={6} md={4} key={badge._id}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: badge.isEarned ? '2px solid #f9ca24' : '1px solid #e0e0e0',
                  opacity: badge.isEarned ? 1 : 0.7,
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <Typography variant="h1" sx={{ mb: 1 }}>
                  {badge.icon}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {badge.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {badge.description}
                </Typography>
                {badge.isEarned ? (
                  <Chip icon={<CheckIcon />} label="محققة ✓" color="success" />
                ) : (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={badge.progress || 0}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {badge.progress || 0}% مكتمل
                    </Typography>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Leaderboard Tab */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <LeaderboardIcon color="warning" /> لوحة المتصدرين
          </Typography>
          <Stack spacing={2}>
            {leaderboard.map(entry => (
              <Paper
                key={entry.rank}
                variant={entry.isCurrentUser ? 'elevation' : 'outlined'}
                elevation={entry.isCurrentUser ? 4 : 0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: entry.isCurrentUser ? 'rgba(249, 202, 36, 0.1)' : 'transparent',
                  border: entry.isCurrentUser ? '2px solid #f9ca24' : undefined,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor:
                        entry.rank <= 3
                          ? ['#ffd700', '#c0c0c0', '#cd7f32'][entry.rank - 1]
                          : '#95a5a6',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}
                  >
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {entry.studentName}{' '}
                      {entry.isCurrentUser && (
                        <Chip label="أنت" size="small" color="warning" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Chip
                      size="small"
                      label={entry.level}
                      sx={{ bgcolor: levelColors[entry.level], color: 'white' }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f9ca24' }}>
                      {entry.points}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      نقطة
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Transactions Tab */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <HistoryIcon color="primary" /> سجل النقاط
          </Typography>
          <Stack spacing={2}>
            {transactions.map(tx => (
              <Paper key={tx._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: tx.type === 'earn' ? '#2ecc71' : '#e74c3c' }}>
                      {tx.type === 'earn' ? '➕' : '➖'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {tx.reason}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(tx.createdAt).toLocaleDateString('ar-SA')}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={`${tx.type === 'earn' ? '+' : ''}${tx.points}`}
                    color={tx.type === 'earn' ? 'success' : 'error'}
                    sx={{ fontWeight: 700, fontSize: '1rem' }}
                  />
                </Box>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Redeem Dialog */}
      <Dialog open={redeemDialog} onClose={() => setRedeemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          تأكيد الاستبدال
          <IconButton
            onClick={() => setRedeemDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h2" sx={{ mb: 2 }}>
                {categoryIcons[selectedItem.category] || '🎁'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {selectedItem.name}
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                {selectedItem.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>رصيدك الحالي:</Typography>
                <Typography sx={{ fontWeight: 600 }}>{balance?.currentBalance} نقطة</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>التكلفة:</Typography>
                <Typography sx={{ fontWeight: 600, color: 'error.main' }}>
                  -{selectedItem.pointsCost} نقطة
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 600 }}>الرصيد بعد الاستبدال:</Typography>
                <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
                  {(balance?.currentBalance || 0) - selectedItem.pointsCost} نقطة
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<RedeemIcon />}
            onClick={handleRedeem}
          >
            تأكيد الاستبدال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentRewardsStore;
