import { baseApi } from './baseApi';
import { OrderStatus } from '../types';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  items?: Array<{
    id?: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
}

export interface OrderTrackingInfo {
  orderNumber: string;
  status: OrderStatus;
  carrier: string;
  trackingNumber: string;
  isDelivered: boolean;
  isShipped: boolean;
  lastUpdated?: string;
}

export interface RefundRecord {
  id: string;
  caseId: string;
  threadId?: string;
  transactionId?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export const customerPortalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerOrders: builder.query<
      { success: boolean; data: { customerId: string; total: number; orders: CustomerOrder[] } },
      { customerId: string; limit?: number }
    >({
      query: ({ customerId, limit = 20 }) => ({
        url: `/customers/${customerId}/orders`,
        params: { limit },
      }),
      providesTags: ['Order'],
    }),

    getOrderById: builder.query<
      { success: boolean; data: { order: CustomerOrder; transactions: any[] } },
      string
    >({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    getOrderTracking: builder.query<{ success: boolean; data: OrderTrackingInfo }, string>({
      query: (id) => `/orders/${id}/tracking`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id: `${id}-tracking` }],
    }),

    cancelOrder: builder.mutation<
      { success: boolean; message: string; data: { orderNumber: string; status: string } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order'],
    }),

    getRefundsList: builder.query<
      { success: boolean; data: { total: number; refunds: RefundRecord[] } },
      { status?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: '/refunds',
        params: params || {},
      }),
      providesTags: ['Refund'],
    }),
  }),
});

export const {
  useGetCustomerOrdersQuery,
  useGetOrderByIdQuery,
  useGetOrderTrackingQuery,
  useCancelOrderMutation,
  useGetRefundsListQuery,
} = customerPortalApi;
