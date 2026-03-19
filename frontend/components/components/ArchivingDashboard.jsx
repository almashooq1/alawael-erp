/**
 * 🗂️ Advanced Archiving Dashboard Component
 * مكون لوحة تحكم الأرشفة الإلكترونية الذكي
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Backup as BackupIcon,
  VerifiedUser as VerifiedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import ArchivingService from '../services/ArchivingService';

const ArchivingDashboard = () => {
  // 📊 الحالات الأساسية
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [archives, setArchives] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [templates, setTemplates] = useState([]);

  // تهيئة الخدمة
  const archivingService = useMemo(() => new ArchivingService(), []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, categoriesRes, templatesRes, logsRes] = await Promise.all([
        archivingService.getStatistics(),
        archivingService.getCategories(),
        archivingService.getTemplates(),
        archivingService.getActivityLog({ limit: 20 })
      ]);

      if (statsRes.success) setStatistics(statsRes.statistics);
      if (categoriesRes.success) setCategories(categoriesRes.categories);
      if (templatesRes.success) setTemplates(templatesRes.templates);
      if (logsRes.success) setActivityLog(logsRes.activities);
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  }, [archivingService]);

  // تحميل البيانات عند التحميل
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // البحث في الأرشيفات
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory) {
        filters.category = selectedCategory;
      }

      const result = await archivingService.search(searchQuery, filters);
      if (result.success) {
        setArchives(result.results);
      } else {
        setArchives([]);
      }
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
    } finally {
      setLoading(false);
    }
  };

  // استرجاع الأرشيف
  const handleRetrieve = async (archiveId) => {
    setLoading(true);
    try {
      const result = await archivingService.retrieveArchive(archiveId);
      if (result.success) {
        // تحميل الملف
        const blob = new Blob([result.data], { type: result.mimeType || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.metadata.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ خطأ في الاسترجاع:', error);
    } finally {
      setLoading(false);
    }
  };

  // حذف الأرشيف
  const handleDelete = async (archiveId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الأرشيف؟')) {
      setLoading(true);
      try {
        const result = await archivingService.deleteArchive(archiveId);
        if (result.success) {
          setArchives(archives.filter(a => a.id !== archiveId));
          alert('✅ تم حذف الأرشيف بنجاح');
        }
      } catch (error) {
        console.error('❌ خطأ في الحذف:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // إنشاء نسخة احتياطية
  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await archivingService.createBackup({
        includeMetadata: true,
        includeAccessLog: true,
        compression: 'high'
      });
      if (result.success) {
        alert('✅ تم إنشاء نسخة احتياطية بنجاح');
        loadInitialData();
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الأرشيف
  const handleVerify = async (archiveId) => {
    setLoading(true);
    try {
      const result = await archivingService.verifyArchive(archiveId);
      if (result.success) {
        alert(`✅ التحقق من الأرشيف:\n${result.message}`);
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق:', error);
    } finally {
      setLoading(false);
    }
  };

  // عرض معلومات الأرشيف
  const handleShowDetails = async (archiveId) => {
    setLoading(true);
    try {
      const result = await archivingService.getArchiveInfo(archiveId);
      if (result.success) {
        setSelectedArchive(result.archive);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('❌ خطأ في الحصول على المعلومات:', error);
    } finally {
      setLoading(false);
    }
  };

  // تنظيف الأرشيفات المنتهية
  const handleCleanup = async () => {
    if (window.confirm('هل تريد تنظيف الأرشيفات المنتهية صلاحيتها؟')) {
      setLoading(true);
      try {
        const result = await archivingService.cleanupExpired();
        if (result.success) {
          alert(`✅ تم حذف ${result.deleted} أرشيف منتهي الصلاحية`);
          loadInitialData();
        }
      } catch (error) {
        console.error('❌ خطأ في التنظيف:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* الرأس */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            🗂️ نظام الأرشفة الإلكترونية الذكي
          </Typography>
          <Typography variant="body2">
            نظام متقدم للأرشفة والبحث والإدارة الذكية للمستندات
          </Typography>
        </CardContent>
      </Card>

      {/* الحالة */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* التبويبات */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="🔍 البحث والاسترجاع" />
          <Tab label="📊 الإحصائيات" />
          <Tab label="📝 سجل النشاطات" />
          <Tab label="⚙️ الأدوات" />
        </Tabs>
      </Box>

      {/* التبويب الأول: البحث والاسترجاع */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* بطاقة البحث */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="🔍 البحث المتقدم" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    placeholder="ابحث عن مستند..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    variant="outlined"
                  />

                  <FormControl fullWidth>
                    <InputLabel>الفئة</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="الفئة"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="">جميع الفئات</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    ابحث
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* النتائج */}
          {archives.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title={`📄 النتائج (${archives.length})`} />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>المستند</TableCell>
                          <TableCell>الفئة</TableCell>
                          <TableCell>الحجم</TableCell>
                          <TableCell>الأهمية</TableCell>
                          <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {archives.map((archive) => (
                          <TableRow key={archive.id} hover>
                            <TableCell>{archive.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={archive.category}
                                size="small"
                                sx={{
                                  backgroundColor: archivingService.getCategoryColor(archive.category),
                                  color: 'white'
                                }}
                              />
                            </TableCell>
                            <TableCell>{archivingService.formatFileSize(archive.size)}</TableCell>
                            <TableCell>{archive.relevance}%</TableCell>
                            <TableCell align="center">
                              <Tooltip title="تفاصيل">
                                <IconButton
                                  size="small"
                                  onClick={() => handleShowDetails(archive.id)}
                                >
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="استرجاع">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRetrieve(archive.id)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="حذف">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(archive.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* التبويب الثاني: الإحصائيات */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {statistics && (
            <>
              {/* الإحصائيات الرئيسية */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      📊 العدد الإجمالي
                    </Typography>
                    <Typography variant="h4">{statistics.generalStats?.totalArchives || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      💾 الحجم الإجمالي
                    </Typography>
                    <Typography variant="h6">
                      {archivingService.formatFileSize(statistics.generalStats?.totalSize || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      📉 نسبة الضغط
                    </Typography>
                    <Typography variant="h6">
                      {(statistics.generalStats?.averageCompressionRatio * 100).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      💰 التوفير
                    </Typography>
                    <Typography variant="h6">
                      {archivingService.formatFileSize(statistics.generalStats?.spaceSaved || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* الإحصائيات حسب الفئة */}
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="📈 الإحصائيات حسب الفئة" />
                  <CardContent>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell>الفئة</TableCell>
                            <TableCell align="right">العدد</TableCell>
                            <TableCell align="right">الحجم</TableCell>
                            <TableCell align="right">نسبة الضغط</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(statistics.byCategory || {}).map(([category, data]) => (
                            <TableRow key={category}>
                              <TableCell>{category}</TableCell>
                              <TableCell align="right">{data.count}</TableCell>
                              <TableCell align="right">
                                {archivingService.formatFileSize(data.size)}
                              </TableCell>
                              <TableCell align="right">
                                {(data.compressionRatio * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* التبويب الثالث: سجل النشاطات */}
      {activeTab === 2 && (
        <Card>
          <CardHeader title="📝 سجل النشاطات الأخيرة" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>النوع</TableCell>
                    <TableCell>المستند</TableCell>
                    <TableCell>الوقت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityLog.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={activity.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{activity.documentName || 'غير متوفر'}</TableCell>
                      <TableCell>{archivingService.formatDate(activity.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* التبويب الرابع: الأدوات */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  🔄 نسخة احتياطية
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  إنشاء نسخة احتياطية من جميع الأرشيفات
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<BackupIcon />}
                  onClick={handleBackup}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  إنشاء نسخة احتياطية
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  🧹 تنظيف
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  حذف الأرشيفات المنتهية الصلاحية
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleCleanup}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  تنظيف الأرشيفات
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  🔄 تحديث
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  تحديث البيانات والإحصائيات
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={loadInitialData}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  تحديث
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  📋 القوالب
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  عدد قوالب الأرشفة المتاحة
                </Typography>
                <Typography variant="h4" color="primary">
                  {templates.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* نافذة التفاصيل */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📋 تفاصيل الأرشيف</DialogTitle>
        <DialogContent>
          {selectedArchive && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  المستند
                </Typography>
                <Typography variant="body1">{selectedArchive.name}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  الفئة
                </Typography>
                <Chip
                  label={selectedArchive.classification?.category}
                  sx={{
                    backgroundColor: archivingService.getCategoryColor(
                      selectedArchive.classification?.category
                    ),
                    color: 'white'
                  }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  الحجم
                </Typography>
                <Typography variant="body1">
                  {archivingService.formatFileSize(selectedArchive.originalSize)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الأرشفة
                </Typography>
                <Typography variant="body1">
                  {archivingService.formatDate(selectedArchive.metadata?.createdAt)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  تاريخ انتهاء الصلاحية
                </Typography>
                <Typography variant="body1">
                  {archivingService.formatDate(selectedArchive.expirationDate)}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>إغلاق</Button>
          {selectedArchive && (
            <>
              <Tooltip title="التحقق من السلامة">
                <Button
                  startIcon={<VerifiedIcon />}
                  onClick={() => {
                    handleVerify(selectedArchive.id);
                    setShowDetails(false);
                  }}
                >
                  تحقق
                </Button>
              </Tooltip>
              <Tooltip title="استرجاع">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    handleRetrieve(selectedArchive.id);
                    setShowDetails(false);
                  }}
                >
                  استرجاع
                </Button>
              </Tooltip>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArchivingDashboard;
