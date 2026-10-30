import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TopicItem } from '../../services/analyticsApi';

// React 18 construct signature compatibility
const ResponsiveContainerComponent = ResponsiveContainer as any;
const PieChartComponent = PieChart as any;
const PieComponent = Pie as any;
const CellComponent = Cell as any;
const TooltipComponent = Tooltip as any;
const LegendComponent = Legend as any;

interface TopicPieChartProps {
  topics: TopicItem[];
  isLoading?: boolean;
}

const INTENT_COLORS: Record<string, string> = {
  billing_dispute: '#F59E0B',
  order_status: '#4F46E5',
  refund_request: '#06B6D4',
  cancellation: '#EF4444',
  general: '#10B981',
  general_inquiry: '#10B981',
  technical_support: '#8B5CF6',
};

const DEFAULT_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const TopicPieChart: React.FC<TopicPieChartProps> = ({ topics, isLoading = false }) => {
  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2, height: 380 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Case Inquiries by Topic
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
          <Skeleton variant="circular" width={220} height={220} />
        </Box>
      </Paper>
    );
  }

  // Format chart data with friendly labels
  const data = topics.map((t) => ({
    name: t.intent.replace(/_/g, ' ').toUpperCase(),
    rawKey: t.intent.toLowerCase(),
    value: t.count,
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <Paper
          elevation={4}
          sx={{
            p: 1.5,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
            {item.name}
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 800 }}>
            {item.value} inquiries ({percent}%)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Inquiry Volume by Intent
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
        Classified dynamically by the LangGraph classification node
      </Typography>

      <Box sx={{ flex: 1, minHeight: 280 }}>
        {data.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No topic classification data available.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainerComponent width="100%" height="100%">
            <PieChartComponent>
              <PieComponent
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <CellComponent
                    key={`cell-${index}`}
                    fill={INTENT_COLORS[entry.rawKey] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </PieComponent>
              <TooltipComponent content={<CustomTooltip />} />
              <LegendComponent
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
              />
            </PieChartComponent>
          </ResponsiveContainerComponent>
        )}
      </Box>
    </Paper>
  );
};
