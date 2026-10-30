import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { SmartToy as RobotIcon } from '@mui/icons-material';

export const TypingIndicator: React.FC<{ statusMessage?: string }> = ({
  statusMessage = 'AI Agent is reasoning & retrieving context...',
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, my: 1.5, maxWidth: '80%' }}>
      <Avatar
        sx={{
          bgcolor: 'primary.main',
          width: 36,
          height: 36,
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
        }}
      >
        <RobotIcon sx={{ fontSize: 20 }} />
      </Avatar>

      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 3,
          borderTopLeftRadius: 0,
          bgcolor: (theme) => (theme.palette.mode === 'light' ? '#EEF2FF' : '#1E1B4B'),
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: 'bounce 1.4s infinite ease-in-out both',
                '@keyframes bounce': {
                  '0%, 80%, 100%': { transform: 'scale(0)' },
                  '40%': { transform: 'scale(1.0)' },
                },
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.2s',
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.4s',
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {statusMessage}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
