import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Agent Dashboard
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Agent metrics, recent activity and quick actions will appear here.
      </Paper>
    </Box>
  );
};
