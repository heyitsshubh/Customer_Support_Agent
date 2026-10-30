import { baseApi } from './baseApi';
import { PendingAction } from '../types';
export type { PendingAction };

export interface StartChatRequest {
  customerId: string;
  message: string;
  orderNumber?: string;
}

export interface SendMessageRequest {
  threadId: string;
  message: string;
}

export interface ChatOutput {
  caseId: string;
  threadId: string;
  status: 'completed' | 'pending_approval' | 'error';
  response?: string;
  pendingAction?: PendingAction | null;
}

export interface ChatThreadResponse {
  case: {
    id: string;
    threadId: string;
    customerId: string;
    status: string;
    priority: string;
    intent?: string;
    summary?: string;
    resolutionNotes?: string;
    createdAt: string;
    resolvedAt?: string;
  };
  agentState?: any;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    startChat: builder.mutation<{ success: boolean; data: ChatOutput }, StartChatRequest>({
      query: (body) => ({
        url: '/chat',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chat', 'Case'],
    }),

    sendMessage: builder.mutation<{ success: boolean; data: ChatOutput }, SendMessageRequest>({
      query: ({ threadId, message }) => ({
        url: `/chat/${threadId}/message`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['Chat', 'Case'],
    }),

    getChatThread: builder.query<{ success: boolean; data: ChatThreadResponse }, string>({
      query: (threadId) => `/chat/${threadId}`,
      providesTags: (_result, _error, threadId) => [{ type: 'Chat', id: threadId }],
    }),

    approveCase: builder.mutation<
      { success: boolean; data: any },
      { threadId: string; approved: boolean; notes?: string }
    >({
      query: ({ threadId, approved, notes }) => ({
        url: `/chat/${threadId}/approve`,
        method: 'POST',
        body: { approved, notes },
      }),
      invalidatesTags: ['Chat', 'Case'],
    }),
  }),
});

export const {
  useStartChatMutation,
  useSendMessageMutation,
  useGetChatThreadQuery,
  useApproveCaseMutation,
} = chatApi;
