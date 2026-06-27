/**
 * MobileMoreTab.jsx — المزيد
 * Settings, profile, logout, and quick links
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person as ProfileIcon,
  Settings as SettingsIcon,
  DarkMode as DarkModeIcon,
  Language as LanguageIcon,
  Notifications as NotifIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Security as SecurityIcon,
  ChevronLeft as ChevronLeftIcon,
  Business as BranchIcon,
  VerifiedUser as RoleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { mockUser } from './mockData';

export default function MobileMoreTab({ onRefresh, refreshing }) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    setLogoutDialogOpen(false);
    navigate('/login');
  };

  const menuItems = [
    { icon: <ProfileIcon />, label: 'الملف الشخصي', action: () => navigate('/profile') },
    { icon: <SettingsIcon />, label: 'الإعدادات', action: () => {} },
    { icon: <NotifIcon />, label: 'إعدادات الإشعارات', action: () => {}, toggle: true, value: notificationsEnabled, onToggle: () => setNotificationsEnabled((v) => !v) },
    { icon: <DarkModeIcon />, label: 'الوضع الليلي', action: () => {}, toggle: true, value: darkMode, onToggle: () => setDarkMode((v) => !v) },
    { icon: <LanguageIcon />, label: 'اللغة', action: () => {}, secondary: 'العربية' },
    { icon: <SecurityIcon />, label: 'الأمان والخصوصية', action: () => {} },
    { icon: <HelpIcon />, label: 'المساعدة والدعم', action: () => {} },
  ];

  return (
    <Box sx={{ px: 2, py: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
        المزيد
      </Typography>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            mb: 2.5,
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
                : 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: '#fff',
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } } }>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 22 }}>
                {mockUser.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {mockUser.name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {mockUser.role}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BranchIcon sx={{ opacity: 0.7, fontSize: 18 }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {mockUser.branch}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RoleIcon sx={{ opacity: 0.7, fontSize: 18 }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  أخصائي معتمد — رقم الترخيص: 12345
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              sx={{
                mt: 2,
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.4)',
                fontWeight: 700,
                fontFamily: 'Tajawal, Cairo, sans-serif',
                minHeight: 44,
                borderRadius: 2,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
              onClick={() => navigate('/profile')}
            >
              عرض الملف الشخصي
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Menu Items */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2.5 }}>
        <List sx={{ py: 0.5 }}>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={item.action}
                  sx={{ minHeight: 56, py: 1, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.secondary}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontFamily: 'Tajawal, Cairo, sans-serif',
                    }}
                    secondaryTypographyProps={{
                      fontFamily: 'Tajawal, Cairo, sans-serif',
                    }}
                  />
                  {item.toggle ? (
                    <Switch
                      checked={item.value}
                      onChange={(e) => {
                        e.stopPropagation();
                        item.onToggle();
                      }}
                      size="small"
                    />
                  ) : (
                    <ChevronLeftIcon color="action" fontSize="small" />
                  )}
                </ListItemButton>
              </ListItem>
              {i < menuItems.length - 1 && <Divider component="li" sx={{ mx: 2 }} />}
            </React.Fragment>
          ))}
        </List>
      </Card>

      {/* App Info */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
          Al-Awael ERP Mobile v1.0.0
        </Typography>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
          © 2025 مراكز الأوائل للرعاية والتأهيل
        </Typography>
      </Box>

      {/* Logout Button */}
      <Button
        variant="outlined"
        color="error"
        fullWidth
        startIcon={<LogoutIcon />}
        onClick={() => setLogoutDialogOpen(true)}
        sx={{
          minHeight: 52,
          borderRadius: 2.5,
          fontWeight: 800,
          fontSize: '0.95rem',
          fontFamily: 'Tajawal, Cairo, sans-serif',
        }}
      >
        تسجيل الخروج
      </Button>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Tajawal, Cairo, sans-serif', fontWeight: 800, textAlign: 'center' }}>
          تسجيل الخروج
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ textAlign: 'center', fontFamily: 'Tajawal, Cairo, sans-serif' }}>
            هل أنت متأكد من رغبتك في تسجيل الخروج؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 700, fontFamily: 'Tajawal, Cairo, sans-serif', minHeight: 44 }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2, fontWeight: 700, fontFamily: 'Tajawal, Cairo, sans-serif', minHeight: 44 }}
          >
            تسجيل الخروج
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
