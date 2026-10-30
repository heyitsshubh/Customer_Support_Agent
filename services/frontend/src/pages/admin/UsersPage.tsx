import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const UsersPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        User & Role Management
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Admin controls for listing users, changing roles, and activating accounts.
      </Paper>
    </Box>
  );
};
