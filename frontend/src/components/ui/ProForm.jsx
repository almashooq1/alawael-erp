/**
 * Professional Form Components — AlAwael ERP
 * مكوّنات نماذج احترافية مع تحقق متقدم
 *
 * Components:
 * - ProTextField: Enhanced text field with validation
 * - ProSelect: Dropdown with search
 * - ProDateField: Date picker wrapper
 * - ProFileUpload: Drag-and-drop file upload
 * - ProFormSection: Form section with title/description
 * - ProFormActions: Save/Cancel/Reset button group
 * - useProForm: Custom hook for form state + validation
 */

import { useState, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Typography,
  Button,
  IconButton,
  InputAdornment,
  Chip,
  Stack,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Restore as ResetIcon,
} from '@mui/icons-material';

// ─── PRO TEXT FIELD ──────────────────────────────────────────────────────────
export const ProTextField = ({
  label,
  name,
  value,
  onChange,
  error,
  helperText,
  type = 'text',
  required = false,
  multiline = false,
  rows = 4,
  maxLength,
  icon,
  endIcon,
  disabled = false,
  placeholder,
  dir,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <TextField
      fullWidth
      variant="outlined"
      label={label}
      name={name}
      value={value || ''}
      onChange={onChange}
      error={!!error}
      helperText={error || helperText}
      type={isPassword && showPassword ? 'text' : type}
      required={required}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      disabled={disabled}
      placeholder={placeholder}
      inputProps={{
        maxLength,
        dir: dir || (type === 'email' || type === 'url' ? 'ltr' : undefined),
      }}
      InputProps={{
        startAdornment: icon ? (
          <InputAdornment position="start">{icon}</InputAdornment>
        ) : undefined,
        endAdornment: (
          <>
            {isPassword && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="إظهار/إخفاء كلمة المرور"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            )}
            {endIcon && <InputAdornment position="end">{endIcon}</InputAdornment>}
            {maxLength && value && (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary">
                  {value.length}/{maxLength}
                </Typography>
              </InputAdornment>
            )}
          </>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
        },
      }}
      {...rest}
    />
  );
};

// ─── PRO SELECT ──────────────────────────────────────────────────────────────
export const ProSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],     // [{ value, label, disabled, group }]
  error,
  helperText,
  required = false,
  multiple = false,
  disabled = false,
  placeholder = 'اختر...',
  icon,
  ...rest
}) => {
  return (
    <FormControl fullWidth error={!!error} required={required} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        name={name}
        value={value ?? (multiple ? [] : '')}
        onChange={onChange}
        label={label}
        multiple={multiple}
        displayEmpty
        startAdornment={icon ? <InputAdornment position="start">{icon}</InputAdornment> : undefined}
        renderValue={
          multiple
            ? (selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const opt = options.find((o) => o.value === val);
                    return <Chip key={val} label={opt?.label || val} size="small" />;
                  })}
                </Box>
              )
            : undefined
        }
        sx={{ borderRadius: '10px' }}
        {...rest}
      >
        {!multiple && (
          <MenuItem value="" disabled>
            <Typography variant="body2" color="text.secondary">{placeholder}</Typography>
          </MenuItem>
        )}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
    </FormControl>
  );
};

