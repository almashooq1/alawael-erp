/**
 * 📦 ModulesSummary — All System Modules Overview Cards
 * نظرة شاملة على جميع وحدات النظام
 */

import React, { useState, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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

import { formatNumber } from 'services/dashboardService';
import { brandColors } from '../../theme/palette';

const ICON_MAP = {
  People: PeopleIcon,
  Accessibility: AccessibilityNewIcon,
  Badge: BadgeIcon,
  EventNote: EventNoteIcon,
  AccountBalance: AccountBalanceWalletIcon,
  LocalShipping: LocalShippingIcon,
  DirectionsCar: DirectionsCarIcon,
  Contacts: ContactsIcon,
  Build: BuildIcon,
  Description: DescriptionIcon,
  Inventory: InventoryIcon,
};



const ModuleCard = ({ label, icon, color, stats, path, index }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const IconComp = ICON_MAP[icon] || PeopleIcon;
  const statEntries = Object.entries(stats || {}).filter(([k, v]) => typeof v === 'number' && k !== 'label');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <ButtonBase
        onClick={() => navigate(path || '#')}
        sx={{
          width: '100%',
          textAlign: 'right',
          borderRadius: 3.5,
          overflow: 'hidden',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: 2.5,
            borderRadius: 3.5,
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            transition: 'all 0.3s',
            '&:hover': {
              boxShadow: `0 8px 24px ${color}25`,
              borderColor: `${color}30`,
            },
          }}
        >
          {/* Top color accent */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              left: 0,
              height: 3,
              background: color,
            }}
          />

          {/* Icon + Label row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                '& svg': { fontSize: 20 },
              }}
            >
              <IconComp />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
              {label}
            </Typography>
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {statEntries.slice(0, 3).map(([key, val]) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {key === 'total' ? 'إجمالي' :
                   key === 'active' ? 'نشط' :
                   key === 'pending' ? 'معلق' :
                   key === 'lowStock' ? 'مخزون منخفض' :
                   key === 'leaves' ? 'إجازات' :
                   key === 'programs' ? 'برامج' :
                   key === 'inventory' ? 'مخزون' :
                   key === 'purchaseOrders' ? 'أوامر شراء' :
                   key === 'invoices' ? 'فواتير' :
                   key === 'suppliers' ? 'موردون' :
                   key === 'payments' ? 'مدفوعات' :
                   key}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: color, fontSize: '0.85rem' }}>
                  {formatNumber(val)}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Decorative circle */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -12,
              left: -12,
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: color,
              opacity: 0.05,
            }}
          />
        </Paper>
      </ButtonBase>
    </motion.div>
  );
};

const ModulesSummary = ({ kpis = {}, supplyChain = {}, fleet = {}, operations = {}, delay = 0 }) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  // Build module cards from available data
  const allModules = [
    { name: 'users', label: 'إدارة المستخدمين', icon: 'People', color: brandColors.primaryStart, stats: { total: kpis.users?.total || 0, active: kpis.users?.active || 0 }, path: '/admin-portal/users' },
    { name: 'beneficiaries', label: 'إدارة المستفيدين', icon: 'Accessibility', color: brandColors.accentGreen, stats: { total: kpis.beneficiaries?.total || 0, active: kpis.beneficiaries?.active || 0 }, path: '/beneficiaries' },
    { name: 'hr', label: 'الموارد البشرية', icon: 'Badge', color: brandColors.accentSky, stats: { total: kpis.employees?.total || 0 }, path: '/hr' },
    { name: 'sessions', label: 'إدارة الجلسات', icon: 'EventNote', color: brandColors.accentPink, stats: { total: kpis.sessions?.total || 0, today: kpis.sessions?.today || 0 }, path: '/sessions' },
    { name: 'finance', label: 'المالية', icon: 'AccountBalance', color: brandColors.ocean, stats: { total: kpis.payments?.total || 0, pending: kpis.invoices?.pending || 0 }, path: '/finance' },
    { name: 'supply', label: 'سلسلة التوريد', icon: 'LocalShipping', color: brandColors.orangeGlow, stats: { total: supplyChain.suppliers?.total || 0, inventory: supplyChain.inventory?.total || 0 }, path: '/procurement' },
    { name: 'fleet', label: 'إدارة الأسطول', icon: 'DirectionsCar', color: brandColors.accentRose, stats: { total: fleet.vehicles?.total || 0 }, path: '/fleet' },
    { name: 'crm', label: 'إدارة العملاء', icon: 'Contacts', color: brandColors.lavender, stats: { total: operations.leads?.total || 0 }, path: '/crm' },
    { name: 'maintenance', label: 'الصيانة', icon: 'Build', color: brandColors.accentAmber, stats: { open: operations.maintenance?.open || 0 }, path: '/operations' },
    { name: 'documents', label: 'المستندات', icon: 'Description', color: brandColors.accentTeal, stats: { total: kpis.documents?.total || 0 }, path: '/documents' },
  ];

  const modules = useMemo(() => {
    if (!search.trim()) return allModules;
    const q = search.trim().toLowerCase();
    return allModules.filter(m => m.label.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kpis, supplyChain, fleet, operations]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              وحدات النظام
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              وصول سريع لجميع الوحدات — {modules.length} وحدة
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="بحث في الوحدات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                fontSize: '0.8rem',
                height: 36,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
          />
        </Box>

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
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.disabled">
                  لا توجد وحدات مطابقة لـ "{search}"
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(ModulesSummary);
