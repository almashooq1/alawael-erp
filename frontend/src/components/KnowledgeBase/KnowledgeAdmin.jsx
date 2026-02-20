import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';

const KnowledgeAdmin = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'best_practices',
    tags: '',
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/knowledge/articles?limit=100`);
      setArticles(response.data.data.articles);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        description: article.description,
        content: article.content,
        category: article.category,
        tags: article.tags.join(', '),
      });
    } else {
      setEditingArticle(null);
      setFormData({
        title: '',
        description: '',
        content: '',
        category: 'best_practices',
        tags: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingArticle(null);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter((t) => t),
      };

      if (editingArticle) {
        await axios.put(
          `${API_BASE_URL}/knowledge/articles/${editingArticle._id}`,
          payload
        );
      } else {
        await axios.post(`${API_BASE_URL}/knowledge/articles`, payload);
      }

      alert('تم الحفظ بنجاح');
      handleCloseDialog();
      fetchArticles();
    } catch (error) {
      console.error('Failed to save article:', error);
      alert('فشل الحفظ');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المقالة؟')) {
      try {
        await axios.delete(`${API_BASE_URL}/knowledge/articles/${id}`);
        alert('تم الحذف بنجاح');
        fetchArticles();
      } catch (error) {
        console.error('Failed to delete article:', error);
        alert('فشل الحذف');
      }
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      therapeutic_protocols: '🏥 بروتوكولات علاجية',
      case_studies: '📋 دراسات حالة',
      research_experiments: '🔬 أبحاث وتجارب',
      best_practices: '⭐ أفضل الممارسات',
    };
    return labels[category] || category;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>📚 إدارة قاعدة المعرفة</h1>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
          + إضافة مقالة
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>العنوان</TableCell>
                <TableCell>التصنيف</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المشاهدات</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article._id} hover>
                  <TableCell>{article.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(article.category)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={article.status}
                      size="small"
                      color={article.status === 'published' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{article.views}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(article)}
                      title="تعديل"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        window.open(`/knowledge/${article.slug}`, '_blank')
                      }
                      title="عرض"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(article._id)}
                      title="حذف"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingArticle ? 'تعديل مقالة' : 'إضافة مقالة جديدة'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="العنوان"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />

            <TextField
              fullWidth
              select
              label="التصنيف"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              SelectProps={{
                native: true,
              }}
            >
              <option value="therapeutic_protocols">بروتوكولات علاجية</option>
              <option value="case_studies">دراسات حالة</option>
              <option value="research_experiments">أبحاث وتجارب</option>
              <option value="best_practices">أفضل الممارسات</option>
            </TextField>

            <TextField
              fullWidth
              label="الوصف"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={3}
            />

            <TextField
              fullWidth
              label="المحتوى"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              multiline
              rows={6}
            />

            <TextField
              fullWidth
              label="الكلمات المفتاحية (مفصولة بفواصل)"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default KnowledgeAdmin;
