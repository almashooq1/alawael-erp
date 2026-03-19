import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * CaseDetails
 * 
 * الوصف: عرض تفاصيل الحالة الكاملة
 * - بيانات المستفيد والإعاقة
 * - التاريخ الطبي والأدوية
 * - الفريق الطبي والملاحظات
 * - خطة التعليم المخصصة (IEP)
 * - الإحصائيات والتقدم
 */

function CaseDetails({ caseData }) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteData, setNoteData] = useState({
    content: '',
    category: 'general',
    priority: 'normal',
  });
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

  const handleAddNote = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/cases/${caseData._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (response.ok) {
        setShowAddNote(false);
        setNoteData({ content: '', category: 'general', priority: 'normal' });
        window.location.reload();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = {
    mild: 'success',
    moderate: 'info',
    severe: 'warning',
    profound: 'error',
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* بيانات المستفيد */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>👤 بيانات المستفيد</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                الاسم الكامل
              </Typography>
              <Typography variant="body1">
                {caseData.beneficiaryId?.fullName || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                العمر
              </Typography>
              <Typography variant="body1">
                {caseData.beneficiaryId?.age || 'N/A'} سنة
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                الجنس
              </Typography>
              <Typography variant="body1">
                {caseData.beneficiaryId?.gender === 'male' ? 'ذكر' : 'أنثى'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                رقم الهوية الوطنية
              </Typography>
              <Typography variant="body1">
                {caseData.beneficiaryId?.nationalId || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* معلومات الإعاقة */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>♿ معلومات الإعاقة</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                نوع الإعاقة الرئيسية
              </Typography>
              <Typography variant="body1">
                {caseData.disabilityInfo?.primaryDisability || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                درجة الخطورة
              </Typography>
              <Chip
                label={caseData.disabilityInfo?.severity}
                color={severityColor[caseData.disabilityInfo?.severity] || 'default'}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                تاريخ التشخيص
              </Typography>
              <Typography variant="body1">
                {caseData.disabilityInfo?.diagnosisDate
                  ? new Date(caseData.disabilityInfo.diagnosisDate).toLocaleDateString('ar-SA')
                  : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* معلومات القبول */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>📋 معلومات القبول</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} sx={{ width: '100%' }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                الحالة
              </Typography>
              <Chip label={caseData.admissionInfo?.status} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                الأولوية
              </Typography>
              <Chip label={caseData.admissionInfo?.priority} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                تاريخ الطلب
              </Typography>
              <Typography variant="body1">
                {caseData.admissionInfo?.applicationDate
                  ? new Date(caseData.admissionInfo.applicationDate).toLocaleDateString('ar-SA')
                  : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                تاريخ القبول
              </Typography>
              <Typography variant="body1">
                {caseData.admissionInfo?.admissionDate
                  ? new Date(caseData.admissionInfo.admissionDate).toLocaleDateString('ar-SA')
                  : 'لم يتم القبول بعد'}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* التاريخ الطبي */}
      {caseData.medicalHistory && caseData.medicalHistory.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>🏥 التاريخ الطبي</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ width: '100%' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التشخيص</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {caseData.medicalHistory.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.diagnosis}</TableCell>
                      <TableCell>
                        {new Date(item.diagnosisDate).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* الأدوية الحالية */}
      {caseData.currentMedications && caseData.currentMedications.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>💊 الأدوية الحالية</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ width: '100%' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الدواء</TableCell>
                    <TableCell>الجرعة</TableCell>
                    <TableCell>التكرار</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {caseData.currentMedications.map((med, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{med.name}</TableCell>
                      <TableCell>{med.dosage}</TableCell>
                      <TableCell>{med.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* الحساسية */}
      {caseData.allergies && caseData.allergies.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>⚠️ الحساسية</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1} sx={{ width: '100%' }}>
              {caseData.allergies.map((allergy, idx) => (
                <Box key={idx}>
                  <Typography variant="body2" color="textSecondary">
                    {allergy.allergen}
                  </Typography>
                  <Chip
                    label={allergy.reaction}
                    size="small"
                    color={
                      allergy.severity === 'severe' ? 'error' :
                      allergy.severity === 'moderate' ? 'warning' :
                      'success'
                    }
                  />
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* الفريق الطبي */}
      {caseData.assignedTeam && caseData.assignedTeam.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>👥 الفريق الطبي ({caseData.assignedTeam.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ width: '100%' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>التخصص</TableCell>
                    <TableCell>دور</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {caseData.assignedTeam.map((member, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{member.userId?.name || 'N/A'}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        {member.isPrimary ? (
                          <Chip label="أساسي" size="small" color="primary" />
                        ) : (
                          <Chip label="مساعد" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* الملاحظات */}
      {caseData.teamNotes && caseData.teamNotes.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>📝 الملاحظات ({caseData.teamNotes.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2} sx={{ width: '100%' }}>
              {caseData.teamNotes.map((note, idx) => (
                <Box key={idx} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {note.author?.name || 'غير معروف'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(note.createdAt).toLocaleDateString('ar-SA')}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{note.content}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip size="small" label={note.category} sx={{ mr: 1 }} />
                    <Chip
                      size="small"
                      label={note.priority}
                      color={
                        note.priority === 'critical' ? 'error' :
                        note.priority === 'high' ? 'warning' :
                        'default'
                      }
                    />
                  </Box>
                </Box>
              ))}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setShowAddNote(true)}
              >
                ➕ إضافة ملاحظة
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* إضافة ملاحظة */}
      <Dialog open={showAddNote} onClose={() => setShowAddNote(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة ملاحظة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="محتوى الملاحظة"
              value={noteData.content}
              onChange={(e) =>
                setNoteData(prev => ({ ...prev, content: e.target.value }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={noteData.category}
                onChange={(e) =>
                  setNoteData(prev => ({ ...prev, category: e.target.value }))
                }
                label="الفئة"
              >
                <MenuItem value="general">عام</MenuItem>
                <MenuItem value="medical">طبي</MenuItem>
                <MenuItem value="behavioral">سلوكي</MenuItem>
                <MenuItem value="progress">تقدم</MenuItem>
                <MenuItem value="family">عائلي</MenuItem>
                <MenuItem value="administrative">إداري</MenuItem>
                <MenuItem value="urgent">عاجل</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={noteData.priority}
                onChange={(e) =>
                  setNoteData(prev => ({ ...prev, priority: e.target.value }))
                }
                label="الأولوية"
              >
                <MenuItem value="low">منخفضة</MenuItem>
                <MenuItem value="normal">عادية</MenuItem>
                <MenuItem value="high">مرتفعة</MenuItem>
                <MenuItem value="critical">حرجة</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddNote(false)}>إلغاء</Button>
          <Button
            onClick={handleAddNote}
            variant="contained"
            disabled={loading || !noteData.content.trim()}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CaseDetails;
