import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { useAppSelector } from './store';
import { createAppTheme } from './theme/theme';
import { AppRoutes } from './routes';

export const AppContent: React.FC = () => {
  const { themeMode } = useAppSelector((state) => state.ui);
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={4000}
      >
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
