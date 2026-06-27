/**
 * MobileBeneficiariesTab.jsx — المستفيدون
 * Searchable list of beneficiaries with quick-access ICF scores
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  LinearProgress,
  Button,
  SwipeableDrawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Assessment as ICFIcon,
  ChevronLeft as ChevronLeftIcon,
  Phone as PhoneIcon,
  FileCopy as FileIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { mockBeneficiaries, mockICFHistory } from './mockData';

const diagnosisColors = {
  'اضطراب طيف التوحد': '#d32f2f',
  'تأخر النمو': '#f57c00',
  'متلازمة داون': '#7b1fa2',
  'شلل دماغي': '#1976d2',
  'تأخر النمو الحركي': '#388e3c',
};

export default function MobileBeneficiariesTab({ onRefresh, refreshing }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = mockBeneficiaries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.diagnosis.toLowerCase().includes(q)
      );
    }
    if (filterTab === 'my') {
      list = list.filter((b) => b.primaryTherapist === 'أحمد المطيري');
    } else if (filterTab === 'high-risk') {
      list = list.filter((b) => b.icfScore < 60);
    }
    return list;
  }, [search, filterTab]);

  const openDetail = (b) => {
    setSelectedBeneficiary(b);
    setDrawerOpen(true);
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ px: 2, py: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
        المستفيدون
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="بحث بالاسم، الرقم، أو التشخيص..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1.5,
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'background.paper',
          },
        }}
      />

      {/* Filter Tabs */}
      <Tabs
        value={filterTab}
        onChange={(_e, v) => setFilterTab(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mb: 2, minHeight: 40, '& .MuiTabs-flexContainer': { gap: 0.5 } }}
      >
        {[
          { value: 'all', label: 'الكل' },
          { value: 'my', label: 'مستفيديَّ' },
          { value: 'high-risk', label: 'مراقبة' },
        ].map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={t.label}
            sx={{
              minHeight: 36,
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              fontFamily: 'Tajawal, Cairo, sans-serif',
            }}
          />
        ))}
      </Tabs>

      {/* Beneficiary List */}
      <Box>
        {filtered.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                mb: 1.5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:active': { transform: 'scale(0.98)' },
              }}
              onClick={() => openDetail(b)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } } }>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: `${diagnosisColors[b.diagnosis] || '#757575'}22`,
                      color: diagnosisColors[b.diagnosis] || '#757575',
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {b.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                      {b.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                      {b.id} · {b.age} سنوات
                    </Typography>
                  </Box>
                  <ChevronLeftIcon color="action" />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Chip
                    label={b.diagnosis}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      height: 22,
                      bgcolor: `${diagnosisColors[b.diagnosis] || '#757575'}14`,
                      color: diagnosisColors[b.diagnosis] || '#757575',
                      fontWeight: 700,
                      fontFamily: 'Tajawal, Cairo, sans-serif',
                    }}
                  />
                  <Chip
                    label={`ICF: ${b.icfScore}`}
                    size="small"
                    color={getScoreColor(b.icfScore)}
                    sx={{ fontSize: '0.7rem', height: 22, fontWeight: 700, fontFamily: 'Tajawal, Cairo, sans-serif' }}
                  />
                </Box>

                {/* ICF Progress Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={b.icfScore}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor:
                          b.icfScore >= 70
                            ? 'success.main'
                            : b.icfScore >= 50
                              ? 'warning.main'
                              : 'error.main',
                      },
                    }}
                  />
                  <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                    {b.icfScore}%
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                    آخر جلسة: {b.lastSession}
                  </Typography>
                  <Typography variant="caption" color="primary" fontWeight={700} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                    القادمة: {b.nextSession}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
            لا توجد نتائج مطابقة
          </Typography>
        </Box>
      )}

      {/* Beneficiary Detail Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        PaperProps={{ sx: { borderRadius: '20px 20px 0 0', px: 2, pt: 2, pb: 6 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2 }} />
        </Box>

        {selectedBeneficiary && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: `${diagnosisColors[selectedBeneficiary.diagnosis] || '#757575'}22`,
                  color: diagnosisColors[selectedBeneficiary.diagnosis] || '#757575',
                  fontWeight: 800,
                  fontSize: 22,
                }}
              >
                {selectedBeneficiary.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {selectedBeneficiary.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {selectedBeneficiary.id} · {selectedBeneficiary.age} سنوات · {selectedBeneficiary.diagnosis}
                </Typography>
              </Box>
            </Box>

            {/* ICF Score Card */}
            <Card sx={{ borderRadius: 3, p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ICFIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  تقييم ICF
                </Typography>
                <Chip
                  label={`${selectedBeneficiary.icfScore}%`}
                  size="small"
                  color={getScoreColor(selectedBeneficiary.icfScore)}
                  sx={{ fontWeight: 700, fontFamily: 'Tajawal, Cairo, sans-serif' }}
                />
              </Box>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={mockICFHistory}>
                  <defs>
                    <linearGradient id="icfColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Tajawal, Cairo, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{ fontFamily: 'Tajawal, Cairo, sans-serif', borderRadius: 12, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#1976d2" fill="url(#icfColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Quick Actions */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
              إجراءات سريعة
            </Typography>
            <List sx={{ px: 0 }}>
              {[
                { label: 'عرض الملف السريري', icon: <FileIcon /> },
                { label: 'جلسة جديدة', icon: <ICFIcon /> },
                { label: 'اتصال بولي الأمر', icon: <PhoneIcon /> },
              ].map((action) => (
                <ListItem key={action.label} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton sx={{ borderRadius: 2, minHeight: 52 }}>
                    <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>{action.icon}</ListItemIcon>
                    <ListItemText
                      primary={action.label}
                      primaryTypographyProps={{ fontFamily: 'Tajawal, Cairo, sans-serif', fontWeight: 600 }}
                    />
                    <ChevronLeftIcon fontSize="small" color="action" />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="contained"
              fullWidth
              sx={{ minHeight: 52, borderRadius: 2.5, fontWeight: 800, fontFamily: 'Tajawal, Cairo, sans-serif' }}
              onClick={() => setDrawerOpen(false)}
            >
              إغلاق
            </Button>
          </>
        )}
      </SwipeableDrawer>
    </Box>
  );
}
