/**
 * Multi-Language & Internationalization Support 🌍
 * دعم اللغات المتعددة والعولمة
 *
 * Features:
 * ✅ Multi-language support
 * ✅ RTL/LTR support
 * ✅ Currency conversion
 * ✅ Date/Time localization
 * ✅ Regional settings
 * ✅ Translation management
 * ✅ Language switching
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const MultiLanguageSupport = () => {
  const [currentLanguage, setCurrentLanguage] = useState('ar');
  const [rtlMode, setRtlMode] = useState(true);
  const [_openDialog, _setOpenDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');

  const languages = [
    { code: 'ar', name: 'العربية', nativeName: 'العربية', rtl: true, speakers: '422M', completion: 100, icon: '🇸🇦' },
    { code: 'en', name: 'English', nativeName: 'English', rtl: false, speakers: '1.5B', completion: 95, icon: '🇬🇧' },
    { code: 'fr', name: 'Français', nativeName: 'Français', rtl: false, speakers: '280M', completion: 85, icon: '🇫🇷' },
    { code: 'es', name: 'Español', nativeName: 'Español', rtl: false, speakers: '550M', completion: 80, icon: '🇪🇸' },
    { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', rtl: false, speakers: '134M', completion: 75, icon: '🇩🇪' },
    { code: 'zh', name: '中文', nativeName: '中文', rtl: false, speakers: '1.1B', completion: 70, icon: '🇨🇳' },
  ];

  const currencies = [
    { code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س', rate: 1.0, default: true },
    { code: 'USD', name: 'الدولار الأمريكي', symbol: '$', rate: 0.27, default: false },
    { code: 'EUR', name: 'اليورو', symbol: '€', rate: 0.25, default: false },
    { code: 'GBP', name: 'الجنيه الإسترليني', symbol: '£', rate: 0.21, default: false },
    { code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ', rate: 0.99, default: false },
  ];

  const translations = [
    { key: 'welcome', ar: 'أهلا وسهلا', en: 'Welcome', status: 'complete', progress: 100 },
    { key: 'home', ar: 'الرئيسية', en: 'Home', status: 'complete', progress: 100 },
    { key: 'menu', ar: 'القائمة', en: 'Menu', status: 'complete', progress: 100 },
    { key: 'settings', ar: 'الإعدادات', en: 'Settings', status: 'complete', progress: 100 },
    { key: 'products', ar: 'المنتجات', en: 'Products', status: 'partial', progress: 95 },
    { key: 'cart', ar: 'السلة', en: 'Shopping Cart', status: 'partial', progress: 90 },
  ];

  const regions = [
    { name: 'السعودية', timezone: 'AST (UTC+3)', dateFormat: 'DD/MM/YYYY', selected: true },
    { name: 'الإمارات', timezone: 'GST (UTC+4)', dateFormat: 'DD/MM/YYYY', selected: false },
    { name: 'مصر', timezone: 'EET (UTC+2)', dateFormat: 'DD/MM/YYYY', selected: false },
    { name: 'USA', timezone: 'EST (UTC-5)', dateFormat: 'MM/DD/YYYY', selected: false },
  ];

  const stats = {
    totalLanguages: languages.length,
    supportedLanguages: languages.filter(l => l.completion >= 90).length,
    translations: translations.length,
    avgCompletion: Math.round(languages.reduce((sum, l) => sum + l.completion, 0) / languages.length),
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي اللغات', value: stats.totalLanguages, icon: '🌍', color: '#667eea' },
          { label: 'اللغات المدعومة', value: stats.supportedLanguages, icon: '✅', color: '#4caf50' },
          { label: 'الترجمات', value: stats.translations, icon: '📝', color: '#ff9800' },
          { label: 'متوسط الإكمال', value: `${stats.avgCompletion}%`, icon: '📊', color: '#2196f3' },
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

      {/* Language Selector */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          🌐 اختيار اللغة
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>اللغة الحالية</InputLabel>
          <Select value={currentLanguage} onChange={e => setCurrentLanguage(e.target.value)} label="اللغة الحالية">
            {languages.map(lang => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.icon} {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: '#f8f9ff', borderRadius: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            اتجاه النص (RTL)
          </Typography>
          <Switch checked={rtlMode} onChange={e => setRtlMode(e.target.checked)} />
        </Box>
      </Paper>

      {/* Languages Support */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📚 اللغات المدعومة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {languages.map(lang => (
          <Grid item xs={12} sm={6} md={4} key={lang.code}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {lang.icon} {lang.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {lang.nativeName} • {lang.speakers}
                    </Typography>
                  </Box>
                  {lang.code === currentLanguage && <Chip label="الحالية" color="success" size="small" icon={<CheckIcon />} />}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      نسبة الإكمال
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: lang.code === 'ar' ? '#4caf50' : '#ff9800' }}>
                      {lang.completion}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={lang.completion} sx={{ height: 6, borderRadius: 3 }} />
                </Box>

                <Button size="small" variant="outlined" fullWidth onClick={() => setCurrentLanguage(lang.code)} sx={{ borderRadius: 2 }}>
                  استخدم
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Currency Settings */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        💱 إعدادات العملات
      </Typography>
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>العملة الافتراضية</InputLabel>
          <Select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} label="العملة الافتراضية">
            {currencies.map(curr => (
              <MenuItem key={curr.code} value={curr.code}>
                {curr.symbol} {curr.name} ({curr.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <List>
          {currencies.map(curr => (
            <ListItem
              key={curr.code}
              sx={{ backgroundColor: curr.code === selectedCurrency ? '#e3f2fd' : 'transparent', borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon>{curr.code === 'USD' ? '$' : curr.code === 'EUR' ? '€' : curr.symbol}</ListItemIcon>
              <ListItemText primary={curr.name} secondary={`${curr.code} • السعر: 1 SAR = ${curr.rate} ${curr.code}`} />
              {curr.code === selectedCurrency && <CheckIcon sx={{ color: '#4caf50' }} />}
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Regional Settings */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🗺️ الإعدادات الإقليمية
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {regions.map(region => (
          <Grid item xs={12} sm={6} key={region.name}>
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${region.selected ? '#667eea' : '#ccc'}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {region.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                      🕐 {region.timezone}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      📅 {region.dateFormat}
                    </Typography>
                  </Box>
                  {region.selected && <Chip label="نشط" color="primary" icon={<CheckIcon />} />}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Translations Management */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📝 إدارة الترجمات
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المفتاح</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>العربية</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>English</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {translations.map(trans => (
              <TableRow key={trans.key} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{trans.key}</TableCell>
                <TableCell>{trans.ar}</TableCell>
                <TableCell>{trans.en}</TableCell>
                <TableCell>
                  <Chip
                    label={trans.status === 'complete' ? 'مكتملة' : 'جزئية'}
                    color={trans.status === 'complete' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<EditIcon />} variant="outlined">
                    تحرير
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MultiLanguageSupport;
