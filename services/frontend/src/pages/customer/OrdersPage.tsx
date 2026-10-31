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
  Button,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Chat as ChatIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ShoppingBag as OrderIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  useGetCustomerOrdersQuery,
  useGetOrderTrackingQuery,
  useCancelOrderMutation,
  CustomerOrder,
  OrderTrackingInfo,
} from '../../services/customerPortalApi';
import { OrderStatusChip } from '../../components/orders/OrderStatusChip';
import { OrderTrackingModal } from '../../components/orders/OrderTrackingModal';
import { useAppSelector } from '../../store';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { enqueueSnackbar } = useSnackbar();

  // If customer is logged in use their ID, otherwise default to seeded customer-001
  const customerId = user?.id || 'customer-001';

  const { data, isLoading, refetch } = useGetCustomerOrdersQuery({ customerId });
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);
  const [orderToCancel, setOrderToCancel] = useState<CustomerOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const { data: trackingData, isLoading: isLoadingTracking } = useGetOrderTrackingQuery(
    selectedOrderForTracking || '',
    { skip: !selectedOrderForTracking }
  );

  const orders = data?.data?.orders || [];
  const totalCount = data?.data?.total || orders.length;

  const handleOpenCancelDialog = (order: CustomerOrder) => {
    setOrderToCancel(order);
    setCancelReason('Placed order by mistake');
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      await cancelOrder({ id: orderToCancel.id, reason: cancelReason }).unwrap();
      enqueueSnackbar(`Order ${orderToCancel.orderNumber} successfully cancelled`, { variant: 'success' });
      setCancelDialogOpen(false);
      refetch();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to cancel order', { variant: 'error' });
    }
  };

  const handleAskAIAboutOrder = (orderNumber: string) => {
    // Navigate to chat with inquiry about this order
    navigate('/customer/chat');
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
              My Orders & Purchases
            </Typography>
            <Chip
              icon={<OrderIcon sx={{ fontSize: 16 }} />}
              label={`${totalCount} ORDERS`}
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            View order status, real-time carrier tracking, or connect directly with our AI agent to dispute charges.
          </Typography>
        </Box>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="small">
          Refresh
        </Button>
      </Box>

      {/* Special Seed Scenario Alert for ORD-1042 */}
      <Alert
        severity="info"
        sx={{ mb: 3, borderRadius: 2 }}
        action={
          <Button
            color="primary"
            variant="contained"
            size="small"
            startIcon={<ChatIcon />}
            onClick={() => handleAskAIAboutOrder('ORD-1042')}
          >
            Dispute ORD-1042
          </Button>
        }
      >
        <AlertTitle sx={{ fontWeight: 700 }}>Seeded Duplicate Charge Available on ORD-1042</AlertTitle>
        Order <strong>ORD-1042</strong> was charged twice ($89.99 x 2). Click "Dispute ORD-1042" to test the
        LangGraph RAG duplicate charge resolution and human-in-the-loop supervisor approval gate.
      </Alert>

      {/* Orders Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Order Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date Placed</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No orders found for this customer account.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {o.orderNumber}
                    </Typography>
                    {o.carrier && (
                      <Typography variant="caption" color="text.secondary">
                        Carrier: {o.carrier}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {new Date(o.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <OrderStatusChip status={o.status} />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {Array.isArray(o.items) && o.items.length > 0
                        ? `${o.items.length} items (${o.items[0]?.productName || 'Product'}...)`
                        : '1 item'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      ${(o.totalAmount || 89.99).toFixed(2)} USD
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ShippingIcon fontSize="small" />}
                        onClick={() => setSelectedOrderForTracking(o.id || o.orderNumber)}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Track
                      </Button>

                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<ChatIcon fontSize="small" />}
                        onClick={() => handleAskAIAboutOrder(o.orderNumber)}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Get Help
                      </Button>

                      {o.status === 'pending' && (
                        <Tooltip title="Cancel Order">
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            onClick={() => handleOpenCancelDialog(o)}
                            sx={{ minWidth: 32, px: 0.5 }}
                          >
                            <CancelIcon fontSize="small" />
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Shipment Tracking Modal */}
      <OrderTrackingModal
        open={Boolean(selectedOrderForTracking)}
        onClose={() => setSelectedOrderForTracking(null)}
        tracking={trackingData?.data || null}
        isLoading={isLoadingTracking}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Order {orderToCancel?.orderNumber}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Orders can only be cancelled prior to warehouse dispatch. Once shipped, a return must be initiated.
          </Typography>
          <TextField
            autoFocus
            label="Reason for cancellation"
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Order</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={isCancelling || !cancelReason.trim()}
          >
            {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
