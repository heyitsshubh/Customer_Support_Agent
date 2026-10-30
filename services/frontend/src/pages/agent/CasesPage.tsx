import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const CasesPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Support Cases
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Support case list and filter controls will appear here.
      </Paper>
    </Box>
  );
};
