/**
 * ICF Assessment Form Page
 * صفحة نموذج تقييم ICF - إنشاء/تعديل
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Button, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { ICFForm } from '../../assessment/ICFEngine';

export default function ICFAssessmentForm() {
  const { id, beneficiaryId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const handleSave = (data) => {
    console.log('Assessment saved:', data);
    navigate('/icf-assessments');
  };

  const handleSubmit = (data) => {
    console.log('Assessment submitted:', data);
    navigate('/icf-assessments');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/icf-assessments')}
          sx={{ color: 'text.secondary' }}
        >
          رجوع
        </Button>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'تعديل تقييم ICF' : 'تقييم ICF جديد'}
        </Typography>
      </Paper>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <ICFForm
          beneficiaryId={beneficiaryId}
          assessmentId={id}
          coreSetType="rehab"
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}
