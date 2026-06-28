import axios from 'axios';

const TOKEN_KEY = 'comfyskill_access_token';

export type QualityTier = 'premium' | 'standard' | 'budget';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tester' | 'user';
  balance_credits: number;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  monthlyUsd: number;
  credits: number;
  stripePrice: string;
};

export type Job = {
  id: string;
  capability: string;
  prompt_text: string;
  quality_tier: QualityTier;
  model_preset: string | null;
  credits_estimated: number;
  credits_charged: number | null;
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  job_id: string | null;
  created_at: string;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

setToken(getToken());

export const authApi = {
  register: (payload: { email: string; password: string; name: string }) =>
    api.post<{ access_token: string; user: User }>('/auth/register', payload).then((r) => r.data),
  login: (payload: { email: string; password: string }) =>
    api.post<{ access_token: string; user: User }>('/auth/login', payload).then((r) => r.data),
  me: () => api.get<User>('/me').then((r) => r.data),
};

export const billingApi = {
  plans: () => api.get<{ plans: Plan[] }>('/billing/plans').then((r) => r.data),
  balance: () => api.get<{ balance_credits: number }>('/billing/balance').then((r) => r.data),
  transactions: () => api.get<{ transactions: Transaction[] }>('/billing/transactions').then((r) => r.data),
  stripeStatus: () =>
    api
      .get<{ configured: boolean; price_configured: boolean; mode: string }>('/billing/stripe/status')
      .then((r) => r.data),
  checkout: (planId = 'standard') =>
    api.post<{ checkout_url: string; url: string }>('/billing/checkout', { planId }).then((r) => r.data),
  embeddedCheckout: () =>
    api.post<{ client_secret: string }>('/billing/checkout/embedded').then((r) => r.data),
  portal: () => api.post<{ portal_url: string; url: string }>('/billing/portal').then((r) => r.data),
};

export const jobsApi = {
  create: (payload: { prompt: string; quality_tier: QualityTier }) =>
    api.post<{ job: Job; credits_estimate: number }>('/jobs', payload).then((r) => r.data),
  get: (id: string) => api.get<Job>(`/jobs/${id}`).then((r) => r.data),
  list: () => api.get<{ jobs: Job[]; total: number }>('/jobs').then((r) => r.data),
};

export const adminApi = {
  users: () => api.get<{ users: User[] }>('/admin/users').then((r) => r.data),
  jobs: () => api.get<{ jobs: Job[]; total: number }>('/admin/jobs').then((r) => r.data),
  metrics: () =>
    api
      .get<{
        total_jobs: number;
        completed_jobs: number;
        failed_jobs: number;
        credits_consumed_today: number;
        active_users: number;
      }>('/admin/metrics')
      .then((r) => r.data),
};
