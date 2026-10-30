import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Chat as ChatIcon,
  ShoppingBag as OrdersIcon,
  ReceiptLong as RefundsIcon,
  Dashboard as DashboardIcon,
  Assignment as CasesIcon,
  CheckCircleOutline as ApprovalIcon,
  BarChart as AnalyticsIcon,
  People as UsersIcon,
  MenuBook as KnowledgeBaseIcon,
  Science as ExperimentsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { UserRole } from '../../types';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Customer Portal
  { label: 'AI Chat Support', path: '/customer/chat', icon: <ChatIcon />, roles: ['customer'] },
  { label: 'My Orders', path: '/customer/orders', icon: <OrdersIcon />, roles: ['customer'] },
  { label: 'Refund Requests', path: '/customer/refunds', icon: <RefundsIcon />, roles: ['customer'] },

  // Agent Portal
  { label: 'Agent Dashboard', path: '/agent/dashboard', icon: <DashboardIcon />, roles: ['agent', 'admin'] },
  { label: 'Support Cases', path: '/agent/cases', icon: <CasesIcon />, roles: ['agent', 'reviewer', 'admin'] },

  // Supervisor / Reviewer Portal
  { label: 'Pending Approvals', path: '/supervisor/pending', icon: <ApprovalIcon />, roles: ['reviewer', 'admin'] },

  // Admin & Analytics
  { label: 'Analytics & KPIs', path: '/analytics/overview', icon: <AnalyticsIcon />, roles: ['admin'] },
  { label: 'User Management', path: '/admin/users', icon: <UsersIcon />, roles: ['admin'] },
  { label: 'Knowledge Base', path: '/admin/knowledge-base', icon: <KnowledgeBaseIcon />, roles: ['admin'] },
  { label: 'AI Evaluations', path: '/admin/experiments', icon: <ExperimentsIcon />, roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const role = user?.role || 'customer';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
      sx={{
        width: sidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100% - 64px)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', py: 2 }}>
        <Box sx={{ px: 3, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
            PORTAL NAVIGATION
          </Typography>
        </Box>
        <List>
          {visibleItems.map((item) => {
            const isSelected = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};
