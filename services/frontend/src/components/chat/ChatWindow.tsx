import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Button,
  Typography,
  Chip,
  Stack,
  InputAdornment,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  ShoppingBag as OrderIcon,
  Add as NewChatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ApprovalBanner } from './ApprovalBanner';
import { ChatMessage, PendingAction } from '../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, orderNumber?: string) => Promise<void>;
  onNewChat: () => void;
  onRefreshStatus?: () => void;
  isLoading: boolean;
  threadId?: string | null;
  status?: 'completed' | 'pending_approval' | 'processing' | 'error';
  pendingAction?: PendingAction | null;
  userName?: string;
}

const QUICK_PROMPTS = [
  { label: 'Duplicate charge on ORD-1042', text: 'I noticed I was charged twice for order ORD-1042. Can you help me get a refund?', order: 'ORD-1042' },
  { label: 'Check order status', text: 'Where is my order ORD-1042 and when will it arrive?', order: 'ORD-1042' },
  { label: 'Refund policy question', text: 'What is your refund policy for duplicate charges?' },
  { label: 'Cancel an order', text: 'I want to cancel order ORD-1042.' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onNewChat,
  onRefreshStatus,
  isLoading,
  threadId,
  status,
  pendingAction,
  userName = 'You',
}) => {
  const [inputText, setInputText] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [showOrderInput, setShowOrderInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, status]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    setInputText('');
    await onSendMessage(trimmed, orderNumber ? orderNumber.trim() : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: { text: string; order?: string }) => {
    setInputText(prompt.text);
    if (prompt.order) {
      setOrderNumber(prompt.order);
      setShowOrderInput(true);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Top Chat Bar */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) => (theme.palette.mode === 'light' ? '#FAFAFA' : '#111827'),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: status === 'pending_approval' ? 'warning.main' : 'success.main',
              boxShadow: (theme) =>
                status === 'pending_approval'
                  ? `0 0 8px ${theme.palette.warning.main}`
                  : `0 0 8px ${theme.palette.success.main}`,
            }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              AI Customer Support Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {threadId ? `Thread ID: ${threadId.slice(0, 16)}...` : 'New Conversation Session'}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1}>
          {threadId && onRefreshStatus && (
            <Tooltip title="Refresh conversation & approval status">
              <IconButton size="small" onClick={onRefreshStatus}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<NewChatIcon />}
            onClick={onNewChat}
            sx={{ borderRadius: 2 }}
          >
            New Chat
          </Button>
        </Stack>
      </Box>

      {/* Messages Scroll Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'text.secondary',
              py: 4,
            }}
          >
            <Box sx={{ fontSize: 48, mb: 1.5 }}>👋</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
              How can we help you today?
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 460, mb: 3 }}>
              Ask questions about orders, duplicate charges, returns, or support cases. Our AI agent will
              analyze your account and resolve inquiries automatically.
            </Typography>

            <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.05em', mb: 1.5 }}>
              SUGGESTED INQUIRIES
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ maxWidth: 600, justifyContent: 'center' }}>
              {QUICK_PROMPTS.map((p, i) => (
                <Chip
                  key={i}
                  label={p.label}
                  onClick={() => handleQuickPrompt(p)}
                  variant="outlined"
                  clickable
                  color="primary"
                  sx={{ borderRadius: 2, py: 2 }}
                />
              ))}
            </Stack>
          </Box>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={msg.id || index} message={msg} userName={userName} />
          ))
        )}

        {/* Human-in-the-loop approval banner */}
        {status === 'pending_approval' && (
          <ApprovalBanner
            pendingAction={pendingAction}
            onRefresh={onRefreshStatus}
            isChecking={isLoading}
          />
        )}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Form Area */}
      <Box
        sx={{
          p: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        {/* Optional Order Number expansion */}
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<OrderIcon fontSize="small" />}
            endIcon={showOrderInput ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            onClick={() => setShowOrderInput(!showOrderInput)}
            sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'none' }}
          >
            {orderNumber ? `Order: ${orderNumber}` : 'Attach Order Number (Optional)'}
          </Button>
        </Box>

        <Collapse in={showOrderInput}>
          <TextField
            size="small"
            placeholder="e.g. ORD-1042"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ORDER #:
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        </Collapse>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            placeholder="Type your message here... (Press Enter to send)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={4}
            fullWidth
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            sx={{
              borderRadius: 2.5,
              px: 3,
              minWidth: 56,
              alignSelf: 'flex-end',
              height: 54,
            }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
