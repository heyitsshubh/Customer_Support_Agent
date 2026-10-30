import React from 'react';
import { Box } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAppSelector } from '../../store';

export const AppShell: React.FC = () => {
  const { sidebarOpen } = useAppSelector((state) => state.ui);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            transition: (theme: Theme) =>
              theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
