import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  ReceiptLong as RefundIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  Chat as ChatIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  Paid as PaidIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetRefundsListQuery, RefundRecord } from '../../services/customerPortalApi';

export const RefundsPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');

  const queryParams = selectedStatusTab !== 'all' ? { status: selectedStatusTab } : undefined;
  const { data, isLoading, refetch } = useGetRefundsListQuery(queryParams);

  const refunds = data?.data?.refunds || [];
  const totalCount = data?.data?.total || refunds.length;

  const getRefundStatusChip = (status: string) => {
    switch (status.toLowerCase()) {
      case 'executed':
        return (
          <Chip
            size="small"
            color="success"
            icon={<PaidIcon sx={{ fontSize: 14 }} />}
            label="EXECUTED (DISBURSED)"
            sx={{ fontWeight: 700, fontSize: '0.675rem' }}
          />
        );
      case 'approved':
        return (
          <Chip
            size="small"
            color="info"
            icon={<ApprovedIcon sx={{ fontSize: 14 }} />}
            label="SUPERVISOR APPROVED"
            sx={{ fontWeight: 700, fontSize: '0.675rem' }}
          />
        );
      case 'pending':
        return (
          <Chip
            size="small"
            color="warning"
            icon={<PendingIcon sx={{ fontSize: 14 }} />}
            label="PENDING SUPERVISOR REVIEW"
            sx={{ fontWeight: 700, fontSize: '0.675rem' }}
          />
        );
      case 'rejected':
        return (
          <Chip
            size="small"
            color="error"
            icon={<RejectedIcon sx={{ fontSize: 14 }} />}
            label="DECLINED"
            sx={{ fontWeight: 700, fontSize: '0.675rem' }}
          />
        );
      default:
        return <Chip size="small" label={status.toUpperCase()} sx={{ fontWeight: 600 }} />;
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Refund Requests & Disbursements
            </Typography>
            <Chip
              icon={<RefundIcon sx={{ fontSize: 16 }} />}
              label={`${totalCount} RECORDS`}
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Audit log of all refund inquiries, supervisor authorizations, and processed payments.
          </Typography>
        </Box>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="small">
          Refresh
        </Button>
      </Box>

      {/* HITL Notice Banner */}
      <Alert severity="info" icon={<ShieldIcon />} sx={{ mb: 3, borderRadius: 2 }}>
        <strong>Human-in-the-Loop Financial Guardrail:</strong> AI agents cannot withdraw or disburse funds
        autonomously. All refund requests are reviewed by a human supervisor to guarantee zero unauthorized
        payouts.
      </Alert>

      {/* Status Filter Tabs */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Tabs
          value={selectedStatusTab}
          onChange={(_e, val) => setSelectedStatusTab(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Refunds" value="all" sx={{ fontWeight: 600 }} />
          <Tab label="Pending Review" value="pending" sx={{ fontWeight: 600 }} />
          <Tab label="Approved" value="approved" sx={{ fontWeight: 600 }} />
          <Tab label="Executed" value="executed" sx={{ fontWeight: 600 }} />
          <Tab label="Declined" value="rejected" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Paper>

      {/* Refunds Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Refund ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Authorization & Notes</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date Requested</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : refunds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No refund records found in this category.
                </TableCell>
              </TableRow>
            ) : (
              refunds.map((r: RefundRecord) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      #{r.id.slice(0, 8)}
                    </Typography>
                    {r.caseId && (
                      <Typography variant="caption" color="text.secondary">
                        Case: {r.caseId.slice(0, 8)}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                      ${r.amount.toFixed(2)} USD
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {getRefundStatusChip(r.status)}
                  </TableCell>

                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {r.reason || 'Duplicate charge refund on ORD-1042'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 240 }}>
                    {r.approverName || r.approverId ? (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          Authorized by: {r.approverName || r.approverId}
                        </Typography>
                        {r.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                            "{r.notes}"
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Awaiting supervisor sign-off
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Open Chat Session">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ChatIcon fontSize="small" />}
                        onClick={() => navigate('/customer/chat')}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Chat
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
