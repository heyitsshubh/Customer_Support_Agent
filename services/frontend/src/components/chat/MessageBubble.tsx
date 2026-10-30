import React from 'react';
import { Box, Typography, Avatar, Paper, IconButton, Tooltip } from '@mui/material';
import {
  SmartToy as RobotIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userName = 'You' }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <Typography
          variant="caption"
          sx={{
            py: 0.5,
            px: 2,
            borderRadius: 4,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            fontWeight: 500,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          ⚙️ {message.content}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1.5,
        my: 2,
        maxWidth: '100%',
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          bgcolor: isUser ? 'secondary.main' : 'primary.main',
          width: 36,
          height: 36,
          boxShadow: isUser
            ? '0 2px 8px rgba(6, 182, 212, 0.3)'
            : '0 2px 8px rgba(79, 70, 229, 0.3)',
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 20 }} /> : <RobotIcon sx={{ fontSize: 20 }} />}
      </Avatar>

      {/* Bubble Container */}
      <Box sx={{ maxWidth: { xs: '85%', sm: '75%', md: '70%' }, position: 'relative' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            gap: 1,
            mb: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {isUser ? userName : 'AI Support Agent'}
          </Typography>
          {message.timestamp && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            borderTopRightRadius: isUser ? 0 : 12,
            borderTopLeftRadius: isUser ? 12 : 0,
            bgcolor: (theme) =>
              isUser
                ? theme.palette.primary.main
                : theme.palette.mode === 'light'
                ? '#FFFFFF'
                : '#1E293B',
            color: (theme) =>
              isUser ? '#FFFFFF' : theme.palette.text.primary,
            border: (theme) =>
              isUser
                ? 'none'
                : `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) =>
              isUser
                ? '0 4px 14px rgba(79, 70, 229, 0.25)'
                : theme.palette.mode === 'light'
                ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: '0.925rem',
          }}
        >
          {message.content}

          {/* Copy button for assistant responses */}
          {!isUser && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Tooltip title={copied ? 'Copied!' : 'Copy response'}>
                <IconButton size="small" onClick={handleCopy} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                  {copied ? <CheckIcon sx={{ fontSize: 14 }} color="success" /> : <CopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
