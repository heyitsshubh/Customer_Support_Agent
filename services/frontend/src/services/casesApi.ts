import { baseApi } from './baseApi';
import { SupportCase, CaseStatus, CasePriority } from '../types';

export interface GetCasesParams {
  status?: CaseStatus;
  priority?: CasePriority;
  customerId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface CasesResponse {
  cases: SupportCase[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PendingApprovalsResponse {
  total: number;
  cases: Array<
    SupportCase & {
      refundRequest?: {
        id: string;
        amount: number;
        reason: string;
        status: string;
        createdAt: string;
      } | null;
    }
  >;
}

export interface CaseDetailResponse {
  case: SupportCase;
  customer?: {
    id: string;
    email: string;
    name: string;
    tier: string;
    lifetimeValue?: number;
  } | null;
}

export interface CaseTimelineResponse {
  caseId: string;
  timeline: Array<{
    event: string;
    timestamp: string;
    details: string;
  }>;
}

export const casesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCases: builder.query<{ success: boolean; data: CasesResponse }, GetCasesParams | void>({
      query: (params) => ({
        url: '/cases',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data?.cases
          ? [
              ...result.data.cases.map(({ id }) => ({ type: 'Case' as const, id })),
              { type: 'Case', id: 'LIST' },
            ]
          : [{ type: 'Case', id: 'LIST' }],
    }),

    getPendingApprovals: builder.query<{ success: boolean; data: PendingApprovalsResponse }, void>({
      query: () => '/cases/pending-approval',
      providesTags: [{ type: 'Case', id: 'PENDING' }],
    }),

    getCaseById: builder.query<{ success: boolean; data: CaseDetailResponse }, string>({
      query: (id) => `/cases/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Case', id }],
    }),

    getCaseTimeline: builder.query<{ success: boolean; data: CaseTimelineResponse }, string>({
      query: (id) => `/cases/${id}/timeline`,
      providesTags: (_result, _error, id) => [{ type: 'Case', id: `${id}-timeline` }],
    }),

    assignCase: builder.mutation<
      { success: boolean; message: string },
      { id: string; agentId: string }
    >({
      query: ({ id, agentId }) => ({
        url: `/cases/${id}/assign`,
        method: 'POST',
        body: { agentId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Case', id },
        { type: 'Case', id: 'LIST' },
      ],
    }),

    updatePriority: builder.mutation<
      { success: boolean; message: string },
      { id: string; priority: CasePriority }
    >({
      query: ({ id, priority }) => ({
        url: `/cases/${id}/priority`,
        method: 'PATCH',
        body: { priority },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Case', id },
        { type: 'Case', id: 'LIST' },
      ],
    }),

    closeCase: builder.mutation<
      { success: boolean; message: string },
      { id: string; resolutionNotes?: string }
    >({
      query: ({ id, resolutionNotes }) => ({
        url: `/cases/${id}/close`,
        method: 'PATCH',
        body: { resolutionNotes },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Case', id },
        { type: 'Case', id: 'LIST' },
        { type: 'Case', id: 'PENDING' },
      ],
    }),

    addNote: builder.mutation<
      { success: boolean; message: string },
      { id: string; note: string }
    >({
      query: ({ id, note }) => ({
        url: `/cases/${id}/notes`,
        method: 'POST',
        body: { note },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Case', id }],
    }),
  }),
});

export const {
  useGetCasesQuery,
  useGetPendingApprovalsQuery,
  useGetCaseByIdQuery,
  useGetCaseTimelineQuery,
  useAssignCaseMutation,
  useUpdatePriorityMutation,
  useCloseCaseMutation,
  useAddNoteMutation,
} = casesApi;
