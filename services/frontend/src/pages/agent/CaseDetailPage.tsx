import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Case Details #{id}
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Case timeline, conversation log, customer profile, and resolution notes.
      </Paper>
    </Box>
  );
};
