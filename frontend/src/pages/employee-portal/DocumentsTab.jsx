/**
 * DocumentsTab — Employee portal documents listing
 * Extracted from EmployeePortal.js for maintainability
 */




import { statusColors } from '../../theme/palette';
import documentService from 'services/documentService';

export default function DocumentsTab({ documents, loading }) {
  const handleDownload = async doc => {
    const docId = doc._id || doc.id;
    const fileName = doc.originalFileName || doc.name || doc.title || 'document';
    try {
      await documentService.downloadDocument(docId, fileName);
    } catch {
      window.alert('خطأ في تنزيل المستند. يرجى المحاولة لاحقاً');
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="textSecondary">جاري تحميل المستندات...</Typography>
      </Box>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <FolderOpenIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
        <Typography color="textSecondary" variant="h6">
          لا توجد مستندات
        </Typography>
        <Typography variant="body2" color="textSecondary">
          لم يتم تحميل أي مستندات بعد
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        مستنداتي ({documents.length})
      </Typography>
      <Grid container spacing={2}>
        {documents.map(doc => (
          <Grid item xs={12} sm={6} md={4} key={doc._id || doc.id}>
            <Card
              sx={{ borderRadius: 3, '&:hover': { boxShadow: 6 }, transition: 'box-shadow 0.2s' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'info.50',
                      color: statusColors.primaryBlue,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <DocIcon />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight="bold" noWrap>
                      {doc.name || doc.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.uploadDate || (doc.createdAt && new Date(doc.createdAt).toLocaleDateString('ar-SA'))}
                      {doc.size ? ` • ${doc.size}` : doc.fileSize ? ` • ${documentService.formatFileSize(doc.fileSize)}` : ''}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  fullWidth
                  onClick={() => handleDownload(doc)}
                >
                  تحميل
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
