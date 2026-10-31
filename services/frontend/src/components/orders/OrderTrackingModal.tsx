import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { OrderTrackingInfo } from '../../services/customerPortalApi';

interface OrderTrackingModalProps {
  open: boolean;
  onClose: () => void;
  tracking: OrderTrackingInfo | null;
  isLoading?: boolean;
}

const STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  open,
  onClose,
  tracking,
  isLoading = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const getActiveStep = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 0;
      case 'processing':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      case 'cancelled':
        return -1;
      default:
        return 1;
    }
  };

  const activeStep = getActiveStep(tracking?.status);

  const handleCopy = () => {
    if (tracking?.trackingNumber) {
      navigator.clipboard.writeText(tracking.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShippingIcon color="primary" /> Shipment Tracking • {tracking?.orderNumber}
      </DialogTitle>
      <DialogContent>
        {tracking ? (
          <Box sx={{ py: 1 }}>
            {/* Progress Stepper */}
            {activeStep >= 0 ? (
              <Box sx={{ my: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
                <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>
                  This order was CANCELLED
                </Typography>
              </Paper>
            )}

            {/* Carrier & Tracking details */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                bgcolor: (theme) => (theme.palette.mode === 'light' ? '#F8FAFC' : '#111827'),
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CARRIER / LOGISTICS
                </Typography>
                <Chip size="small" label={tracking.carrier} color="primary" sx={{ fontWeight: 700 }} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TRACKING NUMBER
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {tracking.trackingNumber}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy tracking number'}>
                    <IconButton size="small" onClick={handleCopy}>
                      {copied ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {tracking.lastUpdated && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    LAST CARRIER SCAN
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(tracking.lastUpdated).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Tracking information is unavailable.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
