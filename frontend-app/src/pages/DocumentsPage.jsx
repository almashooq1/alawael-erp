import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload,
  Search,
  Folder,
  InsertDriveFile,
  Download,
  Delete,
  Edit,
  MoreVert,
  PictureAsPdf,
  Image,
  Description,
  Archive,
  Visibility,
} from '@mui/icons-material';
import api from '../services/api';
import { toast } from 'react-toastify';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, [filterType]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/documents', {
        params: { type: filterType !== 'all' ? filterType : undefined },
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Demo data fallback
      setDocuments([
        {
          _id: '1',
          title: 'تقرير المبيعات Q1 2026',
          filename: 'sales_report_q1.pdf',
          type: 'pdf',
          category: 'reports',
          size: '2.4 MB',
          uploadedBy: 'أحمد محمد',
          uploadDate: '2026-01-15',
          tags: ['مبيعات', 'تقارير', 'ربع سنوي'],
        },
        {
          _id: '2',
          title: 'عقد موظف جديد',
          filename: 'employee_contract_2026.docx',
          type: 'docx',
          category: 'hr',
          size: '856 KB',
          uploadedBy: 'سارة أحمد',
          uploadDate: '2026-01-14',
          tags: ['موارد بشرية', 'عقود'],
        },
        {
          _id: '3',
          title: 'شعار الشركة الجديد',
          filename: 'company_logo_2026.png',
          type: 'image',
          category: 'branding',
          size: '1.2 MB',
          uploadedBy: 'محمد خالد',
          uploadDate: '2026-01-13',
          tags: ['تصميم', 'شعار', 'علامة تجارية'],
        },
        {
          _id: '4',
          title: 'محضر اجتماع الإدارة',
          filename: 'meeting_minutes_jan.pdf',
          type: 'pdf',
          category: 'meetings',
          size: '512 KB',
          uploadedBy: 'فاطمة علي',
          uploadDate: '2026-01-12',
          tags: ['اجتماعات', 'محاضر'],
        },
      ]);
    }
    setLoading(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData({ ...formData, title: file.name.split('.')[0] });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('الرجاء اختيار ملف أولاً');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('category', formData.category);
    uploadFormData.append('tags', formData.tags);

    try {
      setUploadProgress(0);
      await api.post('/documents/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });
      toast.success('تم رفع الملف بنجاح');
      setOpenUploadDialog(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setFormData({ title: '', description: '', category: 'general', tags: '' });
      fetchDocuments();
    } catch (error) {
      toast.error('فشل رفع الملف');
      setUploadProgress(0);
    }
  };

  const handleMenuClick = (event, doc) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(doc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDoc(null);
  };

  const handleDownload = (doc) => {
    toast.info(`جاري تحميل ${doc.filename}`);
    handleMenuClose();
  };

  const handleDelete = async (doc) => {
    try {
      await api.delete(`/documents/${doc._id}`);
      toast.success('تم حذف المستند');
      fetchDocuments();
    } catch (error) {
      toast.error('فشل حذف المستند');
    }
    handleMenuClose();
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <PictureAsPdf color="error" />;
      case 'image':
      case 'png':
      case 'jpg':
        return <Image color="primary" />;
      case 'docx':
      case 'doc':
        return <Description color="info" />;
      default:
        return <InsertDriveFile />;
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.filename?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { title: 'إجمالي المستندات', value: documents.length || '234', icon: Description, color: 'primary' },
    { title: 'المجلدات', value: '12', icon: Folder, color: 'success' },
    { title: 'المساحة المستخدمة', value: '15.2 GB', icon: Archive, color: 'warning' },
    { title: 'تم رفعها اليوم', value: '8', icon: CloudUpload, color: 'info' },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة المستندات
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setOpenUploadDialog(true)}
        >
          رفع ملف
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="بحث عن مستند..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>التصنيف</InputLabel>
            <Select
              value={filterType}
              label="التصنيف"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="reports">تقارير</MenuItem>
              <MenuItem value="hr">موارد بشرية</MenuItem>
              <MenuItem value="branding">علامة تجارية</MenuItem>
              <MenuItem value="meetings">اجتماعات</MenuItem>
              <MenuItem value="general">عام</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>النوع</TableCell>
                <TableCell>اسم الملف</TableCell>
                <TableCell>التصنيف</TableCell>
                <TableCell>الحجم</TableCell>
                <TableCell>رفع بواسطة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوسوم</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc._id}>
                  <TableCell>{getFileIcon(doc.type)}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {doc.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.filename}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={doc.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell>{doc.uploadedBy}</TableCell>
                  <TableCell>{doc.uploadDate}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {doc.tags?.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={(e) => handleMenuClick(e, doc)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleDownload(selectedDoc)}>
          <Download fontSize="small" sx={{ mr: 1 }} /> تحميل
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Visibility fontSize="small" sx={{ mr: 1 }} /> معاينة
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> تعديل
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedDoc)}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> حذف
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رفع مستند جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{ height: 100 }}
              >
                {selectedFile ? selectedFile.name : 'اختر ملفاً للرفع'}
                <input type="file" hidden onChange={handleFileSelect} />
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان المستند"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={formData.category}
                  label="التصنيف"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="general">عام</MenuItem>
                  <MenuItem value="reports">تقارير</MenuItem>
                  <MenuItem value="hr">موارد بشرية</MenuItem>
                  <MenuItem value="branding">علامة تجارية</MenuItem>
                  <MenuItem value="meetings">اجتماعات</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوسوم (مفصولة بفاصلة)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="مثال: تقرير، مبيعات، 2026"
              />
            </Grid>
            {uploadProgress > 0 && (
              <Grid item xs={12}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" sx={{ mt: 1 }}>
                  {uploadProgress}%
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleUpload} disabled={!selectedFile || uploadProgress > 0}>
            رفع
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
