/**
 * 📦 ModulesSummary v2 — Premium System Modules Overview
 * وحدات النظام بريميوم مع glassmorphism + gradient icons + hover animations
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  ButtonBase,
  useTheme,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import BadgeIcon from '@mui/icons-material/Badge';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ContactsIcon from '@mui/icons-material/Contacts';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import ViewModuleRoundedIcon from '@mui/icons-material/ViewModuleRounded';

import { formatNumber } from 'services/dashboardService';

/* ─────────────────────────────────────── */
const ICON_MAP = {
  People:         PeopleIcon,
  Accessibility:  AccessibilityNewIcon,
  Badge:          BadgeIcon,
  EventNote:      EventNoteIcon,
  AccountBalance: AccountBalanceWalletIcon,
  LocalShipping:  LocalShippingIcon,
  DirectionsCar:  DirectionsCarIcon,
  Contacts:       ContactsIcon,
  Build:          BuildIcon,
  Description:    DescriptionIcon,
  Inventory:      InventoryIcon,
};

const KEY_LABELS = {
  total:          'إجمالي',
  active:         'نشط',
  pending:        'معلق',
  lowStock:       'مخزون منخفض',
  leaves:         'إجازات',
  programs:       'برامج',
  inventory:      'مخزون',
  purchaseOrders: 'أوامر شراء',
  invoices:       'فواتير',
  suppliers:      'موردون',
  payments:       'مدفوعات',
  today:          'اليوم',
  open:           'مفتوح',
};

