import { animate } from 'animejs';
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

const VIEW_ROUTES: Record<View, string> = {
  home: '/',
  features: '/features',
  pricing: '/pricing',
  login: '/login',
  app: '/create',
  billing: '/bill',
  settings: '/setting',
  developer: '/developer',
  health: '/health',
  admin: '/admin',
  adminJobs: '/admin/jobs',
  adminUsers: '/admin/users',
  adminAudit: '/admin/audit',
};

const ROUTE_VIEWS: Record<string, View> = {
  '/': 'home',
  '/features': 'features',
  '/pricing': 'pricing',
  '/login': 'login',
  '/app': 'app',
  '/create': 'app',
  '/bill': 'billing',
  '/billing': 'billing',
  '/setting': 'settings',
  '/settings': 'settings',
  '/developer': 'developer',
  '/health': 'health',
  '/admin': 'admin',
  '/admin/jobs': 'adminJobs',
  '/admin/users': 'adminUsers',
  '/admin/audit': 'adminAudit',
};

function viewFromPath(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return ROUTE_VIEWS[normalized] || 'home';
}

function pathForView(view: View) {
  return VIEW_ROUTES[view];
}

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
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (getToken()) authApi.me().then(setUser).catch(() => setToken(null));
  }, []);

  useEffect(() => {
    function handlePopState() {
      setView(viewFromPath(window.location.pathname));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(nextView: View) {
    const nextPath = pathForView(nextView);
    setView(nextView);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ view: nextView }, '', nextPath);
    }
  }

  async function refreshUser() {
    if (!getToken()) return;
    setUser(await authApi.me());
  }

  async function handleLogin(email: string, password: string) {
    const response = await authApi.login({ email, password });
    setToken(response.access_token);
    setUser(await authApi.me());
    navigate('app');
  }

  async function handleRegister(email: string, password: string, name: string) {
    const response = await authApi.register({ email, password, name });
    setToken(response.access_token);
    setUser(await authApi.me());
    navigate('app');
  }

  function logout() {
    setToken(null);
    setUser(null);
    navigate('home');
  }

  return (
    <>
      <SiteHeader user={user} view={view} onNavigate={navigate} onLogout={logout} />
      <main>
        {view === 'home' && <HomePage onNavigate={navigate} />}
        {view === 'features' && <FeaturesPage />}
        {view === 'pricing' && <PricingPage onNavigate={navigate} />}
        {view === 'login' && <LoginPage onLogin={handleLogin} onRegister={handleRegister} />}
        {view === 'app' && <AppPage user={user} onNavigate={navigate} onUserRefresh={refreshUser} />}
        {view === 'billing' && <BillingPage user={user} onNavigate={navigate} />}
        {view === 'settings' && <SettingsPage user={user} onNavigate={navigate} onUserRefresh={refreshUser} />}
        {view === 'developer' && <DeveloperPage user={user} onNavigate={navigate} />}
        {view === 'health' && <HealthPage user={user} onNavigate={navigate} />}
        {view === 'admin' && <AdminPage user={user} onNavigate={navigate} />}
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
    <div className="page landing-page">
      <section className="landing-hero">
        <HeroCanvas />
        <div className="hero-copy">
          <p className="eyebrow">Product-first creation studio</p>
          <h1>Story to screen.</h1>
          <p>Build shots on a canvas. Ship the piece—not the pipeline.</p>
          <div className="hero-links">
            <button onClick={() => onNavigate('features')}>Features</button>
            <button onClick={() => onNavigate('pricing')}>Pricing</button>
            <button onClick={() => onNavigate('billing')}>Billing</button>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={() => onNavigate('app')}>Open studio</button>
            <button className="btn-secondary" onClick={() => onNavigate('pricing')}>View plans</button>
          </div>
        </div>
        <HeroShowcase />
      </section>

      <section className="section-heading">
        <p className="eyebrow">What you make</p>
        <h2>Organize the story. Generate the look.</h2>
      </section>
      <section className="grid three feature-grid">
        {[
          { title: 'Start from the piece', desc: 'Name the scene, the beat, or the social cut—not a model checkpoint or node graph.' },
          { title: 'Arrange on a canvas', desc: 'Drag story blocks, preview frames, and keep the board readable while you iterate.' },
          { title: 'Hide the engine', desc: 'Parameters stay tucked behind a single control. The studio stays about the work, not the wiring.' },
        ].map((item) => (
          <div className="card feature-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="card flow-section">
        <div>
          <p className="eyebrow">How it works</p>
          <h2>Brief → storyboard → generate → refine</h2>
          <p className="muted">
            You stay in product language the whole way. Generation runs behind the scenes so the canvas never turns into a node editor.
          </p>
        </div>
        <div className="flow-steps">
          {['Brief', 'Story blocks', 'Generate', 'Polish'].map((step, index) => (
            <div className="flow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroShowcase() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const animations: ReturnType<typeof animate>[] = [];
    const showcaseWindow = root.querySelector('.showcase-window');

    if (showcaseWindow) {
      animations.push(animate(showcaseWindow, {
        translateY: [-10, 10],
        rotate: [-0.6, 0.6],
        duration: 4200,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      }));
    }

    animations.push(
      animate(root.querySelectorAll('.showcase-orb'), {
        scale: [0.72, 1.15],
        opacity: [0.42, 1],
        delay: (_, index) => (index ?? 0) * 240,
        duration: 1800,
        alternate: true,
        loop: true,
        ease: 'inOutQuad',
      }),
      animate(root.querySelectorAll('.energy-dot'), {
        translateX: [0, 420],
        translateY: (_, index) => [0, (index ?? 0) % 2 === 0 ? -74 : 58],
        scale: [0.5, 1.25, 0.55],
        opacity: [0, 1, 0],
        delay: (_, index) => (index ?? 0) * 260,
        duration: 2600,
        loop: true,
        ease: 'inOutCubic',
      }),
      animate(root.querySelectorAll('.frame-strip span'), {
        scaleY: [0.38, 1],
        opacity: [0.35, 1],
        delay: (_, index) => (index ?? 0) * 140,
        duration: 1200,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      }),
      animate(root.querySelectorAll('.preview-layer'), {
        translateY: (_, index) => [(index ?? 0) * 6, (index ?? 0) * -5],
        translateX: (_, index) => [(index ?? 0) * -4, (index ?? 0) * 5],
        delay: (_, index) => (index ?? 0) * 180,
        duration: 3200,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      }),
    );

    return () => animations.forEach((animation) => animation.revert());
  }, []);

  return (
    <div className="hero-showcase" ref={ref} aria-label="Idea to animation visual workflow">
      <div className="showcase-badge">Live visual workflow</div>
      <div className="idea-chip">
        <span className="showcase-orb" />
        <div>
          <p>Idea</p>
          <strong>Moonlit robot chef</strong>
        </div>
      </div>
      <div className="energy-field" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <span className="energy-dot" key={index} />)}
      </div>
      <div className="showcase-window">
        <div className="preview-sky">
          <span className="preview-layer layer-moon" />
          <span className="preview-layer layer-mountain" />
          <span className="preview-layer layer-mountain second" />
          <span className="preview-layer layer-character" />
          <span className="preview-layer layer-glow" />
        </div>
        <div className="frame-strip" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
        </div>
        <div className="render-status">
          <span className="showcase-orb" />
          <strong>Animating</strong>
          <small>24 frames</small>
        </div>
      </div>
      <div className="hero-caption" aria-hidden="true">
        <span>Idea</span>
        <span>Workflow</span>
        <span>Motion</span>
      </div>
    </div>
  );
}

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    const drawingCanvas = canvas;
    const ctx = context;

    type Particle = {
      angle: number;
      orbit: number;
      speed: number;
      size: number;
      phase: number;
    };

    const particles: Particle[] = Array.from({ length: 80 }, (_, index) => ({
      angle: index * 0.55,
      orbit: 0.16 + (index % 12) * 0.018,
      speed: 0.35 + (index % 7) * 0.035,
      size: 1.2 + (index % 5) * 0.45,
      phase: index * 0.21,
    }));

    let animationFrame = 0;
    let width = 0;
    let height = 0;

    function resize() {
      const rect = drawingCanvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      drawingCanvas.width = Math.floor(width * ratio);
      drawingCanvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawOrb(x: number, y: number, radius: number, color: string, glow: string) {
      const gradient = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, 0, x, y, radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.35, color);
      gradient.addColorStop(1, glow);
      ctx.fillStyle = gradient;
      ctx.shadowColor = glow;
      ctx.shadowBlur = radius * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function draw(time: number) {
      const t = time * 0.001;
      ctx.clearRect(0, 0, width, height);

      const ideaX = width * 0.24;
      const ideaY = height * 0.48;
      const motionX = width * 0.76;
      const motionY = height * 0.5;
      const pulse = Math.sin(t * 2) * 0.5 + 0.5;

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, 'rgba(126, 200, 227, 0.22)');
      background.addColorStop(0.5, 'rgba(255, 244, 184, 0.18)');
      background.addColorStop(1, 'rgba(39, 131, 165, 0.18)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 8; i += 1) {
        const progress = ((t * 0.16 + i / 8) % 1);
        const x = ideaX + (motionX - ideaX) * progress;
        const wave = Math.sin(progress * Math.PI * 2 + t * 2.4 + i) * height * 0.08;
        const y = ideaY + (motionY - ideaY) * progress + wave;

        ctx.strokeStyle = `rgba(39, 131, 165, ${0.1 + progress * 0.22})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ideaX, ideaY);
        ctx.quadraticCurveTo(width * 0.5, height * (0.24 + i * 0.025), motionX, motionY);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 244, 184, ${0.35 + progress * 0.65})`;
        ctx.beginPath();
        ctx.arc(x, y, 3 + progress * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      particles.forEach((particle) => {
        const radius = Math.min(width, height) * particle.orbit;
        const x = motionX + Math.cos(t * particle.speed + particle.angle) * radius * 1.2;
        const y = motionY + Math.sin(t * particle.speed + particle.angle) * radius * 0.65;
        const alpha = 0.25 + (Math.sin(t * 2.2 + particle.phase) + 1) * 0.28;

        ctx.fillStyle = `rgba(255, 244, 184, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      drawOrb(ideaX, ideaY, 54 + pulse * 10, '#fff4b8', 'rgba(255, 244, 184, 0.45)');
      drawOrb(motionX, motionY, 96 + pulse * 12, '#7ec8e3', 'rgba(39, 131, 165, 0.38)');

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(motionX, motionY, 48, t, t + Math.PI * 1.4);
      ctx.stroke();

      ctx.fillStyle = 'rgba(26, 43, 60, 0.78)';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.fillText('IDEA', ideaX - 22, ideaY + 6);
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillText('ANIMATION', motionX - 62, motionY + 8);

      animationFrame = requestAnimationFrame(draw);
    }

    resize();
    animationFrame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas className="hero-canvas" ref={canvasRef} aria-hidden="true" />;
}

function FeaturesPage() {
  return (
    <div className="page narrow">
      <h1>Features</h1>
      <div className="grid three">
        {[
          ['Product-first studio', 'You work in stories and shots. The platform handles generation details behind the scenes.'],
          ['Canvas storyboard', 'Drag blocks, preview frames, and keep parameters hidden until you open them on purpose.'],
          ['SaaS-ready base', 'Auth, credits, billing, usage, and admin stay in place while the studio stays creative.'],
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
