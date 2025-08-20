// API configuration and base functions
const API_BASE_URL = '';

export class ApiError extends Error {
  constructor(public status: number, public statusText: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = response.statusText;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  return response.json();
}

// Auth API functions
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    return apiRequest<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  },

  signup: async (userData: { email: string; password: string }) => {
    return apiRequest<{ id: number; email: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// Session API functions
export const sessionApi = {
  start: async (prompt: string, token: string) => {
    return apiRequest<{
      session_id: number;
      started_at: string;
      prompt: string;
    }>('/typing/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });
  },

  complete: async (
    sessionId: number,
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
    },
    token: string
  ) => {
    return apiRequest<any>(`/typing/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  getHistory: async (
    token: string,
    params: { limit?: number; offset?: number } = {}
  ) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const url = `/typing/sessions/history${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      sessions: Array<{
        id: number;
        started_at: string;
        ended_at: string;
        target_text: string;
        words_per_minute: number;
        accuracy_percentage: number;
        error_count: number;
        correction_count: number;
      }>;
      total_count: number;
      offset: number;
      limit: number;
    }>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  restart: async (sessionId: number, token: string) => {
    return apiRequest<{
      session_id: number;
      started_at: string;
      prompt: string;
    }>(`/typing/sessions/${sessionId}/restart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// Analytics API functions
export const analyticsApi = {
  getCharacterProblems: async (token: string, limit: number = 10) => {
    return apiRequest<{
      problematic_characters: Array<{
        character: string;
        error_count: number;
        total_typed: number;
        error_rate: number;
      }>;
      total_sessions_analyzed: number;
    }>(`/typing/analytics/character-problems?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getProgressAnalytics: async (token: string, days: number = 30) => {
    return apiRequest<{
      sessions_analyzed: number;
      avg_wpm: number;
      avg_accuracy: number;
      total_practice_time: number;
      improvement_trend: string;
      recent_sessions: Array<any>;
    }>(`/typing/analytics/progress?days=${days}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
