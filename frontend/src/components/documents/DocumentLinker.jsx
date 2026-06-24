import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import documentHubApi from '../../services/documentHubApi';
import logger from '../../utils/logger';

const ENTITY_TYPES = [
  { value: 'Employee', label: 'موظف' },
  { value: 'Beneficiary', label: 'مستفيد' },
  { value: 'CaseManagement', label: 'حالة طبية' },
  { value: 'Invoice', label: 'فاتورة' },
  { value: 'Payment', label: 'دفعة' },
];

export default function DocumentLinker({
  documentId: initialDocumentId,
  entityType: initialEntityType,
  entityId: initialEntityId,
  onLinked,
}) {
  const [documentId, setDocumentId] = useState(initialDocumentId || '');
  const [entityType, setEntityType] = useState(initialEntityType || 'Beneficiary');
  const [entityId, setEntityId] = useState(initialEntityId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialDocumentId) setDocumentId(initialDocumentId);
    if (initialEntityType) setEntityType(initialEntityType);
    if (initialEntityId) setEntityId(initialEntityId);
  }, [initialDocumentId, initialEntityType, initialEntityId]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!documentId.trim() || !entityId.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await documentHubApi.link(documentId.trim(), entityType, entityId.trim());
      setSuccess(true);
      if (onLinked) onLinked();
    } catch (err) {
      logger.error('خطأ في ربط المستند:', err);
      setError('فشل ربط المستند بالكيان');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        ربط المستند بكيان
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          تم الربط بنجاح
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {!initialDocumentId && (
          <TextField
            label="معرّف المستند"
            value={documentId}
            onChange={e => setDocumentId(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
        )}

        <TextField
          select
          label="نوع الكيان"
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {ENTITY_TYPES.map(t => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="معرّف الكيان"
          value={entityId}
          onChange={e => setEntityId(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={loading || !documentId.trim() || !entityId.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          ربط
        </Button>
      </Box>
    </Box>
  );
}
