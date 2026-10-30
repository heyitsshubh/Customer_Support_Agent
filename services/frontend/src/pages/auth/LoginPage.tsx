import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useLoginMutation } from '../../services/authApi';
import { useAppDispatch } from '../../store';
import { setCredentials } from '../../store/slices/authSlice';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const response = await login(values).unwrap();
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        dispatch(
          setCredentials({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          })
        );

        enqueueSnackbar(`Welcome back, ${user.name}!`, { variant: 'success' });

        // Redirect based on previous location or user role
        const from = (location.state as any)?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else if (user.role === 'customer') {
          navigate('/customer/chat', { replace: true });
        } else if (user.role === 'reviewer') {
          navigate('/supervisor/pending', { replace: true });
        } else if (user.role === 'admin') {
          navigate('/agent/dashboard', { replace: true });
        } else {
          navigate('/agent/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.data?.error?.message || 'Invalid email or password. Please try again.';
      setErrorMessage(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'radial-gradient(ellipse at top, #EEF2FF 0%, #F8FAFC 100%)'
            : 'radial-gradient(ellipse at top, #1E1B4B 0%, #0B0F19 100%)',
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Logo & Heading */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                mb: 1.5,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              }}
            >
              🤖
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Sign in to SupportAgent
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              AI-Powered Customer Support & Ticketing
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label="Email Address"
              type="email"
              fullWidth
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              {...register('password')}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              startIcon={!isLoading && <LoginIcon />}
              sx={{
                py: 1.25,
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          {/* Quick Fill / Demo Accounts */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 500 }}>
              QUICK FILL DEMO ACCOUNTS
            </Typography>
          </Divider>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ justifyContent: 'center' }}>
            <Chip
              label="Customer"
              size="small"
              variant="outlined"
              color="info"
              onClick={() => handleQuickFill('alice@example.com', 'password123')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Support Agent"
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => handleQuickFill('agent@support.dev', 'password123')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Supervisor"
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => handleQuickFill('supervisor@support.dev', 'password123')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Admin"
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleQuickFill('admin@support.dev', 'password123')}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>

          {/* Register Link */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Typography
                component={Link}
                to="/register"
                variant="body2"
                color="primary.main"
                sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Create Account
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
