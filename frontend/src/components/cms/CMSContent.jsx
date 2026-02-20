import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { fetchContent, deleteContent } from '../../store/slices/cmsSlice';

const CMSContent = () => {
  const dispatch = useDispatch();
  const { content, loading, error } = useSelector((state) => state.cms);

  useEffect(() => {
    dispatch(fetchContent());
  }, [dispatch]);

  const handleDelete = (contentId) => {
    if (window.confirm('هل تريد حذف هذا المحتوى؟')) {
      dispatch(deleteContent(contentId));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        إدارة المحتوى
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تاريخ التحديث</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {content.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.title}</TableCell>
                <TableCell>
                  <Chip label={item.contentType} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.published ? 'منشور' : 'مسودة'}
                    color={item.published ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(item.updatedAt).toLocaleDateString('ar-SA')}
                </TableCell>
                <TableCell>
                  <Button size="small" startIcon={<EditIcon />} sx={{ mr: 1 }}>
                    تعديل
                  </Button>
                  {!item.published && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<PublishIcon />}
                      sx={{ mr: 1 }}
                    >
                      نشر
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(item.id)}
                  >
                    حذف
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

export default CMSContent;
