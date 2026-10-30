import { createTheme, responsiveFontSizes, ThemeOptions } from '@mui/material/styles';

export const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: '#4F46E5',
      light: '#818CF8',
      dark: '#3730A3',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4',
      light: '#67E8F9',
      dark: '#0E7490',
      contrastText: '#FFFFFF',
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
    background: {
      default: mode === 'light' ? '#F8FAFC' : '#0B0F19',
      paper: mode === 'light' ? '#FFFFFF' : '#111827',
    },
    text: {
      primary: mode === 'light' ? '#0F172A' : '#F1F5F9',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
          border: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #1F2937',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #1F2937',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #1F2937',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return responsiveFontSizes(createTheme(getThemeOptions(mode)));
};
