import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Card sx={{ maxWidth: 400, width: '100%', p: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Create Account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Join Customer Support Portal
          </Typography>
          <Button component={Link} to="/login" variant="text" size="small">
            Already have an account? Sign In
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
