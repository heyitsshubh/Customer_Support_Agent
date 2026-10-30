import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { SupportCase } from '../../types';

interface CaseTableProps {
  cases: SupportCase[];
  isLoading?: boolean;
}

export const CaseTable: React.FC<CaseTableProps> = ({ cases, isLoading = false }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Case ID</TableCell>
              <TableCell>Subject / Intent</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={160} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={60} /></TableCell>
                <TableCell><Skeleton width={90} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell align="right"><Skeleton width={30} sx={{ ml: 'auto' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (cases.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          border: (theme) => `1px dashed ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          No support cases found matching the criteria.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Subject / Intent</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Customer ID</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cases.map((c) => (
            <TableRow
              key={c.id}
              hover
              sx={{
                cursor: 'pointer',
                '&:last-child td, &:last-child th': { border: 0 },
              }}
              onClick={() => navigate(`/agent/cases/${c.id}`)}
            >
              <TableCell component="th" scope="row">
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  #{c.id.slice(0, 8)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.subject || (c as any).intent || 'Customer Inquiry'}
                  </Typography>
                  {(c as any).summary && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {(c as any).summary}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {c.customerId.slice(0, 12)}
                </Typography>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={c.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Tooltip title="View case details">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/agent/cases/${c.id}`)}
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
