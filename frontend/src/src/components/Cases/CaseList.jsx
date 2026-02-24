import React, { useState, useEffect } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CaseDetails from './CaseDetails';

/**
 * CaseList
 * 
 * الوصف: قائمة الحالات مع الإجراءات
 * - عرض جميع الحالات
 * - تحرير/حذف/عرض الحالات
 * - تصفية وبحث
 */

function CaseList({ cases, loading, onSelectCase, onTabChange }) {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

  const priorityColor = {
    low: 'success',
    normal: 'info',
    high: 'warning',
    urgent: 'error',
    critical: 'error',
  };

  const statusColor = {
    pending_review: 'default',
    under_assessment: 'info',
    approved: 'success',
    rejected: 'error',
    waitlist: 'warning',
    active: 'success',
    on_hold: 'warning',
    completed: 'success',
    transferred: 'info',
    discontinued: 'error',
  };

  const handleViewDetails = (caseItem) => {
    setSelectedCase(caseItem);
    setShowDetails(true);
  };

  const handleDeleteCase = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/cases/${deleteConfirm._id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setDeleteConfirm(null);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error deleting case:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell align="right"><strong>رقم الحالة</strong></TableCell>
              <TableCell align="right"><strong>اسم المستفيد</strong></TableCell>
              <TableCell align="right"><strong>العمر</strong></TableCell>
              <TableCell align="right"><strong>نوع الإعاقة</strong></TableCell>
              <TableCell align="center"><strong>الحالة</strong></TableCell>
              <TableCell align="center"><strong>الأولوية</strong></TableCell>
              <TableCell align="center"><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.length > 0 ? (
              cases.map((caseItem) => (
                <TableRow key={caseItem._id} hover>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {caseItem.caseNumber}
                  </TableCell>
                  <TableCell align="right">
                    {caseItem.beneficiaryId?.fullName || 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    {caseItem.beneficiaryId?.age || 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    {caseItem.disabilityInfo?.primaryDisability || 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={caseItem.admissionInfo?.status}
                      color={statusColor[caseItem.admissionInfo?.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={caseItem.admissionInfo?.priority}
                      color={priorityColor[caseItem.admissionInfo?.priority] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(caseItem)}
                      title="عرض التفاصيل"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="تعديل"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirm(caseItem)}
                      title="حذف"
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="textSecondary">
                    لا توجد حالات
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* معالج عرض التفاصيل */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>تفاصيل الحالة - {selectedCase?.caseNumber}</DialogTitle>
        <DialogContent>
          {selectedCase && <CaseDetails caseData={selectedCase} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل تريد فعلاً حذف الحالة {deleteConfirm?.caseNumber}؟ لا يمكن التراجع عن هذا الإجراء.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
          <Button
            onClick={handleDeleteCase}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CaseList;
