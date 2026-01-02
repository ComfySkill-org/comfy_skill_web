import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  adminApi,
  authApi,
  billingApi,
  developerApi,
  getToken,
  jobsApi,
  platformApi,
  settingsApi,
  setToken,
  type APIKey,
  type AuditLog,
  type IntegrationCheck,
  type Job,
  type QualityTier,
  type Transaction,
  type User,
  type WebhookEndpoint,
} from './api/client';

type View =
  | 'home'
  | 'features'
  | 'pricing'
  | 'login'
  | 'app'
  | 'billing'
  | 'settings'
  | 'developer'
  | 'health'
  | 'admin'
  | 'adminJobs'
  | 'adminUsers'
  | 'adminAudit';

const QUALITY_OPTIONS: { tier: QualityTier; label: string; hint: string }[] = [
  { tier: 'premium', label: 'Good', hint: 'Best quality · higher cost' },
  { tier: 'standard', label: 'Medium', hint: 'Balanced' },
  { tier: 'budget', label: 'Budget', hint: 'Fast · lower cost' },
];

const STRIPE_TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12/34',
  cvc: '123',
  name: 'Test User',
  country: 'United States',
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (getToken()) authApi.me().then(setUser).catch(() => setToken(null));
  }, []);

  async function refreshUser() {
    if (!getToken()) return;
    setUser(await authApi.me());
  }

  async function handleLogin(email: string, password: string) {
    const response = await authApi.login({ email, password });
    setToken(response.access_token);
    setUser(await authApi.me());
    setView('app');
  }

  async function handleRegister(email: string, password: string, name: string) {
    const response = await authApi.register({ email, password, name });
    setToken(response.access_token);
    setUser(await authApi.me());
    setView('app');
  }

  function logout() {
    setToken(null);
    setUser(null);
    setView('home');
  }

  return (
    <>
      <SiteHeader user={user} view={view} onNavigate={setView} onLogout={logout} />
      <main>
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'features' && <FeaturesPage />}
        {view === 'pricing' && <PricingPage onNavigate={setView} />}
        {view === 'login' && <LoginPage onLogin={handleLogin} onRegister={handleRegister} />}
        {view === 'app' && <AppPage user={user} onNavigate={setView} onUserRefresh={refreshUser} />}
        {view === 'billing' && <BillingPage user={user} onNavigate={setView} />}
        {view === 'settings' && <SettingsPage user={user} onNavigate={setView} onUserRefresh={refreshUser} />}
        {view === 'developer' && <DeveloperPage user={user} onNavigate={setView} />}
        {view === 'health' && <HealthPage user={user} onNavigate={setView} />}
        {view === 'admin' && <AdminPage user={user} onNavigate={setView} />}
        {view === 'adminJobs' && <AdminJobsPage user={user} />}
        {view === 'adminUsers' && <AdminUsersPage user={user} />}
        {view === 'adminAudit' && <AdminAuditPage user={user} />}
      </main>
    </>
  );
}

