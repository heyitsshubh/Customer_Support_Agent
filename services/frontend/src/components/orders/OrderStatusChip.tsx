import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  LocalShipping as ShippedIcon,
  CheckCircle as DeliveredIcon,
  Autorenew as ProcessingIcon,
  HourglassEmpty as PendingIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';
import { OrderStatus } from '../../types';

interface OrderStatusChipProps {
  status: OrderStatus | string;
  size?: 'small' | 'medium';
}

export const OrderStatusChip: React.FC<OrderStatusChipProps> = ({ status, size = 'small' }) => {
  const normalized = status.toLowerCase() as OrderStatus;

  let color: ChipProps['color'] = 'default';
  let icon: React.ReactElement | undefined = undefined;

  switch (normalized) {
    case 'delivered':
      color = 'success';
      icon = <DeliveredIcon sx={{ fontSize: 14 }} />;
      break;
    case 'shipped':
      color = 'primary';
      icon = <ShippedIcon sx={{ fontSize: 14 }} />;
      break;
    case 'processing':
      color = 'info';
      icon = <ProcessingIcon sx={{ fontSize: 14 }} />;
      break;
    case 'pending':
      color = 'warning';
      icon = <PendingIcon sx={{ fontSize: 14 }} />;
      break;
    case 'cancelled':
      color = 'default';
      icon = <CancelledIcon sx={{ fontSize: 14 }} />;
      break;
    default:
      color = 'default';
  }

  return (
    <Chip
      size={size}
      color={color}
      icon={icon}
      label={status.toUpperCase()}
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        borderRadius: 1.5,
      }}
    />
  );
};
