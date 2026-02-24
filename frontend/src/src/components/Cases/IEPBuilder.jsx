import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Stack, Grid, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

/**
 * IEPBuilder
 * الوصف: محرر خطة التعليم المخصصة (IEP)
 */
function IEPBuilder({ caseId, onSave, onClose }) {
  const [iepData, setIepData] = useState({
    goals: [],
    accommodations: [],
    services: [],
  });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>📚 خطة التعليم المخصصة</Typography>
      <Stack spacing={2}>
        <Button variant="contained" fullWidth>➕ إضافة هدف</Button>
        <Button variant="contained" fullWidth>➕ إضافة تسهيل</Button>
        <Button onClick={onSave} variant="contained" color="success" fullWidth>💾 حفظ IEP</Button>
      </Stack>
    </Box>
  );
}

export default IEPBuilder;
