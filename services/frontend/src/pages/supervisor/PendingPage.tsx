import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const PendingPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Pending Approvals (HITL Queue)
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Human-in-the-loop pending approval cards for refund actions.
      </Paper>
    </Box>
  );
};
