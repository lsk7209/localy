'use client';

import { createTheme } from '@mui/material/styles';
import { blue, grey, indigo } from '@mui/material/colors';

/**
 * MUI 테마 설정
 * 디자인 토큰 우선 원칙에 따라 색상/간격/반경/그림자를 토큰으로 정의
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // indigo-600
      light: '#818CF8',
      dark: '#4338CA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2563EB', // blue-600
      light: '#60A5FA',
      dark: '#1D4ED8',
    },
    info: {
      main: '#137FEC',
      light: '#3B9EFF',
      dark: '#0E6BC7',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: [
      'Pretendard Variable',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Noto Sans KR"',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 900,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 4,
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px rgba(0, 0, 0, 0.1)',
    '0px 4px 6px rgba(0, 0, 0, 0.1)',
    '0px 10px 15px rgba(0, 0, 0, 0.1)',
    '0px 20px 25px rgba(0, 0, 0, 0.1)',
    '0px 25px 50px rgba(0, 0, 0, 0.15)',
    '0px 30px 60px rgba(0, 0, 0, 0.2)',
    '0px 35px 70px rgba(0, 0, 0, 0.25)',
    '0px 40px 80px rgba(0, 0, 0, 0.3)',
    '0px 45px 90px rgba(0, 0, 0, 0.35)',
    '0px 50px 100px rgba(0, 0, 0, 0.4)',
    '0px 55px 110px rgba(0, 0, 0, 0.45)',
    '0px 60px 120px rgba(0, 0, 0, 0.5)',
    '0px 65px 130px rgba(0, 0, 0, 0.55)',
    '0px 70px 140px rgba(0, 0, 0, 0.6)',
    '0px 75px 150px rgba(0, 0, 0, 0.65)',
    '0px 80px 160px rgba(0, 0, 0, 0.7)',
    '0px 85px 170px rgba(0, 0, 0, 0.75)',
    '0px 90px 180px rgba(0, 0, 0, 0.8)',
    '0px 95px 190px rgba(0, 0, 0, 0.85)',
    '0px 100px 200px rgba(0, 0, 0, 0.9)',
    '0px 105px 210px rgba(0, 0, 0, 0.95)',
    '0px 110px 220px rgba(0, 0, 0, 1)',
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 16px',
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      variants: [
        {
          props: { size: 'small' },
          style: {
            padding: '6px 12px',
            fontSize: '0.875rem',
          },
        },
        {
          props: { size: 'large' },
          style: {
            padding: '14px 24px',
            fontSize: '1rem',
          },
        },
      ],
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

declare module '@mui/material/styles' {
  interface Palette {
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  }
  interface PaletteOptions {
    neutral?: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  }
}

