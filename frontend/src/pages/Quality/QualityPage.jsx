/**
 * QualityPage.jsx — بوابة إدارة الجودة والامتثال
 *
 * Modernized navigation hub that links to all quality sub-modules.
 * Replaces the old deprecated page that used `qualityAPI from 'ddd'`.
 *
 * Routes served: /quality/*  (see QualityComplianceRoutes.jsx)
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Stack,
  Chip,
  Avatar,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  BugReport as CapaIcon,
  CalendarMonth as CalendarIcon,
  Inventory2 as EvidenceIcon,
  MenuBook as PolicyIcon,
  Security as PdplIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/* ── Module registry ────────────────────────────────────────────────── */
const MODULES = [
  {
    key: 'dashboard',
    label: 'لوحة التحكم',
    description: 'نظرة عامة على مؤشرات الجودة والامتثال',
    path: '/quality/dashboard',
    icon: <DashboardIcon />,
    color: '#7c3aed',
  },
  {
    key: 'management-review',
    label: 'مراجعة الإدارة',
    description: 'إدارة اجتماعات المراجعة ومخرجاتها',
    path: '/quality/management-review',
    icon: <ReviewIcon />,
    color: '#8b5cf6',
  },
  {
    key: 'capa',
    label: 'CAPA',
    description: 'الإجراءات التصحيحية والوقائية',
    path: '/quality/capa',
    icon: <CapaIcon />,
    color: '#ef4444',
  },
  {
    key: 'compliance-calendar',
    label: 'تقويم الامتثال',
    description: 'مواعيد الامتثال والمراجعات الدورية',
    path: '/quality/compliance-calendar',
    icon: <CalendarIcon />,
    color: '#3b82f6',
  },
  {
    key: 'evidence-vault',
    label: 'خزنة الأدلة',
    description: 'حفظ وإدارة أدلة الامتثال',
    path: '/quality/evidence-vault',
    icon: <EvidenceIcon />,
    color: '#10b981',
  },
  {
    key: 'policies',
    label: 'مكتبة السياسات',
    description: 'السياسات والإجراءات التشغيلية',
    path: '/quality/policies',
    icon: <PolicyIcon />,
    color: '#f59e0b',
  },
  {
    key: 'pdpl',
    label: 'حماية البيانات (PDPL)',
    description: 'الامتثال لنظام حماية البيانات الشخصية',
    path: '/quality/pdpl',
    icon: <PdplIcon />,
    color: '#6366f1',
  },
];

/* Maps module key → health-score pillar key returned by /hotspots */
const PILLAR_MAP = {
  capa: 'capa',
  'compliance-calendar': 'compliance_calendar',
  'evidence-vault': 'evidence',
  policies: 'policy',
  pdpl: 'pdpl',
};

/* ── Component ──────────────────────────────────────────────────────── */
export default function QualityPage() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/quality/health-score/hotspots');
        const map = {};
        (data?.data?.hotspots || []).forEach(h => {
          map[h.pillar] = h.count ?? h.openCount ?? 0;
        });
        setBadges(map);
      } catch {
        /* non-critical — badges stay empty */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)',
        p: { xs: 2, md: 4 },
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ color: '#f1f5f9', letterSpacing: '-0.5px' }}
        >
          إدارة الجودة والامتثال
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
          بوابة مركزية لجميع وحدات الجودة
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#7c3aed' }} />
        </Box>
      )}

      {/* Module grid */}
      {!loading && (
        <Grid container spacing={3}>
          {MODULES.map(mod => {
            const pillarKey = PILLAR_MAP[mod.key];
            const badgeCount = pillarKey ? (badges[pillarKey] ?? 0) : 0;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={mod.key}>
                <Card
                  sx={{
                    background: alpha(mod.color, 0.08),
                    border: `1px solid ${alpha(mod.color, 0.25)}`,
                    borderRadius: 3,
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 32px ${alpha(mod.color, 0.35)}`,
                    },
                  }}
                >
                  <CardActionArea onClick={() => navigate(mod.path)} sx={{ p: 2.5 }}>
                    <CardContent sx={{ p: 0 }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Avatar
                          sx={{
                            bgcolor: alpha(mod.color, 0.2),
                            color: mod.color,
                            width: 48,
                            height: 48,
                          }}
                        >
                          {mod.icon}
                        </Avatar>
                        {badgeCount > 0 && (
                          <Chip
                            label={badgeCount}
                            size="small"
                            sx={{
                              bgcolor: alpha(mod.color, 0.25),
                              color: mod.color,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ color: '#f1f5f9', mt: 2, mb: 0.5 }}
                      >
                        {mod.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.5 }}>
                        {mod.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
