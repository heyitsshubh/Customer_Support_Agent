import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Receipt as ReceiptIcon,
  CheckCircle as ApprovedIcon,
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ChatWindow } from '../../components/chat/ChatWindow';
import {
  useStartChatMutation,
  useSendMessageMutation,
  useGetChatThreadQuery,
} from '../../services/chatApi';
import { useAppSelector } from '../../store';
import { ChatMessage, PendingAction } from '../../types';

export const ChatPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { enqueueSnackbar } = useSnackbar();

  const [threadId, setThreadId] = useState<string | null>(() => {
    return localStorage.getItem('activeChatThreadId');
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('activeChatMessages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [status, setStatus] = useState<'completed' | 'pending_approval' | 'processing' | 'error'>('completed');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [startChat, { isLoading: isStarting }] = useStartChatMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const isLoading = isStarting || isSending;

  // Save conversation state locally
  useEffect(() => {
    if (threadId) {
      localStorage.setItem('activeChatThreadId', threadId);
    } else {
      localStorage.removeItem('activeChatThreadId');
    }
  }, [threadId]);

  useEffect(() => {
    localStorage.setItem('activeChatMessages', JSON.stringify(messages));
  }, [messages]);

  // Optional query to check status of ongoing thread
  const { data: threadData, refetch: refetchThread } = useGetChatThreadQuery(threadId || '', {
    skip: !threadId,
    pollingInterval: status === 'pending_approval' ? 5000 : 0, // auto-poll every 5s if awaiting approval
  });

  useEffect(() => {
    if (threadData?.data?.case) {
      const caseStatus = threadData.data.case.status;
      if (caseStatus === 'resolved' || caseStatus === 'closed') {
        if (status === 'pending_approval') {
          setStatus('completed');
          setPendingAction(null);
          enqueueSnackbar('Your request has been approved and executed by a supervisor!', {
            variant: 'success',
          });
          setMessages((prev) => [
            ...prev,
            {
              role: 'system',
              content: `Resolution update: Case marked as ${caseStatus.toUpperCase()}. ${
                threadData.data.case.resolutionNotes || 'Action processed successfully.'
              }`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    }
  }, [threadData, status, enqueueSnackbar]);

  const handleSendMessage = async (text: string, orderNumber?: string) => {
    const customerId = user?.id || 'customer-001';

    // Optimistic user message append
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      if (!threadId) {
        // Start new conversation
        const result = await startChat({
          customerId,
          message: text,
          orderNumber,
        }).unwrap();

        if (result.success && result.data) {
          setThreadId(result.data.threadId);
          setStatus(result.data.status);
          setPendingAction(result.data.pendingAction || null);

          if (result.data.response) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: result.data.response!,
                timestamp: new Date().toISOString(),
              },
            ]);
          }

          if (result.data.status === 'pending_approval') {
            enqueueSnackbar('Action requires supervisor approval. Case submitted to queue.', {
              variant: 'warning',
            });
          }
        }
      } else {
        // Continue existing thread
        const result = await sendMessage({
          threadId,
          message: text,
        }).unwrap();

        if (result.success && result.data) {
          setStatus(result.data.status);
          setPendingAction(result.data.pendingAction || null);

          if (result.data.response) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: result.data.response!,
                timestamp: new Date().toISOString(),
              },
            ]);
          }

          if (result.data.status === 'pending_approval') {
            enqueueSnackbar('Action requires supervisor approval. Case submitted to queue.', {
              variant: 'warning',
            });
          }
        }
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.error?.message || err?.data?.message || 'Failed to connect to AI Agent service.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setStatus('completed');
    setPendingAction(null);
    localStorage.removeItem('activeChatThreadId');
    localStorage.removeItem('activeChatMessages');
    enqueueSnackbar('New chat session started', { variant: 'info' });
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Grid container spacing={3}>
        {/* Main Chat Area */}
        <Grid item xs={12} lg={9}>
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
            onRefreshStatus={threadId ? refetchThread : undefined}
            isLoading={isLoading}
            threadId={threadId}
            status={status}
            pendingAction={pendingAction}
            userName={user?.name || 'Customer'}
          />
        </Grid>

        {/* Right Info Sidebar */}
        <Grid item xs={12} lg={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Quick Helper Card */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SparklesIcon color="primary" fontSize="small" />
                  AI Agent Capabilities
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Powered by <strong>LangGraph</strong> & <strong>pgvector</strong> RAG.
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ReceiptIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Duplicate Charge Detection"
                      secondary="Checks transaction timestamps within 5-min intervals"
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ApprovedIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="HITL Safety Guardrails"
                      secondary="Financial actions pause automatically for human supervisor review"
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <HelpIcon fontSize="small" color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="RAG Policy Knowledge"
                      secondary="Answers return, shipping, and cancellation questions with cosine similarity search"
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Test Scenario Card */}
            <Card variant="outlined" sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#F0FDF4' : '#064E3B' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 0.5 }}>
                  🎯 Seeded Test Scenario
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                  Order <strong>ORD-1042</strong> has duplicate charges ($89.99 x 2) seeded in the database.
                </Typography>
                <Chip
                  label="Try ORD-1042 Duplicate Refund"
                  size="small"
                  color="success"
                  onClick={() =>
                    handleSendMessage(
                      'I noticed I was charged twice for order ORD-1042. Can you please check and issue a refund?',
                      'ORD-1042'
                    )
                  }
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
