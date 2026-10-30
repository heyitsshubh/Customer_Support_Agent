import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Card sx={{ maxWidth: 400, width: '100%', p: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Sign In</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Customer Support Agent Portal
          </Typography>
          <Button component={Link} to="/register" variant="text" size="small">
            Need an account? Register
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
