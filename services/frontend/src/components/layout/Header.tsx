import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  AccountCircle,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar, toggleThemeMode } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { themeMode } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    dispatch(logout());
    navigate('/login');
  };

  const roleColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
    customer: 'info',
    agent: 'primary',
    reviewer: 'warning',
    admin: 'error',
  };

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => dispatch(toggleSidebar())}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            🤖 <Box component="span" sx={{ background: 'linear-gradient(45deg, #4F46E5, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SupportAgent</Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton color="inherit" onClick={() => dispatch(toggleThemeMode())}>
              {themeMode === 'light' ? <DarkIcon /> : <LightIcon />}
            </IconButton>
          </Tooltip>

          {user && (
            <>
              <Chip
                label={user.role.toUpperCase()}
                color={roleColors[user.role] || 'default'}
                size="small"
                sx={{ ml: 1, fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
              />

              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    Signed in as <strong>{user.email}</strong>
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
