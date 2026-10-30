import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const ExperimentsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        AI Evaluations & Experiments
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Benchmark evaluations against golden datasets and LLM test scenario runs.
      </Paper>
    </Box>
  );
};
