import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CloseIcon,
  Flag as PriorityIcon,
  PersonAdd as AssignIcon,
  Send as SendNoteIcon,
  Shield as ShieldIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  useGetCaseByIdQuery,
  useGetCaseTimelineQuery,
  useAddNoteMutation,
  useUpdatePriorityMutation,
  useCloseCaseMutation,
  useAssignCaseMutation,
} from '../../services/casesApi';
import { StatusBadge } from '../../components/cases/StatusBadge';
import { PriorityBadge } from '../../components/cases/PriorityBadge';
import { CaseTimeline } from '../../components/cases/CaseTimeline';
import { CustomerCard } from '../../components/cases/CustomerCard';
import { CasePriority } from '../../types';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const caseId = id || '';

  const {
    data: caseData,
    isLoading: isLoadingCase,
    refetch: refetchCase,
  } = useGetCaseByIdQuery(caseId, { skip: !caseId });

  const {
    data: timelineData,
    isLoading: isLoadingTimeline,
    refetch: refetchTimeline,
  } = useGetCaseTimelineQuery(caseId, { skip: !caseId });

  // Mutations
  const [addNote, { isLoading: isAddingNote }] = useAddNoteMutation();
  const [updatePriority, { isLoading: isUpdatingPriority }] = useUpdatePriorityMutation();
  const [closeCase, { isLoading: isClosingCase }] = useCloseCaseMutation();
  const [assignCase, { isLoading: isAssigningCase }] = useAssignCaseMutation();

  // Dialog states
  const [noteText, setNoteText] = useState('');
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<CasePriority>('medium');

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignedAgentId, setAssignedAgentId] = useState('');

  const supportCase = caseData?.data?.case;
  const customer = caseData?.data?.customer;
  const timeline = timelineData?.data?.timeline || [];

  const handleRefresh = () => {
    refetchCase();
    refetchTimeline();
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote({ id: caseId, note: noteText.trim() }).unwrap();
      setNoteText('');
      enqueueSnackbar('Internal note appended to case history', { variant: 'success' });
      refetchCase();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to add note', { variant: 'error' });
    }
  };

  const handleUpdatePriority = async () => {
    try {
      await updatePriority({ id: caseId, priority: newPriority }).unwrap();
      setPriorityDialogOpen(false);
      enqueueSnackbar(`Priority updated to ${newPriority.toUpperCase()}`, { variant: 'success' });
      refetchCase();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to update priority', { variant: 'error' });
    }
  };

  const handleCloseCase = async () => {
    try {
      await closeCase({ id: caseId, resolutionNotes }).unwrap();
      setCloseDialogOpen(false);
      enqueueSnackbar('Case marked as closed and resolved', { variant: 'success' });
      refetchCase();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to close case', { variant: 'error' });
    }
  };

  const handleAssignCase = async () => {
    if (!assignedAgentId.trim()) return;
    try {
      await assignCase({ id: caseId, agentId: assignedAgentId.trim() }).unwrap();
      setAssignDialogOpen(false);
      enqueueSnackbar(`Case assigned to ${assignedAgentId}`, { variant: 'success' });
      refetchCase();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to assign case', { variant: 'error' });
    }
  };

  if (isLoadingCase) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!supportCase) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          Case #{caseId} Not Found
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/agent/cases')}>
          Return to Cases Directory
        </Button>
      </Box>
    );
  }

  const isPendingApproval = supportCase.status === 'pending_approval';
  const isClosed = supportCase.status === 'closed' || supportCase.status === 'resolved';

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header Bar */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/agent/cases')}
          sx={{ mb: 1, textTransform: 'none', color: 'text.secondary' }}
          size="small"
        >
          Back to Cases
        </Button>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
                {supportCase.subject || (supportCase as any).intent || 'Customer Inquiry'}
              </Typography>
              <StatusBadge status={supportCase.status} />
              <PriorityBadge priority={supportCase.priority} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Case ID: {supportCase.id} • Created on {new Date(supportCase.createdAt).toLocaleString()}
            </Typography>
          </Box>

          {/* Action Buttons Toolbar */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Tooltip title="Refresh case status">
              <IconButton onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              size="small"
              variant="outlined"
              startIcon={<PriorityIcon />}
              onClick={() => {
                setNewPriority(supportCase.priority as CasePriority);
                setPriorityDialogOpen(true);
              }}
              disabled={isClosed}
            >
              Priority
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<AssignIcon />}
              onClick={() => {
                setAssignedAgentId(supportCase.assignedAgentId || (supportCase as any).assignedTo || '');
                setAssignDialogOpen(true);
              }}
              disabled={isClosed}
            >
              Assign
            </Button>

            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CloseIcon />}
              onClick={() => setCloseDialogOpen(true)}
              disabled={isClosed}
            >
              Close Case
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Main Grid: Left Details + Right Sidebar */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Case Overview Card */}
            <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Case Overview & Summary
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    ASSIGNED AGENT
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {supportCase.assignedAgentId || (supportCase as any).assignedTo || 'Unassigned (AI Automation)'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    CHAT THREAD ID
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {supportCase.threadId || 'N/A'}
                    </Typography>
                    {supportCase.threadId && (
                      <Button
                        component={Link}
                        to="/customer/chat"
                        size="small"
                        startIcon={<ChatIcon fontSize="small" />}
                        sx={{ fontSize: '0.75rem', py: 0 }}
                      >
                        Open Chat
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" color="text.secondary">
                SUMMARY & NOTES
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 0.5,
                  bgcolor: (theme) => (theme.palette.mode === 'light' ? '#F8FAFC' : '#0B0F19'),
                  borderRadius: 2,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                {(supportCase as any).summary || supportCase.description || 'No summary recorded yet.'}
              </Paper>

              {supportCase.resolutionNote && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                    RESOLUTION NOTES:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      mt: 0.5,
                      bgcolor: (theme) => (theme.palette.mode === 'light' ? '#F0FDF4' : '#064E3B'),
                      borderRadius: 1.5,
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Typography variant="body2">{supportCase.resolutionNote}</Typography>
                  </Paper>
                </Box>
              )}
            </Paper>

            {/* Audit Trail Timeline */}
            <CaseTimeline timeline={timeline} isLoading={isLoadingTimeline} />

            {/* Internal Notes Appender */}
            <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Add Internal Support Note
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Internal notes are visible only to support staff and will be appended to the permanent audit trail.
              </Typography>

              <TextField
                placeholder="Type your internal note here..."
                multiline
                rows={3}
                fullWidth
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isAddingNote || isClosed}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={!isAddingNote && <SendNoteIcon />}
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || isAddingNote || isClosed}
                  size="small"
                >
                  {isAddingNote ? 'Saving...' : 'Append Note'}
                </Button>
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* Right Column: Customer Card + HITL Alert */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            {/* Pending Approval Callout */}
            {isPendingApproval && (
              <Alert
                severity="warning"
                icon={<ShieldIcon fontSize="inherit" />}
                sx={{ borderRadius: 2 }}
                action={
                  <Button
                    size="small"
                    color="warning"
                    variant="contained"
                    onClick={() => navigate('/supervisor/pending')}
                    sx={{ mt: 1 }}
                  >
                    Go to Approval Queue
                  </Button>
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Awaiting Reviewer Approval
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  This ticket has an active financial action suspended at the LangGraph interrupt gate.
                </Typography>
              </Alert>
            )}

            {/* Customer Profile Card */}
            <CustomerCard customer={customer} customerId={supportCase.customerId} />
          </Stack>
        </Grid>
      </Grid>

      {/* Change Priority Dialog */}
      <Dialog open={priorityDialogOpen} onClose={() => setPriorityDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change Case Priority</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="change-priority-label">Priority</InputLabel>
            <Select
              labelId="change-priority-label"
              label="Priority"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as CasePriority)}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPriorityDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdatePriority} disabled={isUpdatingPriority}>
            {isUpdatingPriority ? 'Updating...' : 'Save Priority'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Case Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Close Support Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide resolution notes explaining how the inquiry or refund request was finalized.
          </Typography>
          <TextField
            autoFocus
            label="Resolution Notes"
            multiline
            rows={3}
            fullWidth
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="e.g. Duplicate charge on ORD-1042 was refunded $89.99 with supervisor approval."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCloseCase} disabled={isClosingCase}>
            {isClosingCase ? 'Closing...' : 'Confirm Resolution'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Agent Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Ticket to Agent</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Agent ID / Email"
            fullWidth
            value={assignedAgentId}
            onChange={(e) => setAssignedAgentId(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="e.g. agent-001 or agent@support.dev"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignCase} disabled={isAssigningCase || !assignedAgentId.trim()}>
            {isAssigningCase ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
