import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import { AgentMetric } from '../../services/analyticsApi';

interface AgentPerformanceTableProps {
  agents: AgentMetric[];
  isLoading?: boolean;
}

export const AgentPerformanceTable: React.FC<AgentPerformanceTableProps> = ({
  agents,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Support Staff Performance
        </Typography>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Paper>
    );
  }

  const roleColors: Record<string, 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info'> = {
    agent: 'primary',
    reviewer: 'warning',
    admin: 'error',
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Support Staff Workload & Resolution Metrics
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Track ticket throughput across support team members
        </Typography>
      </Box>

      {agents.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No agent performance records available.</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Staff Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Assigned</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Resolved</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Completion Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
                        {agent.name ? agent.name[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={agent.role.toUpperCase()}
                      color={roleColors[agent.role] || 'default'}
                      sx={{ fontWeight: 700, fontSize: '0.675rem' }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {agent.assignedCases}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {agent.resolvedCases}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={agent.completionRate}
                          color={agent.completionRate >= 75 ? 'success' : agent.completionRate >= 50 ? 'primary' : 'warning'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>
                        {agent.completionRate}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
