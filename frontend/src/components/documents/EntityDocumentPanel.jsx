import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import documentHubApi from '../../services/documentHubApi';
import logger from '../../utils/logger';
import DocumentLinker from './DocumentLinker';

export default function EntityDocumentPanel({ entityType, entityId, allowUpload = true }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentHubApi.getEntityDocuments(entityType, entityId);
      setDocuments(res.documents || []);
    } catch (err) {
      logger.error('خطأ في جلب مستندات الكيان:', err);
      setError('فشل تحميل المستندات');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async doc => {
    try {
      await documentHubApi.download(doc._id, doc.originalFileName || doc.fileName);
    } catch (err) {
      logger.error('خطأ في التنزيل:', err);
      setError('فشل تنزيل الملف');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">المستندات المرتبطة</Typography>
        {allowUpload && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AttachIcon />}
            onClick={() => setLinkDialogOpen(true)}
          >
            ربط مستند
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={24} />
      ) : documents.length === 0 ? (
        <Typography color="text.secondary">لا توجد مستندات مرتبطة</Typography>
      ) : (
        <List dense>
          {documents.map(doc => (
            <ListItem key={doc._id} divider>
              <ListItemText
                primary={doc.title || doc.originalFileName}
                secondary={`${doc.fileType} · ${(doc.fileSize / 1024).toFixed(1)} KB · ${doc.category}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  href={documentHubApi.previewUrl(doc._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ViewIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleDownload(doc)}>
                  <DownloadIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ربط مستند موجود</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            أدخل معرّف مستند من مركز المستندات لربطه بهذا الكيان.
          </Typography>
          <DocumentLinker
            documentId=""
            onLinked={() => {
              setLinkDialogOpen(false);
              fetchDocuments();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
