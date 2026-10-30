import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Divider,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
} from '@mui/icons-material';
import { RefundsMetrics } from '../../services/analyticsApi';

interface RefundMetricsCardProps {
  metrics?: RefundsMetrics;
  isLoading?: boolean;
}

export const RefundMetricsCard: React.FC<RefundMetricsCardProps> = ({
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card elevation={0} sx={{ height: 400, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton width="60%" height={32} />
          <Skeleton width="40%" height={48} sx={{ my: 2 }} />
          <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
        </CardContent>
      </Card>
    );
  }

  const approved = metrics?.approvedCount || 0;
  const pending = metrics?.pendingCount || 0;
  const rejected = metrics?.rejectedCount || 0;
  const total = metrics?.totalRequests || 0;
  const rate = metrics?.approvalRatePercent || 0;
  const disbursed = metrics?.approvedAmountTotal || 0;
  const avgAmount = metrics?.averageRequestAmount || 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Financial & Refund Metrics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Disbursements subject to supervisor authorization
            </Typography>
          </Box>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WalletIcon fontSize="small" />
          </Box>
        </Box>

        {/* Big Amount */}
        <Box sx={{ my: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            TOTAL FUNDS DISBURSED
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
            ${disbursed.toFixed(2)} USD
          </Typography>
        </Box>

        {/* Approval Rate Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Approval Rate
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {rate}% ({approved} of {total})
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={rate}
            color="success"
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Breakdown Row */}
        <Stack spacing={1.5} sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ApprovedIcon sx={{ fontSize: 14 }} color="success" /> Approved & Executed:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {approved} requests
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PendingIcon sx={{ fontSize: 14 }} color="warning" /> Pending HITL Review:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {pending} requests
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <RejectedIcon sx={{ fontSize: 14 }} color="error" /> Rejected Requests:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {rejected} requests
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Average Refund Size:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              ${avgAmount.toFixed(2)} USD
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
