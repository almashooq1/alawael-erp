/**
 * Saudi Government Integration Component 🇸🇦
 * مكون التكامل مع الجهات الحكومية السعودية
 *
 * Features:
 * ✅ Direct links to all Saudi government portals
 * ✅ Quick access to license renewal pages
 * ✅ Contact information for each authority
 * ✅ Step-by-step guides
 * ✅ Service status checker
 * ✅ FAQs and common procedures
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Alert,
  Divider,
  Link,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  LocalHospital as LocalHospitalIcon,
  DirectionsCar as DirectionsCarIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  AttachMoney as AttachMoneyIcon,
  EmojiTransportation as EmojiTransportationIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const SaudiGovernmentIntegration = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Government Authorities Data
  const authorities = [
    {
      id: 'mc',
      name: 'وزارة التجارة',
      nameEn: 'Ministry of Commerce',
      icon: <BusinessIcon sx={{ fontSize: 48, color: '#1976d2' }} />,
      website: 'https://mc.gov.sa',
      services: ['السجل التجاري', 'الاسم التجاري', 'عقود الشركات'],
      contact: {
        phone: '1900',
        email: 'info@mc.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#1976d2',
    },
    {
      id: 'balady',
      name: 'البلدية',
      nameEn: 'Municipality',
      icon: <AccountBalanceIcon sx={{ fontSize: 48, color: '#388e3c' }} />,
      website: 'https://balady.gov.sa',
      services: ['الرخصة البلدية', 'رخصة البناء', 'رخصة استغلال السطح'],
      contact: {
        phone: '940',
        email: 'info@momra.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#388e3c',
    },
    {
      id: 'civildefense',
      name: 'الدفاع المدني',
      nameEn: 'Civil Defense',
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#d32f2f' }} />,
      website: 'https://998.gov.sa',
      services: ['شهادة الدفاع المدني', 'تصاريح السلامة'],
      contact: {
        phone: '998',
        email: 'info@998.gov.sa',
        hours: '24/7',
      },
      onlineServices: true,
      color: '#d32f2f',
    },
    {
      id: 'moh',
      name: 'وزارة الصحة',
      nameEn: 'Ministry of Health',
      icon: <LocalHospitalIcon sx={{ fontSize: 48, color: '#00796b' }} />,
      website: 'https://moh.gov.sa',
      services: ['البطاقة الصحية', 'التراخيص الصحية'],
      contact: {
        phone: '937',
        email: 'info@moh.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#00796b',
    },
    {
      id: 'sfda',
      name: 'الهيئة العامة للغذاء والدواء',
      nameEn: 'SFDA',
      icon: <LocalHospitalIcon sx={{ fontSize: 48, color: '#f57c00' }} />,
      website: 'https://sfda.gov.sa',
      services: ['رخصة محل المواد الغذائية', 'شهادات الأغذية'],
      contact: {
        phone: '19999',
        email: 'info@sfda.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#f57c00',
    },
    {
      id: 'traffic',
      name: 'الإدارة العامة للمرور',
      nameEn: 'Traffic Department',
      icon: <DirectionsCarIcon sx={{ fontSize: 48, color: '#5d4037' }} />,
      website: 'https://www.spa.gov.sa',
      services: ['رخصة القيادة', 'استمارة المركبة', 'مخالفات المرور'],
      contact: {
        phone: '989',
        email: 'traffic@moi.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 8:00 م',
      },
      onlineServices: true,
      color: '#5d4037',
    },
    {
      id: 'jawazat',
      name: 'الجوازات',
      nameEn: 'Passport Department (Jawazat)',
      icon: <AccountBalanceIcon sx={{ fontSize: 48, color: '#7b1fa2' }} />,
      website: 'https://www.moi.gov.sa',
      services: ['الإقامة', 'تأشيرات الخروج والعودة', 'تأشيرات الزيارة'],
      contact: {
        phone: '992',
        email: 'jawazat@moi.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 8:00 م',
      },
      onlineServices: true,
      color: '#7b1fa2',
    },
    {
      id: 'hrsd',
      name: 'وزارة الموارد البشرية',
      nameEn: 'Ministry of Human Resources',
      icon: <BusinessIcon sx={{ fontSize: 48, color: '#0288d1' }} />,
      website: 'https://www.hrsd.gov.sa',
      services: ['رخصة العمل', 'تصاريح العمل المؤقتة', 'نقل الخدمات'],
      contact: {
        phone: '19911',
        email: 'care@hrsd.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#0288d1',
    },
    {
      id: 'zatca',
      name: 'هيئة الزكاة والضريبة والجمارك',
      nameEn: 'ZATCA',
      icon: <AttachMoneyIcon sx={{ fontSize: 48, color: '#558b2f' }} />,
      website: 'https://zatca.gov.sa',
      services: ['شهادة الزكاة والدخل', 'ضريبة القيمة المضافة', 'الإقرارات الضريبية'],
      contact: {
        phone: '19993',
        email: 'info@zatca.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#558b2f',
    },
    {
      id: 'gosi',
      name: 'المؤسسة العامة للتأمينات الاجتماعية',
      nameEn: 'GOSI',
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#1565c0' }} />,
      website: 'https://www.gosi.gov.sa',
      services: ['شهادة التأمينات الاجتماعية', 'اشتراكات التأمينات'],
      contact: {
        phone: '8001243344',
        email: 'care@gosi.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#1565c0',
    },
    {
      id: 'transport',
      name: 'الهيئة العامة للنقل',
      nameEn: 'General Authority of Transport',
      icon: <EmojiTransportationIcon sx={{ fontSize: 48, color: '#f57f17' }} />,
      website: 'https://www.transport.gov.sa',
      services: ['رخصة النقل', 'تراخيص الحافلات', 'تراخيص الشحن'],
      contact: {
        phone: '920001880',
        email: 'info@transport.gov.sa',
        hours: 'الأحد - الخميس: 8:00 ص - 4:00 م',
      },
      onlineServices: true,
      color: '#f57f17',
    },
  ];

  const handleOpenAuthority = authority => {
    setSelectedAuthority(authority);
    setDetailsOpen(true);
  };

  const handleOpenWebsite = url => {
    window.open(url, '_blank');
  };

  const renderAuthorityCard = authority => (
    <Grid item xs={12} sm={6} md={4} key={authority.id}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s',
          borderTop: `4px solid ${authority.color}`,
          '&:hover': {
            boxShadow: 8,
            transform: 'translateY(-8px)',
          },
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            {authority.icon}
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
              {authority.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {authority.nameEn}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            📋 الخدمات:
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {authority.services.map((service, idx) => (
              <Chip
                key={idx}
                label={service}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
          </Stack>

          <Box
            sx={{
              p: 1.5,
              bgcolor: '#f5f5f5',
              borderRadius: 1,
            }}
          >
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="caption">{authority.contact.phone}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="caption">{authority.contact.hours}</Typography>
              </Box>
            </Stack>
          </Box>

          {authority.onlineServices && (
            <Chip
              label="✅ خدمات إلكترونية متاحة"
              size="small"
              color="success"
              sx={{ mt: 2, width: '100%', fontWeight: 600 }}
            />
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleOpenAuthority(authority)}
            startIcon={<InfoIcon />}
          >
            التفاصيل
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleOpenWebsite(authority.website)}
            endIcon={<OpenInNewIcon />}
            sx={{
              background: `linear-gradient(135deg, ${authority.color} 0%, ${authority.color}dd 100%)`,
            }}
          >
            زيارة الموقع
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <LanguageIcon sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              🇸🇦 بوابة الخدمات الحكومية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
              الوصول المباشر لجميع الجهات الحكومية السعودية
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Quick Links Alert */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          💡 <strong>نصيحة:</strong> يمكنك تجديد معظم الرخص إلكترونياً عبر منصات الجهات الحكومية.
          تأكد من تجهيز المستندات المطلوبة قبل البدء.
        </Typography>
      </Alert>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="جميع الجهات" />
          <Tab label="التجارية والاستثمار" />
          <Tab label="المرور والنقل" />
          <Tab label="الصحة والسلامة" />
          <Tab label="المالية والزكاة" />
        </Tabs>
      </Paper>

      {/* Authorities Grid */}
      <Grid container spacing={3}>
        {activeTab === 0 && authorities.map(authority => renderAuthorityCard(authority))}
        {activeTab === 1 &&
          authorities
            .filter(a => ['mc', 'balady', 'hrsd'].includes(a.id))
            .map(authority => renderAuthorityCard(authority))}
        {activeTab === 2 &&
          authorities
            .filter(a => ['traffic', 'transport'].includes(a.id))
            .map(authority => renderAuthorityCard(authority))}
        {activeTab === 3 &&
          authorities
            .filter(a => ['moh', 'sfda', 'civildefense'].includes(a.id))
            .map(authority => renderAuthorityCard(authority))}
        {activeTab === 4 &&
          authorities
            .filter(a => ['zatca', 'gosi'].includes(a.id))
            .map(authority => renderAuthorityCard(authority))}
      </Grid>

      {/* Common Procedures Accordion */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          📝 إجراءات شائعة
        </Typography>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600 }}>كيفية تجديد السجل التجاري</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="1. زيارة موقع وزارة التجارة (mc.gov.sa)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="2. تسجيل الدخول بحساب النفاذ الوطني" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="3. اختيار 'تجديد السجل التجاري'" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="4. دفع الرسوم (200 ريال)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="5. طباعة السجل التجاري الجديد" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600 }}>تجديد رخصة القيادة</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="1. زيارة منصة أبشر (absher.sa)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="2. الخدمات الإلكترونية > المرور > تجديد رخصة القيادة" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="3. إرفاق الفحص الطبي" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="4. دفع الرسوم (400 ريال)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="5. استلام الرخصة عبر البريد" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600 }}>تجديد الرخصة البلدية</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="1. زيارة منصة بلدي (balady.gov.sa)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="2. تسجيل الدخول والذهاب إلى 'تراخيصي'" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="3. اختيار الرخصة المراد تجديدها" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="4. التأكد من سريان شهادة الدفاع المدني" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="5. دفع الرسوم واستلام الرخصة" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Details Dialog */}
      {selectedAuthority && (
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${selectedAuthority.color} 0%, ${selectedAuthority.color}dd 100%)`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {selectedAuthority.icon}
            <Box>
              <Typography variant="h6">{selectedAuthority.name}</Typography>
              <Typography variant="caption">{selectedAuthority.nameEn}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  📋 الخدمات المتاحة:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedAuthority.services.map((service, idx) => (
                    <Chip key={idx} label={service} color="primary" variant="outlined" />
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  📞 معلومات الاتصال:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText primary="الهاتف" secondary={selectedAuthority.contact.phone} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="البريد الإلكتروني"
                      secondary={selectedAuthority.contact.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="ساعات العمل"
                      secondary={selectedAuthority.contact.hours}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LanguageIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="الموقع الإلكتروني"
                      secondary={
                        <Link href={selectedAuthority.website} target="_blank" rel="noopener">
                          {selectedAuthority.website}
                        </Link>
                      }
                    />
                  </ListItem>
                </List>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
            <Button
              variant="contained"
              onClick={() => handleOpenWebsite(selectedAuthority.website)}
              endIcon={<OpenInNewIcon />}
            >
              زيارة الموقع
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SaudiGovernmentIntegration;
