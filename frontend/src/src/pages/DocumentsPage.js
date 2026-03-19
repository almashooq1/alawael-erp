import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  MenuItem,
  LinearProgress,
  Alert,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Visibility as ViewIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Title, ChartTooltip, Legend);

function DocumentsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/documents/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`http://localhost:3001/api/documents?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/documents/reports/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 4) {
      fetchAnalytics();
    }
  }, [activeTab]);

  const getStatusColor = status => {
    const colors = {
      approved: 'success',
      pending: 'warning',
      rejected: 'error',
      active: 'info',
      paid: 'success',
    };
    return colors[status] || 'default';
  };

  const formatFileSize = bytes => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const handleUploadDocument = async event => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          categoryId: formData.get('category'),
          tags: formData
            .get('tags')
            ?.split(',')
            .map(t => t.trim()),
          confidential: formData.get('confidential') === 'on',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUploadDialogOpen(false);
        fetchDocuments();
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: '#2196F3', color: 'white' }}>
          <CardContent>
            <Typography variant="h6">إجمالي المستندات</Typography>
            <Typography variant="h3">{stats?.total || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: '#4CAF50', color: 'white' }}>
          <CardContent>
            <Typography variant="h6">معتمد</Typography>
            <Typography variant="h3">{stats?.approved || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: '#FF9800', color: 'white' }}>
          <CardContent>
            <Typography variant="h6">قيد المراجعة</Typography>
            <Typography variant="h3">{stats?.pending || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: '#9C27B0', color: 'white' }}>
          <CardContent>
            <Typography variant="h6">حجم التخزين</Typography>
            <Typography variant="h3">{stats?.totalSize || '0 MB'}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Categories Grid */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          التصنيفات
        </Typography>
        <Grid container spacing={2}>
          {categories.map(category => (
            <Grid item xs={12} sm={6} md={4} key={category.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  transition: 'all 0.3s',
                }}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setActiveTab(1);
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        bgcolor: category.color,
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        fontSize: '2rem',
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6">{category.name}</Typography>
                      <Typography color="text.secondary">{category.count} مستند</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );

  // Documents List Tab
  const DocumentsListTab = () => (
    <Box>
      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="البحث في المستندات..."
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
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>التصنيف</InputLabel>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} label="التصنيف">
                <MenuItem value="">الكل</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={fetchDocuments}>
              بحث
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents Grid */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {documents.map(doc => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="start" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <DocumentIcon color="primary" />
                      {doc.confidential && (
                        <Tooltip title="سري">
                          <LockIcon fontSize="small" color="error" />
                        </Tooltip>
                      )}
                    </Box>
                    <Chip label={doc.status} size="small" color={getStatusColor(doc.status)} />
                  </Box>

                  <Typography variant="h6" gutterBottom noWrap>
                    {doc.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {doc.description}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    {doc.tags.slice(0, 3).map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(doc.size)} • {doc.format.toUpperCase()}
                  </Typography>

                  <Box display="flex" gap={1} mt={1}>
                    <Chip icon={<ViewIcon />} label={doc.views} size="small" variant="outlined" />
                    <Chip icon={<DownloadIcon />} label={doc.downloads} size="small" variant="outlined" />
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedDocument(doc);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                  <Button size="small" startIcon={<DownloadIcon />}>
                    تحميل
                  </Button>
                  <Button size="small" startIcon={<ShareIcon />}>
                    مشاركة
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // Templates Tab
  const TemplatesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          القوالب الجاهزة
        </Typography>
      </Grid>
      {/* Templates content here */}
      <Grid item xs={12}>
        <Alert severity="info">القوالب الجاهزة ستكون متاحة قريباً</Alert>
      </Grid>
    </Grid>
  );

  // Analytics Tab
  const AnalyticsTab = () => {
    if (!analyticsData) return <LinearProgress />;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            التحليلات والإحصائيات
          </Typography>
        </Grid>

        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">إجمالي المستندات</Typography>
              <Typography variant="h4">{analyticsData.overview.totalDocuments}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">إجمالي التحميلات</Typography>
              <Typography variant="h4">{analyticsData.overview.totalDownloads}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">إجمالي المشاهدات</Typography>
              <Typography variant="h4">{analyticsData.overview.totalViews}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">التخزين المستخدم</Typography>
              <Typography variant="h4">{analyticsData.overview.storageUsage}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                المستندات حسب التصنيف
              </Typography>
              <Pie
                data={{
                  labels: analyticsData.documentsByCategory.map(c => c.category),
                  datasets: [
                    {
                      data: analyticsData.documentsByCategory.map(c => c.count),
                      backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'],
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                الأكثر تحميلاً
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المستند</TableCell>
                      <TableCell align="right">التحميلات</TableCell>
                      <TableCell align="right">المشاهدات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData.mostDownloaded.map((doc, index) => (
                      <TableRow key={index}>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell align="right">{doc.downloads}</TableCell>
                        <TableCell align="right">{doc.views}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📄 إدارة المستندات
        </Typography>
        <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadDialogOpen(true)} size="large">
          رفع مستند
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="لوحة التحكم" />
          <Tab label="المستندات" />
          <Tab label="القوالب" />
          <Tab label="الأرشيف" />
          <Tab label="التحليلات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && <DashboardTab />}
      {activeTab === 1 && <DocumentsListTab />}
      {activeTab === 2 && <TemplatesTab />}
      {activeTab === 4 && <AnalyticsTab />}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUploadDocument}>
          <DialogTitle>رفع مستند جديد</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField name="title" label="عنوان المستند" fullWidth required />
              </Grid>
              <Grid item xs={12}>
                <TextField name="description" label="الوصف" fullWidth multiline rows={3} />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>التصنيف</InputLabel>
                  <Select name="category" label="التصنيف">
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField name="tags" label="الوسوم (مفصولة بفواصل)" fullWidth placeholder="عقد, مورد, مهم" />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
                  اختر الملف
                  <input type="file" hidden />
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>إلغاء</Button>
            <Button type="submit" variant="contained">
              رفع
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Document Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedDocument && (
          <>
            <DialogTitle>{selectedDocument.title}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body1">{selectedDocument.description}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحجم
                  </Typography>
                  <Typography>{formatFileSize(selectedDocument.size)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    النوع
                  </Typography>
                  <Typography>{selectedDocument.format.toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الإنشاء
                  </Typography>
                  <Typography>{selectedDocument.createdDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحالة
                  </Typography>
                  <Chip label={selectedDocument.status} color={getStatusColor(selectedDocument.status)} size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    الوسوم
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    {selectedDocument.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
              <Button variant="contained" startIcon={<DownloadIcon />}>
                تحميل
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default DocumentsPage;
