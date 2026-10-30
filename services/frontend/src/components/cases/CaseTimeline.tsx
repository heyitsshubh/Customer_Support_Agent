import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  AddCircleOutline as CreatedIcon,
  HourglassEmpty as SuspendedIcon,
  CheckCircle as ResolvedIcon,
  Notes as NoteIcon,
  History as EventIcon,
} from '@mui/icons-material';

export interface TimelineEvent {
  event: string;
  timestamp: string;
  details: string;
}

interface CaseTimelineProps {
  timeline: TimelineEvent[];
  isLoading?: boolean;
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ timeline, isLoading = false }) => {
  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Audit Trail & Timeline
        </Typography>
        {[...Array(3)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="40%" height={24} />
              <Skeleton width="80%" height={20} />
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'CaseCreated':
        return <CreatedIcon fontSize="small" color="primary" />;
      case 'ApprovalGateSuspended':
        return <SuspendedIcon fontSize="small" color="warning" />;
      case 'CaseResolved':
        return <ResolvedIcon fontSize="small" color="success" />;
      case 'NoteAdded':
        return <NoteIcon fontSize="small" color="info" />;
      default:
        return <EventIcon fontSize="small" color="action" />;
    }
  };

  const getEventBadgeColor = (event: string): 'primary' | 'warning' | 'success' | 'info' | 'default' => {
    switch (event) {
      case 'CaseCreated':
        return 'primary';
      case 'ApprovalGateSuspended':
        return 'warning';
      case 'CaseResolved':
        return 'success';
      case 'NoteAdded':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventIcon color="primary" fontSize="small" />
        Audit Trail & Event Timeline
      </Typography>

      {timeline.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No recorded events yet for this case.
        </Typography>
      ) : (
        <Box sx={{ position: 'relative', pl: 1 }}>
          {/* Vertical connecting line */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              bottom: 16,
              left: 21,
              width: 2,
              bgcolor: 'divider',
              zIndex: 0,
            }}
          />

          {timeline.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                mb: index === timeline.length - 1 ? 0 : 3,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Dot Icon Box */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  border: (theme) => `2px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                {getEventIcon(item.event)}
              </Box>

              {/* Event Content */}
              <Box sx={{ flex: 1, pt: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={item.event}
                    color={getEventBadgeColor(item.event)}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
                  {item.details}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};
