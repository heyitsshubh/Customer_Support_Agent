import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  RadioButtonUnchecked as OpenIcon,
  Autorenew as InProgressIcon,
  HourglassTop as PendingIcon,
  PriorityHigh as EscalatedIcon,
  CheckCircle as ResolvedIcon,
  Archive as ClosedIcon,
} from '@mui/icons-material';
import { CaseStatus } from '../../types';

interface StatusBadgeProps {
  status: CaseStatus | string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const normalized = status.toLowerCase() as CaseStatus;

  let color: ChipProps['color'] = 'default';
  let label = status.replace(/_/g, ' ').toUpperCase();
  let icon: React.ReactElement | undefined = undefined;

  switch (normalized) {
    case 'open':
      color = 'info';
      icon = <OpenIcon sx={{ fontSize: 14 }} />;
      break;
    case 'in_progress':
      color = 'primary';
      icon = <InProgressIcon sx={{ fontSize: 14 }} />;
      label = 'IN PROGRESS';
      break;
    case 'pending_approval':
      color = 'warning';
      icon = <PendingIcon sx={{ fontSize: 14 }} />;
      label = 'PENDING APPROVAL';
      break;
    case 'escalated':
      color = 'secondary';
      icon = <EscalatedIcon sx={{ fontSize: 14 }} />;
      break;
    case 'resolved':
      color = 'success';
      icon = <ResolvedIcon sx={{ fontSize: 14 }} />;
      break;
    case 'closed':
      color = 'default';
      icon = <ClosedIcon sx={{ fontSize: 14 }} />;
      break;
    default:
      color = 'default';
  }

  return (
    <Chip
      size={size}
      color={color}
      icon={icon}
      label={label}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        borderRadius: 1.5,
        letterSpacing: '0.02em',
      }}
    />
  );
};
