import axios from 'axios';

const TOKEN_KEY = 'comfyskill_access_token';

export type QualityTier = 'premium' | 'standard' | 'budget';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tester' | 'user';
  balance_credits: number;
  preferences?: UserPreferences;
  mfa_enabled?: boolean;
  email_verified?: boolean;
  created_at: string;
};

export type UserPreferences = {
  default_quality: QualityTier;
  default_language: string;
  marketing_emails: boolean;
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
  user_id?: string;
  project_id?: string | null;
  block_id?: string | null;
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

export type APIKey = {
  id: string;
  name: string;
  key_preview: string;
  authority: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
};

export type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret_preview: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string;
  actor_id: string;
  action: string;
  resource: string;
  metadata?: Record<string, string>;
  created_at: string;
};

export type SubscriptionStatus = {
  user_id: string;
  plan_id: string;
  status: string;
  stripe_customer_id?: string;
  credits_included: number;
  current_period_end?: string;
  updated_at: string;
};

export type IntegrationCheck = {
  name: string;
  status: 'healthy' | 'unhealthy' | 'not_configured';
  message: string;
  last_check: string;
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

export const settingsApi = {
  profile: (payload: { name: string }) => api.patch<{ user: User }>('/settings/profile', payload).then((r) => r.data),
  preferences: (payload: UserPreferences) =>
    api.patch<{ user: User }>('/settings/preferences', payload).then((r) => r.data),
  security: () =>
    api
      .get<{
        email_verified: boolean;
        mfa_enabled: boolean;
        active_api_keys: number;
        auth_methods: string[];
        reserved: string[];
      }>('/security/summary')
      .then((r) => r.data),
  activity: () => api.get<{ events: AuditLog[]; total: number }>('/activity').then((r) => r.data),
};

export const billingApi = {
  plans: () => api.get<{ plans: Plan[] }>('/billing/plans').then((r) => r.data),
  balance: () => api.get<{ balance_credits: number }>('/billing/balance').then((r) => r.data),
  transactions: () => api.get<{ transactions: Transaction[] }>('/billing/transactions').then((r) => r.data),
  subscription: () => api.get<SubscriptionStatus>('/billing/subscription').then((r) => r.data),
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

export const developerApi = {
  apiKeys: () => api.get<{ api_keys: APIKey[]; total: number }>('/api-keys').then((r) => r.data),
  createApiKey: (payload: { name: string; authority?: 'admin' | 'user' }) =>
    api.post<{ api_key: APIKey; secret: string }>('/api-keys', payload).then((r) => r.data),
  revokeApiKey: (id: string) => api.post<{ revoked: boolean }>(`/api-keys/${id}/revoke`).then((r) => r.data),
  webhooks: () =>
    api
      .get<{ webhooks: WebhookEndpoint[]; total: number; available_events: string[] }>('/webhooks')
      .then((r) => r.data),
  createWebhook: (payload: { name: string; url: string; events: string[] }) =>
    api.post<{ webhook: WebhookEndpoint; secret: string }>('/webhooks', payload).then((r) => r.data),
  disableWebhook: (id: string) => api.post<{ disabled: boolean }>(`/webhooks/${id}/disable`).then((r) => r.data),
};

export const platformApi = {
  health: () =>
    api
      .get<{
        status: string;
        app: string;
        environment: string;
        database: string;
        comfyMock: boolean;
        integrations: IntegrationCheck[];
      }>('/health')
      .then((r) => r.data),
};

export const jobsApi = {
  create: (payload: {
    prompt: string;
    quality_tier: QualityTier;
    project_id?: string;
    block_id?: string;
  }) => api.post<{ job: Job; credits_estimate: number }>('/jobs', payload).then((r) => r.data),
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
  health: () =>
    api
      .get<{
        status: string;
        runtime: string;
        goroutines: number;
        heap_alloc: number;
        heap_sys: number;
        integrations: IntegrationCheck[];
        checked_at: string;
      }>('/admin/health')
      .then((r) => r.data),
  auditLogs: () => api.get<{ logs: AuditLog[]; total: number }>('/admin/audit-logs').then((r) => r.data),
};
