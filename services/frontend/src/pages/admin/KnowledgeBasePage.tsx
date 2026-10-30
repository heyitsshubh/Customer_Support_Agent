import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const KnowledgeBasePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Knowledge Base & Vector Store
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        Knowledge base documents, vector similarity search testing, and document uploads.
      </Paper>
    </Box>
  );
};
