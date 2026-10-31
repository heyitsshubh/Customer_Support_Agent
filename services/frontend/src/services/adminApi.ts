import { baseApi } from './baseApi';
import { UserRole } from '../types';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  users: AdminUser[];
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content?: string;
  category: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VectorSearchResult {
  id: string;
  title: string;
  category: string;
  content: string;
  source?: string;
  similarityScore: number;
}

export interface ExperimentRun {
  id: string;
  model: string;
  dataset: string;
  totalScenarios: number;
  passedScenarios: number;
  accuracyPercent: number;
  status: 'completed' | 'running' | 'failed';
  executedBy: string;
  createdAt: string;
}

export interface ExperimentRunResult {
  experiment: ExperimentRun;
  metrics: {
    intentAccuracy: string;
    safetyHaltAccuracy: string;
    ragGroundingRelevance: string;
    duplicateChargeVerification: string;
  };
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<
      { success: boolean; data: AdminUsersResponse },
      { role?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/admin/users',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data?.users
          ? [
              ...result.data.users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    updateUserRole: builder.mutation<
      { success: boolean; message: string; data: { user: AdminUser } },
      { id: string; role: UserRole }
    >({
      query: ({ id, role }) => ({
        url: `/admin/users/${id}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    deactivateUser: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    getDocs: builder.query<
      { success: boolean; data: { total: number; documents: KnowledgeDoc[] } },
      { category?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: '/docs',
        params: params || {},
      }),
      providesTags: [{ type: 'Doc', id: 'LIST' }],
    }),

    getDocById: builder.query<{ success: boolean; data: { document: KnowledgeDoc } }, string>({
      query: (id) => `/docs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Doc', id }],
    }),

    createDoc: builder.mutation<
      { success: boolean; message: string; data: Partial<KnowledgeDoc> },
      { title: string; content: string; category?: string; source?: string }
    >({
      query: (body) => ({
        url: '/docs',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Doc', id: 'LIST' }],
    }),

    deleteDoc: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/docs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Doc', id: 'LIST' }],
    }),

    searchDocs: builder.mutation<
      {
        success: boolean;
        data: {
          query: string;
          topK: number;
          resultsCount: number;
          results: VectorSearchResult[];
        };
      },
      { query: string; topK?: number; category?: string }
    >({
      query: (body) => ({
        url: '/docs/search',
        method: 'POST',
        body,
      }),
    }),

    getExperiments: builder.query<
      { success: boolean; data: { totalRuns: number; experiments: ExperimentRun[] } },
      void
    >({
      query: () => '/experiments',
      providesTags: ['Analytics'],
    }),

    runExperiment: builder.mutation<
      { success: boolean; message: string; data: ExperimentRunResult },
      { model?: string; datasetVersion?: string }
    >({
      query: (body) => ({
        url: '/experiments/run',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeactivateUserMutation,
  useGetDocsQuery,
  useGetDocByIdQuery,
  useCreateDocMutation,
  useDeleteDocMutation,
  useSearchDocsMutation,
  useGetExperimentsQuery,
  useRunExperimentMutation,
} = adminApi;
