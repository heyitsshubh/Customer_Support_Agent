import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useGetPendingApprovalsQuery } from '../../services/casesApi';
import { useApproveCaseMutation } from '../../services/chatApi';
import { PendingApprovalCard, PendingCaseItem } from '../../components/supervisor/PendingApprovalCard';

export const PendingPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Auto-poll pending approvals every 5 seconds
  const { data, isLoading, refetch } = useGetPendingApprovalsQuery(undefined, {
    pollingInterval: 5000,
  });

  const [approveCase, { isLoading: isSubmitting }] = useApproveCaseMutation();

  const [selectedCase, setSelectedCase] = useState<PendingCaseItem | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(true);
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const pendingCases = (data?.data?.cases || []) as PendingCaseItem[];
  const totalCount = data?.data?.total ?? pendingCases.length;

  const handleOpenDialog = (item: PendingCaseItem, approved: boolean) => {
    setSelectedCase(item);
    setIsApproving(approved);
    setSupervisorNotes(
      approved
        ? 'Verified duplicate charge on order ORD-1042. Approved for immediate customer refund.'
        : 'Request does not meet refund policy criteria.'
    );
    setDialogOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedCase) return;

    const threadId = selectedCase.threadId || `thread_${selectedCase.id}`;

    try {
      const response = await approveCase({
        threadId,
        approved: isApproving,
        notes: supervisorNotes.trim(),
      }).unwrap();

      setDialogOpen(false);

      if (isApproving) {
        enqueueSnackbar('Refund successfully approved! The LangGraph AI Agent has resumed execution.', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar('Refund request declined. Customer case updated.', {
          variant: 'info',
        });
      }

      refetch();
    } catch (err: any) {
      const msg = err?.data?.message || err?.data?.error?.message || 'Failed to submit supervisor decision.';
      enqueueSnackbar(msg, { variant: 'error' });
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
              Supervisor Approval Queue
            </Typography>
            <Chip
              icon={<ShieldIcon sx={{ fontSize: 16 }} />}
              label={`${totalCount} PENDING`}
              color={totalCount > 0 ? 'warning' : 'success'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Human-in-the-loop review station. Actions requiring supervisor authorization remain paused here
            until reviewed.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Queue automatically polls every 5 seconds">
            <Chip
              size="small"
              variant="outlined"
              color="info"
              label="Live Polling (5s)"
              sx={{ fontWeight: 600, display: { xs: 'none', md: 'inline-flex' } }}
            />
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Safety Gate Policy Alert */}
      <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
        <strong>Financial Invariant Enforced:</strong> Per system safety policy, write tools like{' '}
        <code>request_refund</code> cannot disburse funds autonomously without valid supervisor authentication.
        Approving a request signals the LangGraph state machine to resume and execute the payout.
      </Alert>

      {/* Content Area */}
      {isLoading && pendingCases.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : pendingCases.length === 0 ? (
        /* Empty Queue State */
        <Paper
          elevation={0}
          sx={{
            py: 8,
            px: 4,
            textAlign: 'center',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 3,
            bgcolor: (theme) => (theme.palette.mode === 'light' ? '#FAFAFA' : '#111827'),
          }}
        >
          <DoneAllIcon sx={{ fontSize: 64, color: 'success.main', mb: 1.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Queue is Clear! 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 3 }}>
            There are currently no actions suspended at the human-in-the-loop approval gate.
            Incoming financial requests will appear here automatically.
          </Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
            Check Again
          </Button>
        </Paper>
      ) : (
        /* Cards Grid */
        <Grid container spacing={3}>
          {pendingCases.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.id}>
              <PendingApprovalCard item={item} onOpenApprovalDialog={handleOpenDialog} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Approval / Rejection Confirmation Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          {isApproving ? (
            <>
              <ApprovedIcon color="success" /> Approve Financial Action
            </>
          ) : (
            <>
              <RejectedIcon color="error" /> Decline Financial Action
            </>
          )}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isApproving
              ? 'Confirming approval will lift the LangGraph interrupt and execute the refund immediately.'
              : 'Declining will notify the AI agent to inform the customer that their refund request was not approved.'}
          </Typography>

          {selectedCase && (
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'light' ? '#F8FAFC' : '#0B0F19'),
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedCase.subject || (selectedCase as any).intent || 'Case Inquiry'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Case ID: {selectedCase.id} • Thread: {selectedCase.threadId || 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: isApproving ? 'success.main' : 'error.main' }}>
                Action: {isApproving ? 'DISBURSE REFUND' : 'DECLINE REFUND'} ($
                {(selectedCase.refundRequest?.amount ?? 89.99).toFixed(2)} USD)
              </Typography>
            </Box>
          )}

          <TextField
            autoFocus
            label="Supervisor Review Notes"
            fullWidth
            multiline
            rows={3}
            value={supervisorNotes}
            onChange={(e) => setSupervisorNotes(e.target.value)}
            helperText="These notes are recorded in the permanent financial audit log."
          />
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={isApproving ? 'success' : 'error'}
            onClick={handleConfirmDecision}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isSubmitting ? 'Processing...' : isApproving ? 'Authorize Refund' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
