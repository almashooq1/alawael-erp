/**
 * Document List Component
 * مكون قائمة المستندات
 */

import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import documentService from '../../services/documentService';

const DocumentList = ({ documents, onRefresh, onShare }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleMenuOpen = (event, doc) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(doc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = async (doc) => {
    try {
      await documentService.downloadDocument(doc._id, doc.originalFileName);
    } catch (error) {
      alert('خطأ في تنزيل المستند: ' + error.message);
    }
    handleMenuClose();
  };

  const handleDelete = async (doc) => {
    if (window.confirm('هل تريد حذف هذا المستند؟')) {
      try {
        await documentService.deleteDocument(doc._id);
        alert('تم حذف المستند بنجاح');
        if (onRefresh) onRefresh();
      } catch (error) {
        alert('خطأ في حذف المستند: ' + error.message);
      }
    }
    handleMenuClose();
  };

  const handleShowDetails = (doc) => {
    setSelectedDoc(doc);
    setDetailsOpen(true);
    handleMenuClose();
  };

  const getCategoryColor = (category) => {
    const colors = {
      تقارير: 'info',
      عقود: 'warning',
      سياسات: 'success',
      تدريب: 'primary',
      مالي: 'error',
      أخرى: 'default',
    };
    return colors[category] || 'default';
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                النوع
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحجم</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents && documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc._id} hover>
                  <TableCell align="center" sx={{ fontSize: '20px' }}>
                    {documentService.getFileIcon(doc.fileType)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {doc.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {doc.originalFileName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={doc.category}
                      size="small"
                      color={getCategoryColor(doc.category)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{documentService.formatFileSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    {new Date(doc.createdAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, doc)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">لا توجد مستندات</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* القائمة العائمة */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleDownload(selectedDoc)}>
          <DownloadIcon sx={{ mr: 1 }} />
          تنزيل
        </MenuItem>
        <MenuItem onClick={() => onShare && onShare(selectedDoc)}>
          <ShareIcon sx={{ mr: 1 }} />
          مشاركة
        </MenuItem>
        <MenuItem onClick={() => handleShowDetails(selectedDoc)}>
          <InfoIcon sx={{ mr: 1 }} />
          التفاصيل
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedDoc)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* نافذة التفاصيل */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل المستند</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedDoc && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  العنوان
                </Typography>
                <Typography variant="body1">{selectedDoc.title}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الوصف
                </Typography>
                <Typography variant="body2">{selectedDoc.description || 'لا يوجد'}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الفئة
                </Typography>
                <Chip label={selectedDoc.category} size="small" sx={{ mt: 1 }} />
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الحجم
                </Typography>
                <Typography variant="body2">
                  {documentService.formatFileSize(selectedDoc.fileSize)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  تاريخ التحميل
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedDoc.createdAt).toLocaleDateString('ar-SA')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  المحمل من قبل
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {selectedDoc.uploadedByName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">{selectedDoc.uploadedByName}</Typography>
                </Box>
              </Box>

              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الوسوم
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {selectedDoc.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الإحصائيات
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  👁️ تم عرضه {selectedDoc.viewCount || 0} مرة
                </Typography>
                <Typography variant="body2">
                  📥 تم تنزيله {selectedDoc.downloadCount || 0} مرة
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentList;
