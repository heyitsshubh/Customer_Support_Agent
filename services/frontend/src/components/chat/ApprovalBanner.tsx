import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import {
  ShieldOutlined as ShieldIcon,
  Refresh as RefreshIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { PendingAction } from '../../types';

interface ApprovalBannerProps {
  pendingAction?: PendingAction | null;
  onRefresh?: () => void;
  isChecking?: boolean;
}

export const ApprovalBanner: React.FC<ApprovalBannerProps> = ({
  pendingAction,
  onRefresh,
  isChecking = false,
}) => {
  return (
    <Alert
      severity="warning"
      icon={<ShieldIcon fontSize="inherit" />}
      sx={{
        my: 2,
        borderRadius: 2,
        border: (theme) => `1px solid ${theme.palette.warning.main}`,
        '& .MuiAlert-icon': {
          color: 'warning.main',
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        Supervisor Approval Gate Triggered
        <Chip
          icon={<PendingIcon sx={{ fontSize: 14 }} />}
          label="AWAITING REVIEW"
          color="warning"
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.675rem' }}
        />
      </AlertTitle>

      <Typography variant="body2" sx={{ mb: 1.5 }}>
        The AI Support Agent formulated a resolution requiring a sensitive financial action. Per company
        safety invariants, refunds cannot be executed autonomously without human supervisor approval.
      </Typography>

      {pendingAction && (
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)',
            border: '1px dashed rgba(245, 158, 11, 0.4)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
            Action Details:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Type:</strong> {(pendingAction.type || pendingAction.action || 'ACTION').toUpperCase()}
          </Typography>
          {pendingAction.amount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              • <strong>Amount:</strong> ${pendingAction.amount.toFixed(2)} USD
            </Typography>
          )}
          {pendingAction.description && (
            <Typography variant="body2" color="text.secondary">
              • <strong>Reason:</strong> {pendingAction.description}
            </Typography>
          )}
        </Box>
      )}

      {onRefresh && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={isChecking}
          >
            {isChecking ? 'Checking status...' : 'Check Approval Status'}
          </Button>
        </Stack>
      )}
    </Alert>
  );
};
