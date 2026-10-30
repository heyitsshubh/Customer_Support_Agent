import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Stack,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Assignment as CasesIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as ResolvedIcon,
  RateReview as ApprovalIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { CaseTable } from '../../components/cases/CaseTable';
import { useGetOverviewMetricsQuery } from '../../services/analyticsApi';
import { useGetCasesQuery } from '../../services/casesApi';
import { useAppSelector } from '../../store';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useGetOverviewMetricsQuery();

  const {
    data: casesData,
    isLoading: isLoadingCases,
    refetch: refetchCases,
  } = useGetCasesQuery({ limit: 6, page: 1 });

  const metrics = metricsData?.data;
  const recentCases = casesData?.data?.cases || [];

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchCases();
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome & Actions Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Welcome back, {user?.name || 'Agent'} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here is the current operational overview of incoming customer tickets and AI agent resolutions.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/agent/cases')}
          >
            View All Cases
          </Button>
        </Stack>
      </Box>

      {/* Pending Approvals Callout Banner */}
      {metrics && metrics.pendingApprovals > 0 && (
        <Alert
          severity="warning"
          icon={<ApprovalIcon fontSize="inherit" />}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="warning"
              size="small"
              variant="outlined"
              onClick={() => navigate('/supervisor/pending')}
            >
              Review Queue ({metrics.pendingApprovals})
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Action Required: Human-in-the-Loop Queue</AlertTitle>
          There are <strong>{metrics.pendingApprovals} cases</strong> currently suspended at the supervisor
          approval gate awaiting human review before financial execution.
        </Alert>
      )}

      {/* 4 KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Total Tickets"
            value={metrics?.totalCases ?? 0}
            subtitle="All recorded inquiries"
            icon={<CasesIcon />}
            color="primary"
            isLoading={isLoadingMetrics}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Open Inquiries"
            value={metrics?.openCases ?? 0}
            subtitle="Awaiting agent handling"
            icon={<PendingIcon />}
            color="info"
            isLoading={isLoadingMetrics}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Pending Approval"
            value={metrics?.pendingApprovals ?? 0}
            subtitle="Financial HITL gate paused"
            icon={<ApprovalIcon />}
            color="warning"
            isLoading={isLoadingMetrics}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Resolution Rate"
            value={`${metrics?.resolutionRatePercent ?? 0}%`}
            subtitle={`${metrics?.resolvedCases ?? 0} tickets resolved`}
            icon={<ResolvedIcon />}
            color="success"
            isLoading={isLoadingMetrics}
          />
        </Grid>
      </Grid>

      {/* Recent Cases Section */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Recent Support Cases
        </Typography>
        <Button
          size="small"
          onClick={() => navigate('/agent/cases')}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          See All &rarr;
        </Button>
      </Box>

      <CaseTable cases={recentCases} isLoading={isLoadingCases} />
    </Box>
  );
};
