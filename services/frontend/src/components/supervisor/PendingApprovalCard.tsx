import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Shield as ShieldIcon,
  Receipt as ReceiptIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from '../cases/PriorityBadge';
import { SupportCase } from '../../types';

export interface PendingCaseItem extends SupportCase {
  refundRequest?: {
    id: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
  } | null;
}

interface PendingApprovalCardProps {
  item: PendingCaseItem;
  onOpenApprovalDialog: (item: PendingCaseItem, approved: boolean) => void;
}

export const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({
  item,
  onOpenApprovalDialog,
}) => {
  const navigate = useNavigate();

  const refund = item.refundRequest;
  const refundAmount = refund?.amount ?? 89.99; // Fallback to seed scenario default

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: (theme) => `1px solid ${theme.palette.warning.main}`,
        borderRadius: 2.5,
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner Accent */}
      <Box
        sx={{
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          px: 2,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShieldIcon sx={{ fontSize: 14 }} /> HITL SAFETY GATE SUSPENDED
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>

      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Title & Badges */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {item.subject || (item as any).intent || 'Duplicate Charge / Refund Request'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Case #{item.id.slice(0, 8)} • Cust: {item.customerId.slice(0, 10)}...
            </Typography>
          </Box>
          <PriorityBadge priority={item.priority} />
        </Box>

        {/* Intent Chip */}
        <Box sx={{ mb: 2 }}>
          <Chip
            size="small"
            label={`INTENT: ${(item as any).intent?.toUpperCase() || 'BILLING_DISPUTE'}`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.675rem' }}
          />
        </Box>

        {/* Refund Details Box */}
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'light' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.15)',
            border: '1px dashed rgba(245, 158, 11, 0.5)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
              <ReceiptIcon sx={{ fontSize: 14 }} /> PROPOSED REFUND AMOUNT
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.dark' }}>
              ${refundAmount.toFixed(2)} USD
            </Typography>
          </Box>

          <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            {refund?.reason || (item as any).summary || 'Customer was charged twice for order ORD-1042.'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Divider sx={{ my: 1.5 }} />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="small"
            startIcon={<ApproveIcon />}
            onClick={() => onOpenApprovalDialog(item, true)}
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          >
            Approve
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="error"
            size="small"
            startIcon={<RejectIcon />}
            onClick={() => onOpenApprovalDialog(item, false)}
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          >
            Reject
          </Button>

          <Button
            variant="text"
            size="small"
            color="inherit"
            onClick={() => navigate(`/agent/cases/${item.id}`)}
            sx={{ minWidth: 40, px: 1 }}
          >
            <OpenIcon fontSize="small" />
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