// ─── PRO FILE UPLOAD ─────────────────────────────────────────────────────────
export const ProFileUpload = ({
  label = 'رفع ملف',
  accept,
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB default
  value = [],
  onChange,
  error,
  helperText,
  disabled = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      const valid = files.filter((f) => f.size <= maxSize);
      if (onChange) onChange(multiple ? [...value, ...valid] : valid.slice(0, 1));
    },
    [maxSize, multiple, onChange, value]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (idx) => {
    if (onChange) onChange(value.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        sx={{
          border: `2px dashed ${
            error
              ? theme.palette.error.main
              : dragActive
              ? theme.palette.primary.main
              : theme.palette.divider
          }`,
          borderRadius: '12px',
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          backgroundColor: dragActive
            ? alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          transition: 'all 0.2s',
          '&:hover': disabled
            ? {}
            : {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        <UploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" fontWeight={500}>
          اسحب الملفات هنا أو انقر للرفع
        </Typography>
        <Typography variant="caption" color="text.secondary">
          الحد الأقصى: {formatSize(maxSize)} لكل ملف
        </Typography>
      </Box>

      {/* File list */}
      {value.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          {value.map((file, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: '8px',
                backgroundColor: theme.palette.action.hover,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatSize(file.size)}
              </Typography>
              <IconButton size="small" aria-label="إزالة" onClick={() => handleRemove(idx)}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      {(error || helperText) && (
        <FormHelperText error={!!error} sx={{ mt: 0.5 }}>
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

// ─── FORM SECTION ────────────────────────────────────────────────────────────
export const ProFormSection = ({ title, description, children, divider = true }) => {
  return (
    <Box sx={{ mb: 3 }}>
      {divider && <Divider sx={{ mb: 2.5 }} />}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
};

// ─── FORM ACTIONS ────────────────────────────────────────────────────────────
export const ProFormActions = ({
  onSave,
  onCancel,
  onReset,
  saveLabel = 'حفظ',
  cancelLabel = 'إلغاء',
  resetLabel = 'إعادة تعيين',
  loading = false,
  disabled = false,
  showReset = false,
  sticky = false,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.5,
        pt: 2,
        ...(sticky && {
          position: 'sticky',
          bottom: 0,
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          py: 2,
          px: 2.5,
          mx: -2.5,
          zIndex: 10,
        }),
      }}
    >
      {showReset && onReset && (
        <Button
          variant="text"
          color="inherit"
          startIcon={<ResetIcon />}
          onClick={onReset}
          disabled={loading || disabled}
          sx={{ mr: 'auto' }}
        >
          {resetLabel}
        </Button>
      )}
      {onCancel && (
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
      )}
      {onSave && (
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={onSave}
          disabled={loading || disabled}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'جارٍ الحفظ...' : saveLabel}
        </Button>
      )}
    </Box>
  );
};

// ─── useProForm Hook ─────────────────────────────────────────────────────────
export const useProForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((name, val) => {
    setValues((prev) => ({ ...prev, [name]: val }));
    // Clear error on change
    setErrors((prev) => {
      if (prev[name]) { const next = { ...prev }; delete next[name]; return next; }
      return prev;
    });
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValue(name, type === 'checkbox' ? checked : value);
  }, [setValue]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    // Validate single field
    if (validationSchema[name]) {
      const err = validationSchema[name](values[name], values);
      setErrors((prev) => (err ? { ...prev, [name]: err } : (() => { const n = { ...prev }; delete n[name]; return n; })()));
    }
  }, [validationSchema, values]);

  const validate = useCallback(() => {
    const newErrors = {};
    Object.entries(validationSchema).forEach(([field, validator]) => {
      const err = validator(values[field], values);
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    setTouched(Object.keys(validationSchema).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return Object.keys(newErrors).length === 0;
  }, [validationSchema, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (onSubmit) => {
      if (!validate()) return false;
      setSubmitting(true);
      try {
        await onSubmit(values);
        return true;
      } catch (err) {
        if (err?.fieldErrors) setErrors(err.fieldErrors);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, values]
  );

  const getFieldProps = (name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: touched[name] ? errors[name] : undefined,
  });

  return {
    values,
    errors,
    touched,
    submitting,
    setValue,
    setValues,
    handleChange,
    handleBlur,
    validate,
    reset,
    handleSubmit,
    getFieldProps,
    isValid: Object.keys(errors).length === 0,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
  };
};

// ─── VALIDATORS ──────────────────────────────────────────────────────────────
export const validators = {
  required: (msg = 'هذا الحقل مطلوب') => (val) => (!val && val !== 0 ? msg : null),
  email: (msg = 'بريد إلكتروني غير صالح') => (val) =>
    val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? msg : null,
  minLength: (min, msg) => (val) =>
    val && val.length < min ? msg || `الحد الأدنى ${min} أحرف` : null,
  maxLength: (max, msg) => (val) =>
    val && val.length > max ? msg || `الحد الأقصى ${max} حرف` : null,
  phone: (msg = 'رقم هاتف غير صالح') => (val) =>
    val && !/^[+]?[\d\s-()]{7,15}$/.test(val) ? msg : null,
  match: (fieldName, msg = 'القيم غير متطابقة') => (val, allValues) =>
    val !== allValues[fieldName] ? msg : null,
  compose: (...fns) => (val, all) => {
    for (const fn of fns) {
      const err = fn(val, all);
      if (err) return err;
    }
    return null;
  },
};
