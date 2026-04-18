/**
 * BeneficiaryTypeahead — debounced typeahead for picking a beneficiary.
 *
 * Backs onto GET /api/admin/beneficiaries/search (Arabic-aware: see
 * backend/utils/arabicSearch.js). Designed for receptionist/therapist
 * workflows where typing 2–3 Arabic chars should surface the right
 * kid even with alef/ta-marbuta/alef-maksura variants.
 *
 * Usage:
 *   const [selected, setSelected] = useState(null);
 *   <BeneficiaryTypeahead
 *     value={selected}
 *     onChange={setSelected}
 *     label="اختر المستفيد"
 *     disabled={false}
 *   />
 *
 * Emits the full search-row object on change:
 *   { _id, beneficiaryNumber, name_ar, name_en, dateOfBirth, status, phone }
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField, Box, Chip, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api.client';

const DEBOUNCE_MS = 250;

function statusColor(s) {
  if (s === 'active') return 'success';
  if (s === 'waitlisted') return 'info';
  if (s === 'graduated') return 'primary';
  if (s === 'dropped' || s === 'terminated') return 'default';
  return 'default';
}

export default function BeneficiaryTypeahead({
  value = null,
  onChange,
  label = 'المستفيد',
  disabled = false,
  required = false,
  helperText = null,
  error = false,
  size = 'small',
  sx,
}) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce the backend fetch — typing 'احمد' shouldn't fire 4 requests.
  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setOptions([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api.get('/admin/beneficiaries/search', { params: { q } });
        if (!cancelled) setOptions(res.data.items || []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [input]);

  const getOptionLabel = useCallback(
    opt => (opt ? opt.name_ar || opt.name_en || opt.beneficiaryNumber || '—' : ''),
    []
  );

  const renderOption = useCallback((props, opt) => {
    const { key, ...rest } = props;
    return (
      <li key={key} {...rest}>
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {opt.name_ar || opt.name_en || 'غير مسمى'}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" noWrap>
              {opt.beneficiaryNumber || '—'}
              {opt.phone ? ` · ${opt.phone}` : ''}
            </Typography>
          </Box>
          {opt.status && (
            <Chip
              label={opt.status}
              size="small"
              color={statusColor(opt.status)}
              variant="outlined"
            />
          )}
        </Box>
      </li>
    );
  }, []);

  // Autocomplete requires reference-equal options OR an isOptionEqualToValue
  const isOptionEqualToValue = useCallback(
    (a, b) => String(a?._id || '') === String(b?._id || ''),
    []
  );

  const mergedOptions = useMemo(() => {
    // Keep the selected value reachable even when it isn't in the
    // current search hits (prevents MUI's 'value not in options' warning).
    if (value && !options.find(o => String(o._id) === String(value._id))) {
      return [value, ...options];
    }
    return options;
  }, [value, options]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, v) => onChange?.(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={mergedOptions}
      loading={loading}
      loadingText="جاري البحث..."
      noOptionsText={input.trim().length < 2 ? 'اكتب حرفين على الأقل' : 'لا نتائج'}
      disabled={disabled}
      size={size}
      getOptionLabel={getOptionLabel}
      renderOption={renderOption}
      isOptionEqualToValue={isOptionEqualToValue}
      filterOptions={x => x /* server-side already filtered */}
      sx={sx}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder="اسم أو رقم ملف..."
        />
      )}
    />
  );
}