/* ─────────────────────────────────────── */
/*  Module Card                            */
/* ─────────────────────────────────────── */
const ModuleCard = ({ label, icon, gradient, glow, stats, path, index }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const IconComp = ICON_MAP[icon] || PeopleIcon;
  const statEntries = Object.entries(stats || {})
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.055, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <ButtonBase
        onClick={() => navigate(path || '#')}
        sx={{ width: '100%', textAlign: 'start', borderRadius: '16px', overflow: 'hidden', display: 'block' }}
        aria-label={`الانتقال إلى ${label}`}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: 2,
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden',
            background: isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.9)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            backdropFilter: 'blur(12px)',
            boxShadow: isDark
              ? '0 4px 16px rgba(0,0,0,0.25)'
              : '0 4px 16px rgba(0,0,0,0.05)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': {
              borderColor: `${glow}45`,
              boxShadow: isDark
                ? `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${glow}25`
                : `0 12px 32px ${glow}20, 0 0 0 1px ${glow}20`,
              background: isDark
                ? `rgba(255,255,255,0.06)`
                : 'rgba(255,255,255,0.98)',
            },
          }}
        >
          {/* Top gradient bar */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '3px',
            background: gradient,
            borderRadius: '16px 16px 0 0',
          }} />

          {/* Background glow */}
          <Box sx={{
            position: 'absolute', top: -30, insetInlineEnd: -20,
            width: 90, height: 90, borderRadius: '50%',
            background: gradient,
            opacity: isDark ? 0.06 : 0.05,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />

          {/* ── Icon + Arrow row ──────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{
              width: 40, height: 40,
              borderRadius: '12px',
              background: gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${glow}40`,
              '& svg': { fontSize: 20, color: 'white' },
              transition: 'transform 0.3s, box-shadow 0.3s',
              '.MuiButtonBase-root:hover &': {
                transform: 'scale(1.1) rotate(-5deg)',
                boxShadow: `0 8px 20px ${glow}55`,
              },
            }}>
              <IconComp />
            </Box>

            <ArrowForwardIosRoundedIcon sx={{
              fontSize: 12,
              color: glow,
              opacity: 0,
              transform: 'translateX(4px)',
              transition: 'all 0.25s',
              '.MuiButtonBase-root:hover &': {
                opacity: 1,
                transform: 'translateX(0)',
              },
            }} />
          </Box>

          {/* Label */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: '0.78rem',
              lineHeight: 1.3,
              mb: 1.2,
              color: 'text.primary',
            }}
          >
            {label}
          </Typography>

          {/* Stats */}
          {statEntries.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {statEntries.map(([key, val]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                    {KEY_LABELS[key] || key}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      background: gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {formatNumber(val)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </ButtonBase>
    </motion.div>
  );
};

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const MODULE_GRADIENTS = [
  { gradient: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea' },
  { gradient: 'linear-gradient(135deg,#43cea2,#185a9d)', glow: '#43cea2' },
  { gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', glow: '#4facfe' },
  { gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', glow: '#f093fb' },
  { gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', glow: '#43e97b' },
  { gradient: 'linear-gradient(135deg,#fa709a,#fee140)', glow: '#fa709a' },
  { gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', glow: '#a18cd1' },
  { gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f)', glow: '#fcb69f' },
  { gradient: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', glow: '#a1c4fd' },
  { gradient: 'linear-gradient(135deg,#d4fc79,#96e6a1)', glow: '#96e6a1' },
];

const ModulesSummary = ({ kpis = {}, supplyChain = {}, fleet = {}, operations = {}, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [search, setSearch] = useState('');

  const allModules = useMemo(() => [
    { name: 'users',         label: 'إدارة المستخدمين',  icon: 'People',         stats: { total: kpis.users?.total || 0, active: kpis.users?.active || 0 },                      path: '/admin-portal/users' },
    { name: 'beneficiaries', label: 'إدارة المستفيدين',  icon: 'Accessibility',  stats: { total: kpis.beneficiaries?.total || 0, active: kpis.beneficiaries?.active || 0 },      path: '/beneficiaries' },
    { name: 'hr',            label: 'الموارد البشرية',   icon: 'Badge',          stats: { total: kpis.employees?.total || 0 },                                                    path: '/hr' },
    { name: 'sessions',      label: 'إدارة الجلسات',     icon: 'EventNote',      stats: { total: kpis.sessions?.total || 0, today: kpis.sessions?.today || 0 },                  path: '/sessions' },
    { name: 'finance',       label: 'المالية',            icon: 'AccountBalance', stats: { total: kpis.payments?.total || 0, pending: kpis.invoices?.pending || 0 },              path: '/finance' },
    { name: 'supply',        label: 'سلسلة التوريد',     icon: 'LocalShipping',  stats: { total: supplyChain.suppliers?.total || 0, inventory: supplyChain.inventory?.total || 0 }, path: '/procurement' },
    { name: 'fleet',         label: 'إدارة الأسطول',     icon: 'DirectionsCar',  stats: { total: fleet.vehicles?.total || 0 },                                                   path: '/fleet' },
    { name: 'crm',           label: 'إدارة العملاء',     icon: 'Contacts',       stats: { total: operations.leads?.total || 0 },                                                 path: '/crm' },
    { name: 'maintenance',   label: 'الصيانة',            icon: 'Build',          stats: { open: operations.maintenance?.open || 0 },                                             path: '/operations' },
    { name: 'documents',     label: 'المستندات',          icon: 'Description',    stats: { total: kpis.documents?.total || 0 },                                                   path: '/documents' },
  ].map((m, i) => ({ ...m, ...MODULE_GRADIENTS[i % MODULE_GRADIENTS.length] })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [kpis, supplyChain, fleet, operations]);

  const modules = useMemo(() => {
    if (!search.trim()) return allModules;
    const q = search.trim().toLowerCase();
    return allModules.filter(m => m.label.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  }, [search, allModules]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          p: 3,
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(145deg,rgba(15,20,40,0.96),rgba(20,15,45,0.96))'
            : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(249,248,255,0.97))',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 8px 40px rgba(102,126,234,0.08), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Top accent bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg,#667eea,#f093fb,#43cea2,#4facfe,#667eea)',
          backgroundSize: '300% auto',
          animation: 'modBar 5s linear infinite',
          '@keyframes modBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '300% center' },
          },
        }} />

        {/* Decorative orb */}
        <Box sx={{
          position: 'absolute', bottom: -80, insetInlineStart: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          opacity: isDark ? 0.05 : 0.04,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }} />

        {/* ── Header ─────────────────────── */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2.5,
          position: 'relative', zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(102,126,234,0.4)',
            }}>
              <ViewModuleRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                وحدات النظام
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  وصول سريع لجميع الوحدات
                </Typography>
                <Chip
                  label={`${modules.length} وحدة`}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                    background: 'rgba(102,126,234,0.12)',
                    border: '1px solid rgba(102,126,234,0.2)',
                    color: '#667eea',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Search field */}
          <TextField
            size="small"
            placeholder="بحث في الوحدات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 190,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontSize: '0.78rem',
                height: 34,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(102,126,234,0.04)',
                backdropFilter: 'blur(8px)',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(102,126,234,0.15)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(102,126,234,0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                  borderWidth: '1px',
                  boxShadow: '0 0 0 3px rgba(102,126,234,0.12)',
                },
              },
            }}
          />
        </Box>

        {/* ── Module Grid ─────────────────── */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={1.5}>
            <AnimatePresence mode="popLayout">
              {modules.map((mod, i) => (
                <Grid item xs={6} sm={4} md={2.4} key={mod.name}>
                  <ModuleCard {...mod} index={i} />
                </Grid>
              ))}
            </AnimatePresence>

            {modules.length === 0 && (
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{
                    textAlign: 'center', py: 5,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                  }}>
                    <Box sx={{
                      width: 52, height: 52, borderRadius: '16px',
                      background: 'rgba(102,126,234,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SearchIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                      لا توجد وحدات مطابقة لـ "{search}"
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default React.memo(ModulesSummary);
