/**
 * Responsive Layout Wrapper - مكون تخطيط متجاوب
 * يوفر تجربة مثالية على جميع الأجهزة
 */

import React from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';

const ResponsiveLayout = ({ children, maxWidth = 'xl', disablePadding = false }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7fa',
        py: disablePadding ? 0 : { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Container
        maxWidth={maxWidth}
        sx={{
          px: disablePadding
            ? 0
            : {
                xs: 2,
                sm: 3,
                md: 4,
              },
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

// Mobile-First Grid System
export const ResponsiveGrid = ({ children, spacing = 3 }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr', // Mobile: 1 column
          sm: 'repeat(2, 1fr)', // Tablet: 2 columns
          md: 'repeat(3, 1fr)', // Desktop: 3 columns
          lg: 'repeat(4, 1fr)', // Large: 4 columns
        },
        gap: spacing,
      }}
    >
      {children}
    </Box>
  );
};

// Responsive Card Container
export const ResponsiveCardContainer = ({ children, variant = 'default' }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const variants = {
    default: {
      p: { xs: 2, sm: 3, md: 4 },
      borderRadius: { xs: 2, sm: 3, md: 4 },
    },
    compact: {
      p: { xs: 1.5, sm: 2, md: 3 },
      borderRadius: { xs: 2, sm: 3 },
    },
    spacious: {
      p: { xs: 3, sm: 4, md: 5 },
      borderRadius: { xs: 3, sm: 4, md: 5 },
    },
  };

  return (
    <Box
      sx={{
        bgcolor: 'white',
        boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        ...variants[variant],
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        },
      }}
    >
      {children}
    </Box>
  );
};

// Responsive Typography
export const ResponsiveTypography = ({ variant = 'h1', children, ...props }) => {
  const responsiveSizes = {
    h1: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
    h2: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
    h3: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
    h4: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
    h5: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
    h6: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
  };

  return (
    <Box
      component="div"
      sx={{
        fontSize: responsiveSizes[variant] || responsiveSizes.h4,
        fontWeight: 700,
        lineHeight: 1.3,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Mobile-optimized Stack
export const ResponsiveStack = ({ children, direction = 'row', spacing = 2, ...props }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: {
          xs: direction === 'row' ? 'column' : 'row',
          md: direction,
        },
        gap: spacing,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive Chart Container
export const ResponsiveChartContainer = ({ children, height }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: {
          xs: height ? height * 0.7 : 250,
          sm: height ? height * 0.85 : 300,
          md: height || 350,
        },
        '& .recharts-wrapper': {
          fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.9rem' },
        },
      }}
    >
      {children}
    </Box>
  );
};

// Responsive Button Group
export const ResponsiveButtonGroup = ({ children, fullWidthOnMobile = true }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        '& > button': {
          flex: { xs: fullWidthOnMobile ? 1 : 'none', sm: 'none' },
          width: { xs: fullWidthOnMobile ? '100%' : 'auto', sm: 'auto' },
        },
      }}
    >
      {children}
    </Box>
  );
};

// Responsive Table Wrapper
export const ResponsiveTableWrapper = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        overflowX: 'auto',
        '& table': {
          minWidth: { xs: '100%', sm: 650 },
        },
        '& th, & td': {
          fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
          padding: { xs: '8px', sm: '12px', md: '16px' },
        },
        // Hide scrollbar on mobile
        '&::-webkit-scrollbar': {
          height: { xs: '4px', sm: '8px' },
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        },
      }}
    >
      {children}
    </Box>
  );
};

// Responsive Drawer/Sidebar
export const ResponsiveDrawer = ({ open, onClose, children, width = 280 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        position: { xs: 'fixed', md: 'relative' },
        top: { xs: 0, md: 'auto' },
        left: { xs: 0, md: 'auto' },
        width: { xs: '100%', md: width },
        height: { xs: '100vh', md: 'auto' },
        bgcolor: 'white',
        zIndex: { xs: 1200, md: 'auto' },
        transform: {
          xs: open ? 'translateX(0)' : 'translateX(-100%)',
          md: 'translateX(0)',
        },
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
        boxShadow: { xs: '2px 0 8px rgba(0,0,0,0.1)', md: 'none' },
      }}
    >
      {children}
      {isMobile && open && (
        <Box
          onClick={onClose}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: -1,
          }}
        />
      )}
    </Box>
  );
};

// Mobile-optimized Form
export const ResponsiveForm = ({ children, ...props }) => {
  return (
    <Box
      component="form"
      sx={{
        '& .MuiTextField-root': {
          mb: { xs: 2, sm: 3 },
        },
        '& .MuiButton-root': {
          minHeight: { xs: 44, sm: 48 }, // Touch-friendly size
        },
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive Image
export const ResponsiveImage = ({ src, alt, aspectRatio = '16/9', ...props }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        paddingTop: `calc(100% / (${aspectRatio.replace('/', ' / ')}))`,
        overflow: 'hidden',
        borderRadius: { xs: 2, sm: 3, md: 4 },
        ...props.sx,
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  );
};

export default ResponsiveLayout;
