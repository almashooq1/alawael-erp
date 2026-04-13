import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';

/**
 * SearchInput — Debounced search text field.
 *
 * @param {string}   value       — Current search value
 * @param {function} onChange    — (debouncedValue) => void
 * @param {string}   [placeholder] — Placeholder text
 * @param {number}   [delay]    — Debounce delay in ms (default 300)
 * @param {string}   [size]     — 'small' | 'medium'
 * @param {boolean}  [autoFocus]— Auto focus
 * @param {object}   [sx]       — Extra styles
 */
const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'بحث...',
  delay = 300,
  size = 'small',
  autoFocus = false,
  sx = {},
  ...rest
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange?.(val), delay);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
  };

  return (
    <TextField
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      autoFocus={autoFocus}
      sx={{ minWidth: 220, ...sx }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: localValue ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}><ClearIcon fontSize="small" /></IconButton>
          </InputAdornment>
        ) : null,
      }}
      {...rest}
    />
  );
};

export default SearchInput;
