import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  Stack,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  WorkspacePremium as TierIcon,
  AttachMoney as MoneyIcon,
  ShoppingBag as OrdersIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface CustomerCardProps {
  customer?: {
    id: string;
    email: string;
    name: string;
    tier: string;
    lifetimeValue?: number;
  } | null;
  customerId: string;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, customerId }) => {
  const navigate = useNavigate();

  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return 'secondary';
      case 'premium':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Card elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" fontSize="small" />
          Customer Information
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 44,
              height: 44,
              fontWeight: 700,
              fontSize: '1.1rem',
            }}
          >
            {customer?.name ? customer.name[0].toUpperCase() : 'C'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {customer?.name || 'Customer'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <EmailIcon sx={{ fontSize: 13 }} />
              {customer?.email || 'N/A'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TierIcon sx={{ fontSize: 14 }} /> Customer Tier:
            </Typography>
            <Chip
              size="small"
              label={customer?.tier ? customer.tier.toUpperCase() : 'STANDARD'}
              color={getTierColor(customer?.tier)}
              sx={{ fontWeight: 700, fontSize: '0.675rem' }}
            />
          </Box>

          {customer?.lifetimeValue !== undefined && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MoneyIcon sx={{ fontSize: 14 }} /> Lifetime Spend:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                ${customer.lifetimeValue.toFixed(2)}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              ID:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {customerId.slice(0, 16)}...
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<OrdersIcon />}
          onClick={() => navigate('/customer/orders')}
          sx={{ textTransform: 'none', borderRadius: 1.5 }}
        >
          View Order History
        </Button>
      </CardContent>
    </Card>
  );
};
