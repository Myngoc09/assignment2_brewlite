export const API = '/api';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API}${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Không thể kết nối máy chủ' }));
    const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new ApiError(response.status, message || 'Có lỗi xảy ra');
  }
  return response.json();
}
