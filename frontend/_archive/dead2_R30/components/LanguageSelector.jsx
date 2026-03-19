/**
 * Language Selector Component - مكون اختيار اللغة
 * Supports Arabic and English with RTL/LTR switching
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import CheckIcon from '@mui/icons-material/Check';

const languages = [
  { code: 'ar', name: 'العربية', nativeName: 'Arabic', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
];

const LanguageSelector = ({ variant = 'icon', showLabel = false }) => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = lng => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  if (variant === 'text') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {languages.map(lang => (
          <Typography
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            sx={{
              cursor: 'pointer',
              fontWeight: i18n.language === lang.code ? 'bold' : 'normal',
              color: i18n.language === lang.code ? 'primary.main' : 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: i18n.language === lang.code ? 'action.selected' : 'transparent',
            }}
          >
            {lang.name}
          </Typography>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Tooltip title={t('language.switchLanguage') || 'تغيير اللغة'}>
        <IconButton
          onClick={handleClick}
          color="inherit"
          aria-label="select language"
          sx={{
            borderRadius: 2,
            padding: '8px 12px',
            ...(showLabel && { gap: 1 }),
          }}
        >
          <TranslateIcon />
          {showLabel && (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {currentLanguage.name}
            </Typography>
          )}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 160,
            mt: 1.5,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {languages.map(lang => (
          <MenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            selected={i18n.language === lang.code}
            sx={{
              flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              },
            }}
          >
            <ListItemText
              primary={lang.name}
              secondary={lang.nativeName !== lang.name ? lang.nativeName : null}
              primaryTypographyProps={{
                fontWeight: i18n.language === lang.code ? 'bold' : 'normal',
              }}
            />
            {i18n.language === lang.code && (
              <ListItemIcon
                sx={{
                  minWidth: 'auto',
                  ml: i18n.language === 'ar' ? 0 : 2,
                  mr: i18n.language === 'ar' ? 2 : 0,
                }}
              >
                <CheckIcon color="primary" fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
