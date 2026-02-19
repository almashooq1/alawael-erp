/**
 * Quality Review Interface Component
 * واجهة مراجعة الجودة
 *
 * For supervisors to review and approve therapy documentation (SOAP notes)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Rating,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Grid,
  Paper
} from '@mui/material';
import { CheckCircle, Edit, Visibility, Warning } from '@mui/icons-material';
import axios from 'axios';
import { format, formatDistance } from 'date-fns';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
});

// ============================================
// QUALITY REVIEW INTERFACE
// ============================================

export default function QualityReviewInterface() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [documentations, setDocumentations] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({
    qualityScore: 3,
    status: 'approved',
    issues: [],
    suggestions: [],
    feedback: ''
  });

  useEffect(() => {
    fetchDocumentations();
  }, [tabValue]);

  const fetchDocumentations = async () => {
    try {
      setLoading(true);
      const status = tabValue === 0 ? 'pending' : tabValue === 1 ? 'approved' : 'revision';
      const response = await api.get('/therapy-sessions/documentation/quality', {
        params: { status, limit: 50 }
      });
      setDocumentations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch documentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (doc) => {
    setSelectedDoc(doc);
    setReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    try {
      await api.post(
        `/therapy-sessions/${selectedDoc.session._id}/documentation/review`,
        {
          qualityScore: reviewData.qualityScore,
          status: reviewData.status,
          issues: reviewData.issues,
          suggestions: reviewData.suggestions,
          feedback: reviewData.feedback
        }
      );

      setReviewDialog(false);
      fetchDocumentations();
      alert('Review submitted successfully');
    } catch (error) {
      alert('Failed to submit review: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'approved': 'success',
      'revision': 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending Review',
      'approved': 'Approved',
      'revision': 'Needs Revision'
    };
    return labels[status] || status;
  };

  if (loading && documentations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingCount = documentations.filter(d => d.quality?.status === 'pending').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Documentation Quality Review
      </Typography>

      {pendingCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have <strong>{pendingCount}</strong> documentation(s) pending review.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label={`Pending Review (${pendingCount})`} />
        <Tab label="Approved" />
        <Tab label="Needs Revision" />
      </Tabs>

      {/* Documentation Table */}
      <Card>
        <CardContent>
          {documentations.length === 0 ? (
            <Typography color="textSecondary">No documentations found</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Therapist</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Quality Score</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentations.map((doc) => (
                  <TableRow key={doc._id} hover>
                    <TableCell>
                      {format(new Date(doc.session.date), 'MMM dd, yyyy')}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {formatDistance(new Date(doc.createdAt), new Date(), { addSuffix: true })}
                      </Typography>
                    </TableCell>
                    <TableCell>{doc.beneficiary.name}</TableCell>
                    <TableCell>{doc.therapist.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(doc.quality?.status)}
                        color={getStatusColor(doc.quality?.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {doc.quality?.scoreComment ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <Rating
                            value={doc.quality.scoreComment}
                            readOnly
                            size="small"
                          />
                          <Typography variant="caption">
                            {doc.quality.scoreComment}/5
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleReviewClick(doc)}
                        startIcon={<Edit />}
                      >
                        {doc.quality?.status === 'pending' ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Documentation Review</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedDoc && (
            <Box>
              {/* Documentation Preview */}
              <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f9f9f9' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Session Information
                </Typography>
                <Typography variant="body2">
                  <strong>Patient:</strong> {selectedDoc.beneficiary.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Therapist:</strong> {selectedDoc.therapist.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {format(new Date(selectedDoc.session.date), 'MMMM dd, yyyy')}
                </Typography>

                {/* SOAP Preview */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Clinical Notes Summary
                  </Typography>

                  {selectedDoc.soapNote?.subjective && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="primary">
                        <strong>Subjective:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 2, whiteSpace: 'pre-wrap' }}>
                        {selectedDoc.soapNote.subjective.patientReports?.substring(0, 100)}...
                      </Typography>
                    </Box>
                  )}

                  {selectedDoc.soapNote?.objective && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="primary">
                        <strong>Objective:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 2 }}>
                        Accuracy: {selectedDoc.soapNote.objective.accuracy}% |
                        Reps: {selectedDoc.soapNote.objective.repetitions} |
                        Assistance: {selectedDoc.soapNote.objective.assistanceLevel}
                      </Typography>
                    </Box>
                  )}

                  {selectedDoc.soapNote?.assessment && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="primary">
                        <strong>Assessment:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 2, whiteSpace: 'pre-wrap' }}>
                        {selectedDoc.soapNote.assessment.progressSummary?.substring(0, 100)}...
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Review Form */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Your Review
                </Typography>

                {/* Quality Score */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Quality Score
                  </Typography>
                  <Rating
                    value={reviewData.qualityScore}
                    onChange={(e, newValue) =>
                      setReviewData({ ...reviewData, qualityScore: newValue })
                    }
                    size="large"
                  />
                </Box>

                {/* Status */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Review Status</InputLabel>
                  <Select
                    value={reviewData.status}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, status: e.target.value })
                    }
                  >
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="revision">Needs Revision</MenuItem>
                    <MenuItem value="pending">Need More Info</MenuItem>
                  </Select>
                </FormControl>

                {/* Issues */}
                <TextField
                  fullWidth
                  label="Issues Found"
                  multiline
                  rows={2}
                  placeholder="List any issues with the documentation"
                  sx={{ mb: 2 }}
                  value={reviewData.issues.join('\n')}
                  onChange={(e) =>
                    setReviewData({
                      ...reviewData,
                      issues: e.target.value.split('\n').filter(i => i.trim())
                    })
                  }
                  variant="outlined"
                />

                {/* Suggestions */}
                <TextField
                  fullWidth
                  label="Suggestions for Improvement"
                  multiline
                  rows={2}
                  placeholder="Provide constructive feedback"
                  sx={{ mb: 2 }}
                  value={reviewData.suggestions.join('\n')}
                  onChange={(e) =>
                    setReviewData({
                      ...reviewData,
                      suggestions: e.target.value.split('\n').filter(i => i.trim())
                    })
                  }
                  variant="outlined"
                />

                {/* General Feedback */}
                <TextField
                  fullWidth
                  label="General Feedback"
                  multiline
                  rows={2}
                  placeholder="Optional comments to share with the therapist"
                  value={reviewData.feedback}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, feedback: e.target.value })
                  }
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color="primary"
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
