import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const OverviewPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Analytics & KPIs
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        CSAT charts, topic distribution, and agent performance analytics.
      </Paper>
    </Box>
  );
};
