/**
 * Accessible UI Components
 * مكونات واجهة المستخدم الموافقة لمعايير الوصول
 */

import React from 'react';
import { Button, IconButton, TextField, Chip } from '@mui/material';

// Accessible Button with proper ARIA labels
export const AccessibleButton = ({ 
  children, 
  ariaLabel, 
  onClick, 
  disabled = false,
  ...props 
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    aria-disabled={disabled}
    {...props}
  >
    {children}
  </Button>
);

// Accessible Icon Button
export const AccessibleIconButton = ({ 
  icon, 
  ariaLabel, 
  onClick, 
  disabled = false,
  ...props 
}) => (
  <IconButton
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-disabled={disabled}
    {...props}
  >
    {icon}
  </IconButton>
);

// Accessible Form Field
export const AccessibleTextField = ({ 
  label, 
  error, 
  helperText, 
  required = false,
  ...props 
}) => (
  <TextField
    label={label}
    error={error}
    helperText={helperText}
    required={required}
    aria-required={required}
    aria-invalid={error}
    aria-describedby={helperText ? `${props.id}-helper-text` : undefined}
    {...props}
  />
);

// Accessible Status Chip
export const AccessibleChip = ({ 
  label, 
  color, 
  ariaLabel,
  ...props 
}) => (
  <Chip
    label={label}
    color={color}
    aria-label={ariaLabel || label}
    role="status"
    {...props}
  />
);

// Skip to Main Content Link (for keyboard navigation)
export const SkipLink = ({ targetId = 'main-content' }) => (
  <a
    href={`#${targetId}`}
    style={{
      position: 'absolute',
      left: '-9999px',
      zIndex: 999,
      padding: '1rem',
      backgroundColor: '#1976d2',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '4px',
    }}
    onFocus={(e) => {
      e.target.style.left = '1rem';
      e.target.style.top = '1rem';
    }}
    onBlur={(e) => {
      e.target.style.left = '-9999px';
    }}
  >
    تخطي إلى المحتوى الرئيسي
  </a>
);

// Live Region for Screen Readers
export const LiveRegion = ({ children, ariaLive = 'polite', ariaAtomic = true }) => (
  <div
    role="status"
    aria-live={ariaLive}
    aria-atomic={ariaAtomic}
    style={{
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export default {
  AccessibleButton,
  AccessibleIconButton,
  AccessibleTextField,
  AccessibleChip,
  SkipLink,
  LiveRegion,
};
