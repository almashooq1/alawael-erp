import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  InputAdornment,
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Typography,
  Divider,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const searchablePages = [
  { title: 'الرئيسية', path: '/home', category: 'تنقل' },
  { title: 'لوحة التشغيل', path: '/dashboard', category: 'تنقل' },
  { title: 'التقارير والتحليلات', path: '/reports', category: 'تقارير' },
  { title: 'النشاط اللحظي', path: '/activity', category: 'تنقل' },
  { title: 'إدارة علاقات العملاء (CRM)', path: '/crm', category: 'أعمال' },
  { title: 'المالية والمحاسبة', path: '/finance', category: 'مالية' },
  { title: 'المشتريات والمخزون', path: '/procurement', category: 'مالية' },
  { title: 'الموارد البشرية', path: '/hr', category: 'موارد' },
  { title: 'الحضور والإجازات', path: '/attendance', category: 'موارد' },
  { title: 'الرواتب', path: '/payroll', category: 'موارد' },
  { title: 'التعلم الإلكتروني', path: '/elearning', category: 'تعلم' },
  { title: 'الجلسات والمواعيد', path: '/sessions', category: 'رعاية' },
  { title: 'إعادة التأهيل والعلاج', path: '/rehab', category: 'رعاية' },
  { title: 'المساعد الذكي', path: '/ai-assistant', category: 'ذكاء اصطناعي' },
  { title: 'الأمن والحماية', path: '/security', category: 'أمن' },
  { title: 'المراقبة والكاميرات', path: '/surveillance', category: 'أمن' },
  { title: 'الصيانة والتشغيل', path: '/maintenance', category: 'تشغيل' },
  { title: 'المجموعات', path: '/groups', category: 'اجتماعي' },
  { title: 'الأصدقاء', path: '/friends', category: 'اجتماعي' },
  { title: 'الملف الشخصي', path: '/profile', category: 'حساب' },
];

const QuickSearch = () => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const filtered = searchablePages.filter(
        page => page.title.toLowerCase().includes(query.toLowerCase()) || page.category.toLowerCase().includes(query.toLowerCase()),
      );
      setResults(filtered.slice(0, 6));
      setOpen(filtered.length > 0);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  const handleSelect = path => {
    navigate(path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = e => {
    if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Box sx={{ position: 'relative', width: { xs: 200, sm: 280 } }}>
      <TextField
        inputRef={inputRef}
        size="small"
        placeholder="بحث سريع..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setOpen(results.length > 0)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          sx: { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', '& input::placeholder': { color: 'rgba(255,255,255,0.7)' } },
        }}
        sx={{ width: '100%' }}
      />
      <Fade in={open}>
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 1300,
            boxShadow: 3,
          }}
        >
          <List dense>
            {results.map((item, idx) => (
              <React.Fragment key={item.path}>
                <ListItem button onClick={() => handleSelect(item.path)}>
                  <ListItemIcon>
                    <SearchIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.category}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                {idx < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
          {results.length === 0 && query.trim() && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                لا توجد نتائج
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default QuickSearch;
