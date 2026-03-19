/**
 * Disability Rehabilitation Page
 * صفحة تأهيل ذوي الإعاقة
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  Accessibility as AccessibilityIcon,
  Psychology as PsychologyIcon,
  EmojiEvents as EmojiEventsIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  MilitaryTech as BadgeIcon,
} from '@mui/icons-material';

const DisabilityRehabilitationPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [gamificationData, setGamificationData] = useState(null);
  const [accessibilitySettings, setAccessibilitySettings] = useState({});

  useEffect(() => {
    loadBeneficiaries();
    loadAccessibilitySettings();
  }, []);

  const loadBeneficiaries = async () => {
    // Mock data for demonstration
    setBeneficiaries([
      {
        id: 1,
        name: 'أحمد محمد',
        disabilityType: 'إعاقة حركية',
        progress: 75,
        status: 'نشط',
        points: 1250,
        level: 3,
        badges: ['الإنجاز الأول', 'المثابرة'],
      },
      {
        id: 2,
        name: 'فاطمة علي',
        disabilityType: 'إعاقة سمعية',
        progress: 60,
        status: 'نشط',
        points: 980,
        level: 2,
        badges: ['البداية القوية'],
      },
    ]);
  };

  const loadAccessibilitySettings = () => {
    setAccessibilitySettings({
      fontSize: 'medium',
      highContrast: false,
      screenReader: false,
      signLanguage: false,
      voiceControl: false,
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderBeneficiariesList = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">المستفيدون</Typography>
          <Button variant="contained" startIcon={<AddIcon />}>
            إضافة مستفيد
          </Button>
        </Box>
        <List>
          {beneficiaries.map(beneficiary => (
            <ListItem
              key={beneficiary.id}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' },
              }}
              onClick={() => setSelectedBeneficiary(beneficiary)}
            >
              <ListItemIcon>
                <Avatar>
                  <PersonIcon />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={beneficiary.name}
                secondary={
                  <Box>
                    <Chip label={beneficiary.disabilityType} size="small" sx={{ mr: 1 }} />
                    <Chip label={beneficiary.status} color="success" size="small" />
                  </Box>
                }
              />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">التقدم: {beneficiary.progress}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={beneficiary.progress}
                  sx={{ width: 100, mt: 1 }}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  const renderAIRecommendations = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          توصيات الذكاء الاصطناعي
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  توصية علاجية
                </Typography>
                <Typography variant="body2">
                  يُنصح بزيادة جلسات العلاج الطبيعي إلى 3 جلسات أسبوعياً لتحسين النتائج
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  تحليل التقدم
                </Typography>
                <Typography variant="body2">
                  تحسن ملحوظ في المهارات الحركية بنسبة 15% خلال الشهر الماضي
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" fullWidth>
              طلب تحليل جديد
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderGamification = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          نظام التحفيز والغمرة
        </Typography>
        {selectedBeneficiary && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6">{selectedBeneficiary.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StarIcon color="warning" />
                  <Typography>المستوى: {selectedBeneficiary.level}</Typography>
                  <Typography sx={{ ml: 2 }}>النقاط: {selectedBeneficiary.points}</Typography>
                </Box>
              </Box>
            </Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              الشارات المكتسبة:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedBeneficiary.badges.map((badge, index) => (
                <Chip
                  key={index}
                  icon={<BadgeIcon />}
                  label={badge}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1">المهام المتاحة:</Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUpIcon />
                  </ListItemIcon>
                  <ListItemText primary="إكمال التمارين اليومية" secondary="+50 نقطة" />
                  <Button size="small" variant="contained">
                    إكمال
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUpIcon />
                  </ListItemIcon>
                  <ListItemText primary="حضور الجلسة الأسبوعية" secondary="+100 نقطة" />
                  <Button size="small" variant="outlined">
                    عرض
                  </Button>
                </ListItem>
              </List>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderAccessibilitySettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          إعدادات الوصولية
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>حجم الخط</InputLabel>
              <Select
                value={accessibilitySettings.fontSize}
                label="حجم الخط"
                onChange={e =>
                  setAccessibilitySettings({
                    ...accessibilitySettings,
                    fontSize: e.target.value,
                  })
                }
              >
                <MenuItem value="small">صغير</MenuItem>
                <MenuItem value="medium">متوسط</MenuItem>
                <MenuItem value="large">كبير</MenuItem>
                <MenuItem value="xlarge">كبير جداً</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={accessibilitySettings.highContrast}
                  onChange={e =>
                    setAccessibilitySettings({
                      ...accessibilitySettings,
                      highContrast: e.target.checked,
                    })
                  }
                />
              }
              label="تباين عالي"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={accessibilitySettings.screenReader}
                  onChange={e =>
                    setAccessibilitySettings({
                      ...accessibilitySettings,
                      screenReader: e.target.checked,
                    })
                  }
                />
              }
              label="قارئ الشاشة"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={accessibilitySettings.signLanguage}
                  onChange={e =>
                    setAccessibilitySettings({
                      ...accessibilitySettings,
                      signLanguage: e.target.checked,
                    })
                  }
                />
              }
              label="دعم لغة الإشارة"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={accessibilitySettings.voiceControl}
                  onChange={e =>
                    setAccessibilitySettings({
                      ...accessibilitySettings,
                      voiceControl: e.target.checked,
                    })
                  }
                />
              }
              label="التحكم الصوتي"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary">
            حفظ الإعدادات
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        نظام تأهيل ذوي الإعاقة
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="المستفيدون" />
        <Tab label="توصيات AI" />
        <Tab label="التحفيز والغمرة" />
        <Tab label="إعدادات الوصولية" />
      </Tabs>

      {activeTab === 0 && renderBeneficiariesList()}
      {activeTab === 1 && renderAIRecommendations()}
      {activeTab === 2 && renderGamification()}
      {activeTab === 3 && renderAccessibilitySettings()}
    </Box>
  );
};

export default DisabilityRehabilitationPage;
