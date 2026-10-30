import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { logout, setCredentials } from '../store/slices/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      // Try refresh
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const payload = refreshResult.data as any;
        const accessToken = payload.data?.tokens?.accessToken || payload.accessToken;
        const newRefreshToken = payload.data?.tokens?.refreshToken || payload.refreshToken || refreshToken;
        const user = payload.data?.user || payload.user || state.auth.user;

        if (accessToken && user) {
          api.dispatch(
            setCredentials({
              accessToken,
              refreshToken: newRefreshToken,
              user,
            })
          );
          // Retry original query
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logout());
        }
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'Case',
    'Customer',
    'Order',
    'Refund',
    'Chat',
    'Analytics',
    'User',
    'Doc',
  ],
  endpoints: () => ({}),
});
