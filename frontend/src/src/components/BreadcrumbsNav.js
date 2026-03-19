import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const routeTitles = {
  home: 'الرئيسية',
  dashboard: 'لوحة التشغيل',
  reports: 'التقارير والتحليلات',
  activity: 'النشاط اللحظي',
  crm: 'إدارة علاقات العملاء',
  finance: 'المالية والمحاسبة',
  procurement: 'المشتريات والمخزون',
  hr: 'الموارد البشرية',
  attendance: 'الحضور والإجازات',
  payroll: 'الرواتب',
  elearning: 'التعلم الإلكتروني',
  sessions: 'الجلسات والمواعيد',
  rehab: 'إعادة التأهيل والعلاج',
  'ai-assistant': 'المساعد الذكي',
  security: 'الأمن والحماية',
  surveillance: 'المراقبة والكاميرات',
  maintenance: 'الصيانة والتشغيل',
  groups: 'المجموعات',
  friends: 'الأصدقاء',
  profile: 'الملف الشخصي',
  balances: 'الأرصدة والتسويات',
  expenses: 'المصروفات',
};

const BreadcrumbsNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0 || pathnames[0] === 'home') {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary' }}
          onClick={() => navigate('/home')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          الرئيسية
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const title = routeTitles[value] || value;

          return last ? (
            <Typography key={to} color="text.primary" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          ) : (
            <Link key={to} underline="hover" sx={{ cursor: 'pointer', color: 'text.secondary' }} onClick={() => navigate(to)}>
              {title}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbsNav;
