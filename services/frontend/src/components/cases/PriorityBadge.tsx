import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  KeyboardDoubleArrowUp as CriticalIcon,
  ArrowUpward as HighIcon,
  DragHandle as MediumIcon,
  ArrowDownward as LowIcon,
} from '@mui/icons-material';
import { CasePriority } from '../../types';

interface PriorityBadgeProps {
  priority: CasePriority | string;
  size?: 'small' | 'medium';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'small' }) => {
  const normalized = priority.toLowerCase() as CasePriority;

  let color: ChipProps['color'] = 'default';
  let icon: React.ReactElement | undefined = undefined;

  switch (normalized) {
    case 'critical':
      color = 'error';
      icon = <CriticalIcon sx={{ fontSize: 14 }} />;
      break;
    case 'high':
      color = 'warning';
      icon = <HighIcon sx={{ fontSize: 14 }} />;
      break;
    case 'medium':
      color = 'info';
      icon = <MediumIcon sx={{ fontSize: 14 }} />;
      break;
    case 'low':
      color = 'default';
      icon = <LowIcon sx={{ fontSize: 14 }} />;
      break;
    default:
      color = 'default';
  }

  return (
    <Chip
      size={size}
      variant="outlined"
      color={color}
      icon={icon}
      label={priority.toUpperCase()}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        borderRadius: 1.5,
      }}
    />
  );
};
