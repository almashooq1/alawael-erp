/**
 * Education Theme - مظهر مخصص للمجال التعليمي
 * يوفر ألوان وأنماط ملائمة لنظام إدارة المدارس
 */

import { createTheme } from '@mui/material/styles';

// ألوان مخصصة للمجال التعليمي
const educationColors = {
  // الألوان الأساسية
  primary: {
    main: '#1976d2', // أزرق تعليمي
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#9c27b0', // بنفسجي للتأكيد
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32', // أخضر للنجاح
    light: '#4caf50',
    dark: '#1b5e20',
  },
  warning: {
    main: '#ed6c02', // برتقالي للتحذير
    light: '#ff9800',
    dark: '#e65100',
  },
  error: {
    main: '#d32f2f', // أحمر للأخطاء
    light: '#ef5350',
    dark: '#c62828',
  },
  info: {
    main: '#0288d1', // أزرق فاتح للمعلومات
    light: '#03a9f4',
    dark: '#01579b',
  },

  // ألوان خاصة بالمجال التعليمي
  education: {
    teacher: '#1976d2',
    student: '#4caf50',
    parent: '#ff9800',
    admin: '#9c27b0',
    exam: '#f44336',
    assignment: '#2196f3',
    attendance: '#4caf50',
    grade: '#ff9800',
  },

  // تدرجات لونية
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
    warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blue: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
    pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    orange: 'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)',
  },
};

// إنشاء Theme
const educationTheme = createTheme({
  direction: 'rtl', // دعم اللغة العربية
  palette: {
    mode: 'light',
    ...educationColors,
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#718096',
    },
  },

  typography: {
    fontFamily: [
      'Cairo',
      'Tajawal',
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),

    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 12, // زوايا أكثر نعومة
  },

  shadows: [
    'none',
    '0 2px 4px rgba(0,0,0,0.05)',
    '0 4px 8px rgba(0,0,0,0.08)',
    '0 6px 12px rgba(0,0,0,0.1)',
    '0 8px 16px rgba(0,0,0,0.12)',
    '0 12px 24px rgba(0,0,0,0.15)',
    '0 16px 32px rgba(0,0,0,0.18)',
    '0 20px 40px rgba(0,0,0,0.2)',
    // ... باقي الظلال
  ],

  components: {
    // Card مخصص
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },

    // Button مخصص
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },

    // Chip مخصص
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },

    // TextField مخصص
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&:hover fieldset': {
              borderColor: educationColors.primary.main,
            },
          },
        },
      },
    },

    // Paper مخصص
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
        elevation3: {
          boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
        },
      },
    },

    // Alert مخصص
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
        standardSuccess: {
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
        },
        standardError: {
          backgroundColor: '#ffebee',
          color: '#c62828',
        },
        standardWarning: {
          backgroundColor: '#fff3e0',
          color: '#e65100',
        },
        standardInfo: {
          backgroundColor: '#e3f2fd',
          color: '#01579b',
        },
      },
    },

    // LinearProgress مخصص
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          height: 8,
        },
        bar: {
          borderRadius: 10,
        },
      },
    },
  },
});

// وظائف مساعدة للألوان
export const getGradeColor = grade => {
  if (grade >= 90) return educationColors.success.main;
  if (grade >= 80) return educationColors.info.main;
  if (grade >= 70) return educationColors.warning.main;
  return educationColors.error.main;
};

export const getAttendanceColor = rate => {
  if (rate >= 95) return educationColors.success.main;
  if (rate >= 85) return educationColors.info.main;
  if (rate >= 75) return educationColors.warning.main;
  return educationColors.error.main;
};

export const getRiskLevelColor = level => {
  const colors = {
    low: educationColors.success.main,
    medium: educationColors.warning.main,
    high: educationColors.error.main,
  };
  return colors[level] || educationColors.info.main;
};

export { educationColors };
export default educationTheme;
