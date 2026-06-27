const BASE_URL = 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('lecrank_token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let url = `${BASE_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    ...options,
    headers
  };

  const response = await fetch(url, config);

  // If unauthorized (expired token), clear local storage and redirect to login
  if (response.status === 401) {
    localStorage.removeItem('lecrank_token');
    localStorage.removeItem('lecrank_user');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || `Terjadi kesalahan pada server (Status ${response.status})`);
  }

  return data;
}

export const api = {
  get<T = any>(endpoint: string, params?: Record<string, string>) {
    return request<T>(endpoint, { method: 'GET', params });
  },
  post<T = any>(endpoint: string, body: any) {
    return request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T = any>(endpoint: string, body: any) {
    return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete<T = any>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  }
};
