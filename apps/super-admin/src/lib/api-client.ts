export interface ApiErrorDetails {
  code: string;
  message: string;
  requestId?: string;
  status: number;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiClientError';
    this.code = details.code;
    this.status = details.status;
    this.requestId = details.requestId;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

class SuperAdminApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hms_super_admin_token');
    }
    return null;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token = this.getToken(), body, headers = {}, ...customConfig } = options;

    const reqHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    if (token) {
      (reqHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...customConfig,
      headers: reqHeaders,
      credentials: 'include',
    };

    if (body !== undefined) {
      config.body = JSON.stringify(body);
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkErr: unknown) {
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to backend server. Please check your network or API status.',
        status: 0,
      });
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Fallback for non-JSON errors
      }

      const status = response.status;
      const message =
        errorData?.message ||
        errorData?.error?.message ||
        (typeof errorData?.error === 'string' ? errorData.error : null) ||
        `Request failed with status ${status}`;

      const code =
        errorData?.error ||
        errorData?.error?.code ||
        errorData?.code ||
        (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'API_ERROR');

      throw new ApiClientError({
        code,
        message: Array.isArray(message) ? message.join(', ') : message,
        status,
        requestId: errorData?.correlationId || errorData?.requestId,
      });
    }

    // Return JSON or empty object for 204
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new SuperAdminApiClient(API_BASE_URL);
