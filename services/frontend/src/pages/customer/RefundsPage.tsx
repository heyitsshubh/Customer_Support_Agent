import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const RefundsPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        My Refund Requests
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Refund request statuses will be displayed here.
      </Paper>
    </Box>
  );
};
