import { baseApi } from './baseApi';

export interface OverviewMetrics {
  totalCases: number;
  openCases: number;
  pendingApprovals: number;
  resolvedCases: number;
  resolutionRatePercent: number;
  totalRefundsDisbursed: number;
  averageCsat: number;
}

export interface TopicItem {
  intent: string;
  count: number;
}

export interface RefundsMetrics {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRatePercent: number;
  approvedAmountTotal: number;
  averageRequestAmount: number;
}

export interface AgentMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedCases: number;
  resolvedCases: number;
  completionRate: number;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOverviewMetrics: builder.query<{ success: boolean; data: OverviewMetrics }, void>({
      query: () => '/analytics/overview',
      providesTags: ['Analytics'],
    }),

    getTopics: builder.query<{ success: boolean; data: { topics: TopicItem[] } }, void>({
      query: () => '/analytics/topics',
      providesTags: ['Analytics'],
    }),

    getRefundMetrics: builder.query<{ success: boolean; data: RefundsMetrics }, void>({
      query: () => '/analytics/refunds',
      providesTags: ['Analytics', 'Refund'],
    }),

    getAgentPerformance: builder.query<{ success: boolean; data: { agents: AgentMetric[] } }, void>({
      query: () => '/analytics/agent-performance',
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetOverviewMetricsQuery,
  useGetTopicsQuery,
  useGetRefundMetricsQuery,
  useGetAgentPerformanceQuery,
} = analyticsApi;
