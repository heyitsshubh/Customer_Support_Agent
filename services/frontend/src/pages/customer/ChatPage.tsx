import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const ChatPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        AI Customer Support Chat
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Chat interface will load here.
      </Paper>
    </Box>
  );
};
