import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  QrCode2 as QRCodeIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Timeline as TimelineIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  LocalOffer as TagIcon,
  Category as CategoryIcon,
  FolderSpecial as FolderIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const TrackingAndArchiving = ({ communicationId }) => {
  const [communication, setCommunication] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [archiveInfo, setArchiveInfo] = useState(null);
  const [relatedCommunications, setRelatedCommunications] = useState([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [archiveData, setArchiveData] = useState({
    category: '',
    subCategory: '',
    archiveLocation: '',
    retentionPeriod: '5',
    accessLevel: 'restricted',
    tags: [],
    notes: '',
  });

  useEffect(() => {
    loadCommunicationDetails();
    loadTrackingInfo();
    loadArchiveInfo();
    loadRelatedCommunications();
  }, [communicationId]);

  const loadCommunicationDetails = async () => {
    try {
      const response = await axios.get(`/api/communications/${communicationId}`);
      setCommunication(response.data);
    } catch (error) {
      console.error('Error loading communication:', error);
    }
  };

  const loadTrackingInfo = async () => {
    try {
      const response = await axios.get(`/api/communications/${communicationId}/tracking`);
      setTrackingInfo(response.data);
    } catch (error) {
      console.error('Error loading tracking:', error);
    }
  };

  const loadArchiveInfo = async () => {
    try {
      const response = await axios.get(`/api/communications/${communicationId}/archive`);
      setArchiveInfo(response.data);
    } catch (error) {
      console.error('Error loading archive:', error);
    }
  };

  const loadRelatedCommunications = async () => {
    try {
      const response = await axios.get(`/api/communications/${communicationId}/related`);
      setRelatedCommunications(response.data);
    } catch (error) {
      console.error('Error loading related:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await axios.post(`/api/communications/${communicationId}/archive`, archiveData);
      setShowArchiveDialog(false);
      loadArchiveInfo();
      alert('تم أرشفة المراسلة بنجاح');
    } catch (error) {
      console.error('Error archiving:', error);
      alert('خطأ في الأرشفة');
    }
  };

  const handleUnarchive = async () => {
    if (!window.confirm('هل أنت متأكد من استرجاع المراسلة من الأرشيف؟')) return;
    try {
      await axios.post(`/api/communications/${communicationId}/unarchive`);
      loadArchiveInfo();
      alert('تم استرجاع المراسلة من الأرشيف');
    } catch (error) {
      console.error('Error unarchiving:', error);
      alert('خطأ في الاسترجاع');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/api/communications/${communicationId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `communication_${communicationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('خطأ في تحميل PDF');
    }
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
  };

  if (!communication) return <LinearProgress />;

  return (
    <Box>
      {/* معلومات التتبع */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              📊 معلومات التتبع
            </Typography>
            <Box>
              <Tooltip title="عرض QR Code">
                <IconButton onClick={() => setShowQRDialog(true)}>
                  <QRCodeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="طباعة">
                <IconButton onClick={handlePrint}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="تحميل PDF">
                <IconButton onClick={handleDownloadPDF}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="رقم المراسلة"
                    secondary={communication.referenceNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="تاريخ الإنشاء"
                    secondary={formatDate(communication.createdAt)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="المنشئ"
                    secondary={communication.creatorName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="القسم"
                    secondary={communication.department || 'غير محدد'}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="الحالة الحالية"
                    secondary={<Chip label={communication.status} size="small" color="primary" />}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="عدد المشاهدات"
                    secondary={trackingInfo?.viewCount || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="آخر تحديث"
                    secondary={formatDate(communication.updatedAt)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="مدة المعالجة"
                    secondary={trackingInfo?.processingDays ? `${trackingInfo.processingDays} يوم` : 'جاري المعالجة'}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* سجل التتبع */}
      {trackingInfo?.history && trackingInfo.history.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              سجل التتبع
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الإجراء</TableCell>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>الملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trackingInfo.history.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(event.timestamp)}</TableCell>
                    <TableCell>
                      <Chip label={event.action} size="small" />
                    </TableCell>
                    <TableCell>{event.userName}</TableCell>
                    <TableCell>{event.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* معلومات الأرشفة */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              📁 معلومات الأرشفة
            </Typography>
            {archiveInfo?.isArchived ? (
              <Button
                variant="outlined"
                startIcon={<UnarchiveIcon />}
                onClick={handleUnarchive}
              >
                استرجاع من الأرشيف
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<ArchiveIcon />}
                onClick={() => setShowArchiveDialog(true)}
              >
                أرشفة المراسلة
              </Button>
            )}
          </Box>

          {archiveInfo?.isArchived ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  <Typography variant="subtitle2">تم الأرشفة</Typography>
                  <Typography variant="body2">
                    {formatDate(archiveInfo.archivedAt)}
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Alert severity="warning">
                  <Typography variant="subtitle2">مدة الاحتفاظ</Typography>
                  <Typography variant="body2">
                    {archiveInfo.retentionPeriod} سنوات
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="التصنيف"
                      secondary={`${archiveInfo.category} / ${archiveInfo.subCategory}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="موقع الأرشيف"
                      secondary={archiveInfo.archiveLocation}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="مستوى الوصول"
                      secondary={<Chip label={archiveInfo.accessLevel} size="small" />}
                    />
                  </ListItem>
                  {archiveInfo.tags && archiveInfo.tags.length > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="الوسوم"
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {archiveInfo.tags.map((tag, index) => (
                              <Chip key={index} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              لم يتم أرشفة هذه المراسلة بعد
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* المراسلات المرتبطة */}
      {relatedCommunications.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔗 مراسلات مرتبطة ({relatedCommunications.length})
            </Typography>
            <List>
              {relatedCommunications.map((related, index) => (
                <React.Fragment key={related.id}>
                  {index > 0 && <Divider />}
                  <ListItem button>
                    <ListItemText
                      primary={related.subject}
                      secondary={
                        <>
                          <Chip label={related.type} size="small" sx={{ mr: 1 }} />
                          <Chip label={related.status} size="small" />
                          {' • '}
                          {formatDate(related.createdAt)}
                        </>
                      }
                    />
                    <IconButton>
                      <ViewIcon />
                    </IconButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* نافذة QR Code */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)}>
        <DialogTitle>QR Code للمراسلة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <QRCodeSVG
              value={`${window.location.origin}/communications/${communicationId}`}
              size={256}
              level="H"
              includeMargin
            />
            <Typography variant="caption" sx={{ mt: 2 }}>
              رقم المراسلة: {communication.referenceNumber}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>إغلاق</Button>
          <Button variant="contained" onClick={() => {
            // TODO: Implement QR code download
          }}>
            تحميل
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة الأرشفة */}
      <Dialog open={showArchiveDialog} onClose={() => setShowArchiveDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>أرشفة المراسلة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>التصنيف الرئيسي</InputLabel>
                <Select
                  value={archiveData.category}
                  onChange={(e) => setArchiveData({ ...archiveData, category: e.target.value })}
                  label="التصنيف الرئيسي"
                >
                  <MenuItem value="administrative">إدارية</MenuItem>
                  <MenuItem value="financial">مالية</MenuItem>
                  <MenuItem value="hr">موارد بشرية</MenuItem>
                  <MenuItem value="medical">طبية</MenuItem>
                  <MenuItem value="legal">قانونية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="التصنيف الفرعي"
                value={archiveData.subCategory}
                onChange={(e) => setArchiveData({ ...archiveData, subCategory: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="موقع الأرشيف"
                value={archiveData.archiveLocation}
                onChange={(e) => setArchiveData({ ...archiveData, archiveLocation: e.target.value })}
                placeholder="مثال: خزانة A - رف 3 - ملف 12"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>مدة الاحتفاظ (بالسنوات)</InputLabel>
                <Select
                  value={archiveData.retentionPeriod}
                  onChange={(e) => setArchiveData({ ...archiveData, retentionPeriod: e.target.value })}
                  label="مدة الاحتفاظ (بالسنوات)"
                >
                  <MenuItem value="1">سنة واحدة</MenuItem>
                  <MenuItem value="3">3 سنوات</MenuItem>
                  <MenuItem value="5">5 سنوات</MenuItem>
                  <MenuItem value="10">10 سنوات</MenuItem>
                  <MenuItem value="permanent">دائم</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>مستوى الوصول</InputLabel>
                <Select
                  value={archiveData.accessLevel}
                  onChange={(e) => setArchiveData({ ...archiveData, accessLevel: e.target.value })}
                  label="مستوى الوصول"
                >
                  <MenuItem value="public">عام</MenuItem>
                  <MenuItem value="internal">داخلي</MenuItem>
                  <MenuItem value="restricted">مقيد</MenuItem>
                  <MenuItem value="confidential">سري</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الملاحظات"
                multiline
                rows={3}
                value={archiveData.notes}
                onChange={(e) => setArchiveData({ ...archiveData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowArchiveDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleArchive} startIcon={<ArchiveIcon />}>
            أرشفة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrackingAndArchiving;
