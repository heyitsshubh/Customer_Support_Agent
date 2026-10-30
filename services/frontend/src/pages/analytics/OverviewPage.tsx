import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ConfirmationNumber as TicketIcon,
  Star as StarIcon,
  CheckCircle as ResolvedIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { TopicPieChart } from '../../components/analytics/TopicPieChart';
import { RefundMetricsCard } from '../../components/analytics/RefundMetricsCard';
import { AgentPerformanceTable } from '../../components/analytics/AgentPerformanceTable';
import {
  useGetOverviewMetricsQuery,
  useGetTopicsQuery,
  useGetRefundMetricsQuery,
  useGetAgentPerformanceQuery,
} from '../../services/analyticsApi';
import { useAppSelector } from '../../store';

export const OverviewPage: React.FC = () => {
  const { accessToken } = useAppSelector((state) => state.auth);
  const { enqueueSnackbar } = useSnackbar();

  const [periodDays, setPeriodDays] = useState<number>(7);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const {
    data: overviewData,
    isLoading: isLoadingOverview,
    refetch: refetchOverview,
  } = useGetOverviewMetricsQuery();

  const {
    data: topicsData,
    isLoading: isLoadingTopics,
    refetch: refetchTopics,
  } = useGetTopicsQuery();

  const {
    data: refundsData,
    isLoading: isLoadingRefunds,
    refetch: refetchRefunds,
  } = useGetRefundMetricsQuery();

  const {
    data: agentsData,
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useGetAgentPerformanceQuery();

  const overview = overviewData?.data;
  const topics = topicsData?.data?.topics || [];
  const refundMetrics = refundsData?.data;
  const agents = agentsData?.data?.agents || [];

  const handleRefreshAll = () => {
    refetchOverview();
    refetchTopics();
    refetchRefunds();
    refetchAgents();
    enqueueSnackbar('Analytics metrics refreshed', { variant: 'info' });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/reports/daily?format=csv&days=${periodDays}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate audit report.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_case_report_${periodDays}d.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      enqueueSnackbar('Daily audit report downloaded successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to download report', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header & Export Controls */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Analytics & Operations Intelligence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time KPIs, topic classification distribution, financial disbursements, and agent performance.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="period-select-label">Period</InputLabel>
            <Select
              labelId="period-select-label"
              label="Period"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
            >
              <MenuItem value={7}>Last 7 Days</MenuItem>
              <MenuItem value={14}>Last 14 Days</MenuItem>
              <MenuItem value={30}>Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* 4 Summary KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Total Support Volume"
            value={overview?.totalCases ?? 0}
            subtitle={`${overview?.openCases ?? 0} active, ${overview?.pendingApprovals ?? 0} pending`}
            icon={<TicketIcon />}
            color="primary"
            isLoading={isLoadingOverview}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Customer Satisfaction"
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {overview?.averageCsat?.toFixed(1) ?? '4.8'}
                </Typography>
                <Rating
                  value={overview?.averageCsat ?? 4.8}
                  precision={0.1}
                  readOnly
                  size="small"
                  emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
                />
              </Box>
            }
            subtitle="Based on post-resolution CSAT ratings"
            icon={<StarIcon />}
            color="warning"
            isLoading={isLoadingOverview}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Resolution Throughput"
            value={`${overview?.resolutionRatePercent ?? 0}%`}
            subtitle={`${overview?.resolvedCases ?? 0} inquiries resolved`}
            icon={<ResolvedIcon />}
            color="success"
            isLoading={isLoadingOverview}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Refunds Disbursed"
            value={`$${(overview?.totalRefundsDisbursed ?? 0).toFixed(2)}`}
            subtitle="Authorized supervisor payouts"
            icon={<MoneyIcon />}
            color="secondary"
            isLoading={isLoadingOverview}
          />
        </Grid>
      </Grid>

      {/* Middle Grid: Topic Breakdown Chart (7 cols) + Refund Metrics (5 cols) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <TopicPieChart topics={topics} isLoading={isLoadingTopics} />
        </Grid>

        <Grid item xs={12} lg={5}>
          <RefundMetricsCard metrics={refundMetrics} isLoading={isLoadingRefunds} />
        </Grid>
      </Grid>

      {/* Bottom Section: Staff Performance League Table */}
      <AgentPerformanceTable agents={agents} isLoading={isLoadingAgents} />
    </Box>
  );
};
