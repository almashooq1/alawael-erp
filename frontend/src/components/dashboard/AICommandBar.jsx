/**
 * ⌨️ AICommandBar — شريط أوامر ذكي (CMD+K)
 * Premium floating command palette with AI-powered search & quick actions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────── */
const COMMANDS = [
  {
    group: 'تنقل سريع',
    items: [
      { id: 'nav-users',    label: 'المستخدمون',     desc: 'إدارة المستخدمين',         icon: <PeopleIcon />,                  gradient: 'linear-gradient(135deg,#667eea,#764ba2)', path: '/admin-portal/users' },
      { id: 'nav-sessions', label: 'الجلسات',         desc: 'إدارة جلسات التأهيل',      icon: <EventNoteIcon />,               gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', path: '/sessions' },
      { id: 'nav-finance',  label: 'المالية',          desc: 'الفواتير والمدفوعات',       icon: <AccountBalanceWalletIcon />,    gradient: 'linear-gradient(135deg,#43cea2,#185a9d)', path: '/finance' },
      { id: 'nav-reports',  label: 'التقارير',         desc: 'تقارير وتحليلات',           icon: <AssessmentIcon />,              gradient: 'linear-gradient(135deg,#f7971e,#ffd200)', path: '/reports' },
      { id: 'nav-settings', label: 'الإعدادات',        desc: 'إعدادات النظام',            icon: <SettingsIcon />,                gradient: 'linear-gradient(135deg,#868f96,#596164)', path: '/profile' },
    ],
  },
  {
    group: 'إجراءات سريعة',
    items: [
      { id: 'act-new-user',        label: 'إضافة مستخدم جديد',      desc: 'تسجيل مستخدم في النظام',     icon: <AddCircleRoundedIcon />, gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', path: '/admin-portal/users?action=new' },
      { id: 'act-new-session',     label: 'جلسة جديدة',              desc: 'إضافة جلسة تأهيلية',         icon: <AddCircleRoundedIcon />, gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', path: '/sessions?action=new' },
      { id: 'act-new-beneficiary', label: 'مستفيد جديد',             desc: 'تسجيل مستفيد',               icon: <AddCircleRoundedIcon />, gradient: 'linear-gradient(135deg,#43cea2,#185a9d)', path: '/beneficiaries?action=new' },
    ],
  },
];

const ALL_ITEMS = COMMANDS.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));

const kbd = (children, isDark) => (
  <Box component="span" sx={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    px: 0.7, py: 0.1,
    borderRadius: '5px',
    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    fontFamily: 'monospace',
    lineHeight: 1.6,
  }}>
    {children}
  </Box>
);

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const AICommandBar = ({ open, onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  /* Filter */
  const filtered = query.trim()
    ? ALL_ITEMS.filter(i =>
        i.label.includes(query) ||
        i.desc.includes(query) ||
        i.group.includes(query)
      )
    : ALL_ITEMS;

  /* Focus on open */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  /* Keyboard navigation */
  const handleKey = useCallback((e) => {
    if (!open) return;
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && filtered[selectedIdx]) {
      navigate(filtered[selectedIdx].path);
      onClose();
    }
  }, [open, filtered, selectedIdx, navigate, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* Reset selected on query change */
  useEffect(() => setSelectedIdx(0), [query]);

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  /* Group filtered by group */
  const grouped = {};
  filtered.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1400,
              background: isDark
                ? 'rgba(0,0,8,0.75)'
                : 'rgba(15,15,30,0.5)',
              backdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -20 }}
            transition={{ duration: 0.22, ease: [0.34, 1.3, 0.64, 1] }}
            style={{
              position: 'fixed',
              top: '15vh',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500,
              width: '100%',
              maxWidth: 620,
              padding: '0 16px',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: isDark
                  ? 'rgba(12,16,36,0.97)'
                  : 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(30px) saturate(200%)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(102,126,234,0.3)' : 'rgba(102,126,234,0.2)',
                boxShadow: isDark
                  ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(102,126,234,0.2), inset 0 1px 0 rgba(102,126,234,0.1)'
                  : '0 32px 80px rgba(102,126,234,0.2), 0 0 0 1px rgba(102,126,234,0.1)',
              }}
            >
              {/* Accent top bar */}
              <Box sx={{
                height: '2px',
                background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb,#4facfe)',
                backgroundSize: '200% auto',
                animation: 'cmdBar 3s linear infinite',
                '@keyframes cmdBar': {
                  '0%': { backgroundPosition: '0% center' },
                  '100%': { backgroundPosition: '200% center' },
                },
              }} />

              {/* ── Search input ─────────── */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2.5, py: 1.8,
                borderBottom: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}>
                {/* AI Icon pulsing */}
                <Box sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
                  animation: 'iconPulse 2.5s ease-in-out infinite',
                  '@keyframes iconPulse': {
                    '0%,100%': { boxShadow: '0 4px 12px rgba(102,126,234,0.4)' },
                    '50%': { boxShadow: '0 6px 20px rgba(102,126,234,0.7)' },
                  },
                }}>
                  <FlashOnRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>

                <InputBase
                  inputRef={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="ابحث أو اكتب أمراً... مثلاً: مستخدم جديد"
                  fullWidth
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: isDark ? 'rgba(255,255,255,0.9)' : '#1a1a2e',
                    '& input': {
                      '&::placeholder': {
                        color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                        fontWeight: 400,
                      },
                    },
                  }}
                />

                {/* Shortcut badge */}
                <Box sx={{ display: 'flex', gap: 0.4, flexShrink: 0 }}>
                  {kbd('ESC', isDark)}
                </Box>
              </Box>

              {/* ── Results ──────────────── */}
              <Box sx={{
                maxHeight: 340, overflowY: 'auto',
                py: 1,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': {
                  borderRadius: 4,
                  background: 'rgba(102,126,234,0.3)',
                },
              }}>
                {filtered.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <AutoAwesomeIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 1 }} />
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', fontWeight: 600 }}>
                      لا توجد نتائج لـ "{query}"
                    </Typography>
                  </Box>
                ) : (
                  Object.entries(grouped).map(([group, items]) => (
                    <Box key={group}>
                      {/* Group label */}
                      <Typography sx={{
                        px: 2.5, py: 0.6,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: 'text.disabled',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                      }}>
                        {group}
                      </Typography>

                      {items.map((item) => {
                        const globalIdx = filtered.indexOf(item);
                        const isSelected = globalIdx === selectedIdx;

                        return (
                          <Box
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              px: 2, py: 1,
                              mx: 1,
                              borderRadius: '12px',
                              cursor: 'pointer',
                              background: isSelected
                                ? (isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.08)')
                                : 'transparent',
                              border: '1px solid',
                              borderColor: isSelected
                                ? 'rgba(102,126,234,0.3)'
                                : 'transparent',
                              transition: 'all 0.15s',
                              mb: 0.3,
                            }}
                          >
                            {/* Icon */}
                            <Box sx={{
                              width: 34, height: 34,
                              borderRadius: '10px',
                              background: isSelected ? item.gradient : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s',
                              boxShadow: isSelected ? `0 4px 12px rgba(102,126,234,0.3)` : 'none',
                              '& svg': {
                                fontSize: 17,
                                color: isSelected ? 'white' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                              },
                            }}>
                              {item.icon}
                            </Box>

                            {/* Text */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{
                                fontSize: '0.82rem', fontWeight: 700,
                                color: isSelected ? (isDark ? 'white' : '#1a1a2e') : 'text.primary',
                              }}>
                                {item.label}
                              </Typography>
                              <Typography sx={{
                                fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3,
                              }} noWrap>
                                {item.desc}
                              </Typography>
                            </Box>

                            {/* Enter icon */}
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, x: 6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.4,
                                  px: 0.8, py: 0.3, borderRadius: '8px',
                                  background: 'rgba(102,126,234,0.15)',
                                  border: '1px solid rgba(102,126,234,0.25)',
                                }}>
                                  <KeyboardReturnRoundedIcon sx={{ fontSize: 12, color: '#667eea' }} />
                                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#667eea' }}>
                                    تنفيذ
                                  </Typography>
                                </Box>
                              </motion.div>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))
                )}
              </Box>

              {/* ── Footer ───────────────── */}
              <Box sx={{
                px: 2.5, py: 1.2,
                borderTop: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 13, color: '#667eea' }} />
                  <Typography sx={{ fontSize: '0.63rem', color: 'text.disabled' }}>
                    مدعوم بالذكاء الاصطناعي
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {kbd('↑↓', isDark)}
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>تنقل</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {kbd('↵', isDark)}
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>تنفيذ</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AICommandBar;