function SiteHeader({
  user,
  view,
  onNavigate,
  onLogout,
}: {
  user: User | null;
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [view]);
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const avatar = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand-link" onClick={() => onNavigate('home')}>
          Comfy<span>Skill</span>
        </button>
        <nav className="nav-links">
          <button onClick={() => onNavigate('features')}>Features</button>
          <button onClick={() => onNavigate('pricing')}>Pricing</button>
          {user ? (
            <>
              <button onClick={() => onNavigate('app')}>Create</button>
              <button onClick={() => onNavigate('health')}>Health</button>
              {user.role === 'admin' && <button onClick={() => onNavigate('admin')}>Admin</button>}
              <div className="account-menu" ref={ref}>
                <button className="account-trigger" onClick={() => setOpen((value) => !value)}>
                  <span className="avatar">{avatar}</span>
                  <span>{user.email.split('@')[0]}</span>
                  <span>{open ? '^' : 'v'}</span>
                </button>
                {open && (
                  <div className="account-panel">
                    <div className="account-user">
                      <span className="avatar large">{avatar}</span>
                      <div>
                        <p className="eyebrow small">User info</p>
                        <strong>{user.name}</strong>
                        <p>{user.email}</p>
                      </div>
                    </div>
                    <div className="account-stats">
                      <span>Account level</span>
                      <strong className="pill">{user.role}</strong>
                      <span>Credits</span>
                      <strong>{user.balance_credits}</strong>
                    </div>
                    <button onClick={() => onNavigate('app')}>Create</button>
                    <button onClick={() => onNavigate('billing')}>Billing & usage</button>
                    <button onClick={() => onNavigate('settings')}>Settings & security</button>
                    <button onClick={() => onNavigate('developer')}>API keys & webhooks</button>
                    {user.role === 'admin' && <button onClick={() => onNavigate('admin')}>Admin dashboard</button>}
                    <button className="danger" onClick={onLogout}>Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn-primary compact" onClick={() => onNavigate('login')}>Log in</button>
          )}
        </nav>
      </div>
    </header>
  );
}

function HomePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div className="page narrow">
      <section className="card hero-card">
        <p className="eyebrow">Skill-driven · ComfyUI powered</p>
        <h1>Create AI visuals without learning nodes</h1>
        <p>
          ComfySkill hides ComfyUI complexity. Describe what you need, we pick models,
          resolution, and workflow. Start with text to image today.
        </p>
        <div className="actions">
          <button className="btn-primary" onClick={() => onNavigate('app')}>Start creating</button>
          <button className="btn-secondary" onClick={() => onNavigate('pricing')}>View pricing</button>
        </div>
      </section>
      <section className="grid three">
        {[
          { title: 'Pick your goal', desc: 'E-commerce, short video, ASMR, and more' },
          { title: 'Choose quality', desc: 'Good, medium, or budget, no model names' },
          { title: 'Get results', desc: 'Credits-based, simple billing' },
        ].map((item) => (
          <div className="card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function FeaturesPage() {
  return (
    <div className="page narrow">
      <h1>Features</h1>
      <div className="grid three">
        {[
          ['Skill-driven UX', 'Users choose purpose and quality. ComfySkill handles workflow details.'],
          ['ComfyUI powered', 'Keep ComfyUI as the engine without exposing node graphs to end users.'],
          ['SaaS-ready base', 'Auth, credits, billing, usage, and admin follow LastSaaS/legacy patterns.'],
        ].map(([title, desc]) => (
          <div className="card" key={title}>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('tester@comfyskill.local');
  const [password, setPassword] = useState('replace-me-tester');
  const [name, setName] = useState('ComfySkill User');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="card form-card">
        <h1>{mode === 'login' ? 'Log in to ComfySkill' : 'Create your ComfySkill account'}</h1>
        <p>Legacy JWT mode for local development. OAuth/MFA hooks remain reserved for LastSaaS parity.</p>
        {mode === 'register' && (
          <label>
            <span>Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          <span>Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary full" disabled={loading}>
          {loading ? 'Signing in...' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
        <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

function AppPage({
  user,
  onNavigate,
  onUserRefresh,
}: {
  user: User | null;
  onNavigate: (view: View) => void;
  onUserRefresh: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<QualityTier>('standard');
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;
    const timer = setInterval(async () => {
      try {
        const updated = await jobsApi.get(job.id);
        setJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') await onUserRefresh();
      } catch {
        // Polling errors are non-fatal in local mock mode.
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [job, onUserRefresh]);

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    setJob(null);
    try {
      const { job: created } = await jobsApi.create({ prompt, quality_tier: quality });
      setJob(created);
      await onUserRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <LoginRequired onNavigate={onNavigate} />;

  return (
    <div className="page app-page">
      <div className="page-title-row">
        <h1>Text → Image</h1>
        <span className="credit-badge">{user.balance_credits} credits</span>
      </div>
      <form onSubmit={onGenerate} className="card form-card">
        <label>
          <span>Describe your image</span>
          <textarea
            className="input textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cozy cafe on a rainy evening, warm lighting..."
            data-testid="prompt"
            required
          />
        </label>
        <div>
          <p className="field-label">Quality</p>
          <div className="quality-grid">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.tier}
                type="button"
                data-testid={`quality-${option.tier}`}
                onClick={() => setQuality(option.tier)}
                className={`quality-button ${quality === option.tier ? 'active' : ''}`}
              >
                <span>{option.label}</span>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary full" type="submit" disabled={loading} data-testid="generate">
          {loading ? 'Starting...' : 'Generate'}
        </button>
      </form>
      {job && (
        <div className="card job-panel" data-testid="job-panel">
          <p>Status: <strong className="capitalize" data-testid="job-status">{job.status}</strong></p>
          {job.model_preset && <p className="muted">Preset: {job.model_preset}</p>}
          {job.error_message && <p className="error">{job.error_message}</p>}
          {job.output_url && <img src={job.output_url} alt="Generated" data-testid="output-image" />}
        </div>
      )}
      <p className="center muted">
        <button className="link-button" onClick={() => onNavigate('billing')}>Billing & usage</button>
      </p>
    </div>
  );
}

function PricingPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const plans = [
    { name: 'Standard', price: '$20/mo', credits: '4,200 credits', note: 'Similar to Comfy Cloud Standard', available: true },
    { name: 'Creator', price: '$35/mo', credits: '7,400 credits', popular: true },
    { name: 'Pro', price: '$100/mo', credits: '21,100 credits', note: 'Teams & heavy use' },
  ];
  return (
    <div className="page pricing-page">
      <h1>Pricing</h1>
      <p className="muted center">Monthly subscription with credits. When credits run out, upgrade or renew.</p>
      <div className="grid three">
        {plans.map((plan) => (
          <div className={`card pricing-card ${plan.popular ? 'popular' : ''}`} key={plan.name}>
            {plan.popular && <span className="popular-badge">Popular</span>}
            <h2>{plan.name}</h2>
            <p className="price">{plan.price}</p>
            <p className="muted">{plan.credits}</p>
            {plan.note && <p className="muted tiny">{plan.note}</p>}
            <button className={plan.available ? 'btn-primary full' : 'btn-secondary full'} onClick={() => onNavigate('billing')}>
              {plan.available ? 'Subscribe' : 'Coming soon'}
            </button>
          </div>
        ))}
      </div>
      <p className="center muted">
        Ready to test subscription checkout? <button className="link-button" onClick={() => onNavigate('billing')}>Open billing</button>.
      </p>
    </div>
  );
}

function BillingPage({ user, onNavigate }: { user: User | null; onNavigate: (view: View) => void }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof billingApi.subscription>> | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{ configured: boolean; price_configured: boolean; mode: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([billingApi.balance(), billingApi.transactions(), billingApi.subscription(), billingApi.stripeStatus()])
      .then(([balanceResult, txResult, subscriptionResult, status]) => {
        setBalance(balanceResult.balance_credits);
        setTransactions(txResult.transactions);
        setSubscription(subscriptionResult);
        setStripeStatus(status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load billing'));
  }, [user]);

  if (!user) return <LoginRequired onNavigate={onNavigate} />;

  const stripeReady = Boolean(stripeStatus?.configured && stripeStatus.price_configured);

  async function startCheckout() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { checkout_url } = await billingApi.checkout('standard');
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    const { portal_url } = await billingApi.portal();
    window.location.href = portal_url;
  }

  async function copyStripeTestCard() {
    const value = [
      `Card: ${STRIPE_TEST_CARD.number}`,
      `Expiry: ${STRIPE_TEST_CARD.expiry}`,
      `CVC: ${STRIPE_TEST_CARD.cvc}`,
      `Name: ${STRIPE_TEST_CARD.name}`,
      `Country: ${STRIPE_TEST_CARD.country}`,
    ].join('\n');
    await navigator.clipboard.writeText(value);
    setMessage('Stripe test card copied. Paste it into Checkout after redirect.');
  }

  return (
    <div className="page billing-page">
      <h1>Billing & usage</h1>
      <div className="billing-grid">
        <div className="card">
          <p className="muted">Current balance</p>
          <p className="big-number">{balance ?? '...'} credits</p>
          <div className="status-box">
            Subscription: <strong>{subscription?.status ?? 'loading'}</strong><br />
            Plan: <strong>{subscription?.plan_id ?? '-'}</strong><br />
            Stripe mode: <strong>{stripeStatus?.mode ?? 'loading'}</strong><br />
            Checkout: <strong>{stripeReady ? 'configured' : 'not ready'}</strong>
          </div>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <div className="test-card-box">
            <div>
              <p className="eyebrow small">Stripe test card</p>
              <p className="test-card-number">{STRIPE_TEST_CARD.number}</p>
            </div>
            <dl>
              <div>
                <dt>Expiry</dt>
                <dd>{STRIPE_TEST_CARD.expiry}</dd>
              </div>
              <div>
                <dt>CVC</dt>
                <dd>{STRIPE_TEST_CARD.cvc}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{STRIPE_TEST_CARD.name}</dd>
              </div>
            </dl>
            <button type="button" className="btn-secondary full" onClick={() => void copyStripeTestCard()}>
              Copy test card
            </button>
            <p className="tiny muted">
              Stripe Checkout fields are secure Stripe-hosted inputs, so browsers/apps cannot auto-fill them programmatically.
            </p>
          </div>
          <div className="actions">
            <button className="btn-primary" disabled={!stripeReady || loading} onClick={() => void startCheckout()}>
              {loading ? 'Starting...' : 'Enter payment details'}
            </button>
            <button className="btn-secondary" disabled={!stripeStatus?.configured} onClick={() => void openPortal()}>
              Manage billing
            </button>
          </div>
          <p className="tiny muted">Card details are collected by Stripe when real keys are configured.</p>
        </div>
        <div className="card">
          <h2>Recent transactions</h2>
          {transactions.length ? (
            <div className="tx-list">
              {transactions.slice(0, 8).map((tx) => (
                <div className="tx-row" key={tx.id}>
                  <div>
                    <strong>{tx.type}</strong>
                    <p>{tx.description ?? 'No description'}</p>
                    <small>{new Date(tx.created_at).toLocaleString()}</small>
                  </div>
                  <strong className={tx.amount >= 0 ? 'positive' : ''}>{tx.amount >= 0 ? '+' : ''}{tx.amount}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No billing transactions yet.</p>
          )}
        </div>
      </div>
      <p className="center muted"><button className="link-button" onClick={() => onNavigate('pricing')}>View plans</button></p>
    </div>
  );
}

function SettingsPage({
  user,
  onNavigate,
  onUserRefresh,
}: {
  user: User | null;
  onNavigate: (view: View) => void;
  onUserRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [defaultQuality, setDefaultQuality] = useState<QualityTier>(user?.preferences?.default_quality ?? 'standard');
  const [defaultLanguage, setDefaultLanguage] = useState(user?.preferences?.default_language ?? 'English');
  const [marketingEmails, setMarketingEmails] = useState(user?.preferences?.marketing_emails ?? true);
  const [security, setSecurity] = useState<Awaited<ReturnType<typeof settingsApi.security>> | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([settingsApi.security(), settingsApi.activity()])
      .then(([securityResult, activityResult]) => {
        setSecurity(securityResult);
        setActivity(activityResult.events);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'));
  }, [user]);

  if (!user) return <LoginRequired onNavigate={onNavigate} />;

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await settingsApi.profile({ name });
      await settingsApi.preferences({
        default_quality: defaultQuality,
        default_language: defaultLanguage,
        marketing_emails: marketingEmails,
      });
      await onUserRefresh();
      setMessage('Settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  return (
    <div className="page settings-page">
      <h1>Settings & security</h1>
      <div className="settings-grid">
        <form className="card form-card" onSubmit={(event) => void saveSettings(event)}>
          <h2>Profile preferences</h2>
          <label>
            <span>Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>Default quality</span>
            <select className="input" value={defaultQuality} onChange={(e) => setDefaultQuality(e.target.value as QualityTier)}>
              {QUALITY_OPTIONS.map((option) => <option key={option.tier} value={option.tier}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Default language</span>
            <input className="input" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />
            <span>Receive product and credit usage emails</span>
          </label>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <button className="btn-primary full" type="submit">Save settings</button>
        </form>
        <div className="card">
          <h2>Security posture</h2>
          <div className="status-box">
            Email verified: <strong>{security?.email_verified ? 'yes' : 'local seed'}</strong><br />
            MFA: <strong>{security?.mfa_enabled ? 'enabled' : 'reserved'}</strong><br />
            Active API keys: <strong>{security?.active_api_keys ?? 0}</strong>
          </div>
          <p className="muted">
            OAuth, magic link, TOTP MFA, and WebAuthn are reserved for LastSaaS parity and already exposed in the backend capability map.
          </p>
          <h3>Recent activity</h3>
          <MiniAuditList logs={activity.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}

function DeveloperPage({ user, onNavigate }: { user: User | null; onNavigate: (view: View) => void }) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [keyName, setKeyName] = useState('Local automation');
  const [webhookName, setWebhookName] = useState('ComfySkill events');
  const [webhookUrl, setWebhookUrl] = useState('https://example.com/webhooks/comfyskill');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  async function loadDeveloperData() {
    const [keys, endpoints] = await Promise.all([developerApi.apiKeys(), developerApi.webhooks()]);
    setApiKeys(keys.api_keys);
    setWebhooks(endpoints.webhooks);
    setAvailableEvents(endpoints.available_events);
  }

  useEffect(() => {
    if (user) loadDeveloperData().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load developer settings'));
  }, [user]);

  if (!user) return <LoginRequired onNavigate={onNavigate} />;
  const currentUser = user;

  async function createKey(event: FormEvent) {
    event.preventDefault();
    setError('');
    const result = await developerApi.createApiKey({ name: keyName, authority: currentUser.role === 'admin' ? 'admin' : 'user' });
    setSecret(result.secret);
    await loadDeveloperData();
  }

  async function createWebhook(event: FormEvent) {
    event.preventDefault();
    setError('');
    const events = availableEvents.slice(0, 3);
    const result = await developerApi.createWebhook({ name: webhookName, url: webhookUrl, events });
    setSecret(result.secret);
    await loadDeveloperData();
  }

  return (
    <div className="page developer-page">
      <h1>API keys & webhooks</h1>
      {secret && (
        <div className="notice">
          <strong>Copy this secret now:</strong>
          <code>{secret}</code>
          <p className="tiny">It is shown once. The backend stores only a SHA-256 hash and preview.</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="settings-grid">
        <form className="card form-card" onSubmit={(event) => void createKey(event)}>
          <h2>API keys</h2>
          <label>
            <span>Key name</span>
            <input className="input" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          </label>
          <button className="btn-primary full" type="submit">Create API key</button>
          <DataTable
            headers={['Name', 'Preview', 'Authority', 'Active']}
            rows={apiKeys.map((key) => [key.name, key.key_preview, key.authority, key.is_active ? 'yes' : 'no'])}
          />
        </form>
        <form className="card form-card" onSubmit={(event) => void createWebhook(event)}>
          <h2>Outgoing webhooks</h2>
          <label>
            <span>Name</span>
            <input className="input" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} />
          </label>
          <label>
            <span>HTTPS endpoint</span>
            <input className="input" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          </label>
          <p className="tiny muted">Default events: {availableEvents.slice(0, 3).join(', ') || 'loading'}</p>
          <button className="btn-secondary full" type="submit">Register webhook</button>
          <DataTable
            headers={['Name', 'URL', 'Events', 'Active']}
            rows={webhooks.map((hook) => [hook.name, hook.url, hook.events.join(', '), hook.is_active ? 'yes' : 'no'])}
          />
        </form>
      </div>
    </div>
  );
}

function HealthPage({ user, onNavigate }: { user: User | null; onNavigate: (view: View) => void }) {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof platformApi.health>> | null>(null);
  const [adminHealth, setAdminHealth] = useState<Awaited<ReturnType<typeof adminApi.health>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    platformApi.health().then(setHealth).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load health'));
    if (user.role === 'admin') adminApi.health().then(setAdminHealth).catch(() => undefined);
  }, [user]);

  if (!user) return <LoginRequired onNavigate={onNavigate} />;

  return (
    <div className="page health-page">
      <h1>Platform health</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid three">
        <div className="card stat-card"><p>{health?.status ?? '...'}</p><span>API status</span></div>
        <div className="card stat-card"><p>{health?.database ?? '-'}</p><span>MongoDB database</span></div>
        <div className="card stat-card"><p>{health?.comfyMock ? 'mock' : 'live'}</p><span>ComfyUI mode</span></div>
      </div>
      <IntegrationGrid integrations={health?.integrations ?? []} />
      {adminHealth && (
        <div className="card">
          <h2>Runtime</h2>
          <p className="muted">{adminHealth.runtime} · {adminHealth.goroutines} goroutines · heap {Math.round(adminHealth.heap_alloc / 1024 / 1024)} MB</p>
        </div>
      )}
    </div>
  );
}

function IntegrationGrid({ integrations }: { integrations: IntegrationCheck[] }) {
  return (
    <div className="grid four">
      {integrations.map((item) => (
        <div className="card integration-card" key={item.name}>
          <span className={`status-dot ${item.status}`} />
          <h3>{item.name}</h3>
          <p>{item.status}</p>
          <small>{item.message}</small>
        </div>
      ))}
    </div>
  );
}

function AdminPage({ user, onNavigate }: { user: User | null; onNavigate: (view: View) => void }) {
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof adminApi.metrics>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      adminApi.metrics().then(setMetrics).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load metrics'));
    }
  }, [user]);

  if (!user) return <LoginRequired onNavigate={onNavigate} />;
  if (user.role !== 'admin') return <Forbidden onNavigate={onNavigate} />;

  return (
    <div className="page admin-page">
      <h1>Admin dashboard</h1>
      {error && <p className="error">{error}</p>}
      {metrics && (
        <div className="grid four">
          {[
            ['Total jobs', metrics.total_jobs],
            ['Completed', metrics.completed_jobs],
            ['Failed', metrics.failed_jobs],
            ['Credits used', metrics.credits_consumed_today],
          ].map(([label, value]) => (
            <div className="card stat-card" key={label}>
              <p>{value}</p>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="actions">
        <button className="btn-primary" onClick={() => onNavigate('adminJobs')}>All jobs</button>
        <button className="btn-secondary" onClick={() => onNavigate('adminUsers')}>Users</button>
        <button className="btn-secondary" onClick={() => onNavigate('adminAudit')}>Audit logs</button>
        <button className="btn-secondary" onClick={() => onNavigate('health')}>System health</button>
      </div>
    </div>
  );
}

function AdminAuditPage({ user }: { user: User | null }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') adminApi.auditLogs().then((result) => setLogs(result.logs)).catch(() => undefined);
  }, [user]);

  if (user?.role !== 'admin') return <Forbidden />;

  return (
    <div className="page table-page">
      <h1>Audit logs</h1>
      <MiniAuditList logs={logs} />
    </div>
  );
}

function AdminJobsPage({ user }: { user: User | null }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') adminApi.jobs().then((result) => setJobs(result.jobs)).catch(() => undefined);
  }, [user]);

  if (user?.role !== 'admin') return <Forbidden />;

  return (
    <div className="page table-page">
      <h1>All jobs</h1>
      <DataTable
        headers={['Status', 'Prompt', 'Quality', 'Model preset', 'Credits']}
        rows={jobs.map((job) => [job.status, job.prompt_text, job.quality_tier, job.model_preset ?? '-', String(job.credits_charged ?? job.credits_estimated)])}
      />
    </div>
  );
}

function AdminUsersPage({ user }: { user: User | null }) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') adminApi.users().then((result) => setUsers(result.users)).catch(() => undefined);
  }, [user]);

  if (user?.role !== 'admin') return <Forbidden />;

  return (
    <div className="page table-page">
      <h1>Users</h1>
      <DataTable headers={['Email', 'Role', 'Credits']} rows={users.map((u) => [u.email, u.role, String(u.balance_credits)])} />
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>{row.map((cell, cellIdx) => <td key={cellIdx}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniAuditList({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <p className="muted">No activity yet.</p>;
  return (
    <div className="audit-list">
      {logs.map((log) => (
        <div className="audit-row" key={log.id}>
          <div>
            <strong>{log.action}</strong>
            <p>{log.resource}</p>
          </div>
          <small>{new Date(log.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}

function LoginRequired({ onNavigate }: { onNavigate?: (view: View) => void }) {
  return (
    <div className="page narrow center">
      <div className="card">
        <h2>Login required</h2>
        <p className="muted">Please log in before using this page.</p>
        {onNavigate && <button className="btn-primary" onClick={() => onNavigate('login')}>Log in</button>}
      </div>
    </div>
  );
}

function Forbidden({ onNavigate }: { onNavigate?: (view: View) => void }) {
  return (
    <div className="page narrow center">
      <div className="card">
        <h2>Admin only</h2>
        <p className="muted">This page requires an admin account.</p>
        {onNavigate && <button className="btn-secondary" onClick={() => onNavigate('app')}>Back to app</button>}
      </div>
    </div>
  );
}
