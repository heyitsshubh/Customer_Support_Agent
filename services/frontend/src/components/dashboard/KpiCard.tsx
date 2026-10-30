import React from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  isLoading = false,
}) => {
  const colorMap = {
    primary: { bg: 'rgba(79, 70, 229, 0.12)', text: '#4F46E5' },
    secondary: { bg: 'rgba(6, 182, 212, 0.12)', text: '#06B6D4' },
    success: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6' },
  };

  const currentThemeColor = colorMap[color];

  return (
    <Card
      sx={{
        height: '100%',
        boxShadow: (theme) =>
          theme.palette.mode === 'light'
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: currentThemeColor.bg,
              color: currentThemeColor.text,
            }}
          >
            {icon}
          </Box>
        </Box>

        {isLoading ? (
          <>
            <Skeleton variant="text" width="60%" height={40} />
            {subtitle && <Skeleton variant="text" width="40%" height={20} />}
          </>
        ) : (
          <>
            <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
