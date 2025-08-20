import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionApi, analyticsApi, authApi } from '../lib/api';

// Query keys for consistency and cache invalidation
export const queryKeys = {
  sessions: {
    all: ['sessions'] as const,
    history: (token: string, params: { limit?: number; offset?: number }) =>
      [...queryKeys.sessions.all, 'history', token, params] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    characterProblems: (token: string, limit: number) =>
      [...queryKeys.analytics.all, 'character-problems', token, limit] as const,
    progress: (token: string, days: number) =>
      [...queryKeys.analytics.all, 'progress', token, days] as const,
  },
} as const;

// Auth hooks
export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: () => {
      // Could invalidate any cached data if needed
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Signup failed:', error);
    },
  });
}

// Session hooks
export function useStartSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ prompt, token }: { prompt: string; token: string }) =>
      sessionApi.start(prompt, token),
    onSuccess: () => {
      // Invalidate session history when a new session is started
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      sessionId,
      data,
      token,
    }: {
      sessionId: number;
      data: {
        keystrokes: Array<{
          key: string;
          down_ts: number;
          up_ts: number;
          target_char?: string;
          position_in_text?: number;
          is_correction?: string;
          is_error?: string;
        }>;
        user_input: string;
      };
      token: string;
    }) => sessionApi.complete(sessionId, data, token),
    onSuccess: (data, variables) => {
      // Invalidate related queries when session is completed
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
    onError: (error) => {
      console.error('Failed to complete session:', error);
    },
  });
}

export function useRestartSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, token }: { sessionId: number; token: string }) =>
      sessionApi.restart(sessionId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (error) => {
      console.error('Failed to restart session:', error);
    },
  });
}

// Session history hook
export function useSessionHistory(
  token: string,
  params: { limit?: number; offset?: number } = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.sessions.history(token, params),
    queryFn: () => sessionApi.getHistory(token, params),
    enabled: enabled && !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Analytics hooks
export function useCharacterProblems(
  token: string,
  limit: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.analytics.characterProblems(token, limit),
    queryFn: () => analyticsApi.getCharacterProblems(token, limit),
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes - this data changes slowly
  });
}

export function useProgressAnalytics(
  token: string,
  days: number = 30,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.analytics.progress(token, days),
    queryFn: () => analyticsApi.getProgressAnalytics(token, days),
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Combined hook for session management with optimistic updates
export function useSessionManager(token: string) {
  const queryClient = useQueryClient();

  const startSession = useStartSession();
  const completeSession = useCompleteSession();
  const restartSession = useRestartSession();

  // Function to prefetch session history
  const prefetchHistory = async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.sessions.history(token, { limit: 10, offset: 0 }),
      queryFn: () => sessionApi.getHistory(token, { limit: 10, offset: 0 }),
      staleTime: 2 * 60 * 1000,
    });
  };

  // Function to prefetch analytics
  const prefetchAnalytics = async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.analytics.characterProblems(token, 10),
        queryFn: () => analyticsApi.getCharacterProblems(token, 10),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.analytics.progress(token, 30),
        queryFn: () => analyticsApi.getProgressAnalytics(token, 30),
        staleTime: 5 * 60 * 1000,
      }),
    ]);
  };

  return {
    startSession,
    completeSession,
    restartSession,
    prefetchHistory,
    prefetchAnalytics,
    // Helper to check if any session operation is in progress
    isSessionOperationPending:
      startSession.isPending ||
      completeSession.isPending ||
      restartSession.isPending,
  };
}
