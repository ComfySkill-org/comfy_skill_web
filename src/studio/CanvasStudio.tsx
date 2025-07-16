import type { User } from '../api/client';

type CanvasStudioProps = {
  user: User | null;
  onNavigateLogin: () => void;
};

/**
 * Product-first studio canvas shell (PRD F3).
 * Blocks, pan/zoom, and params panel land in follow-up commits.
 */
export default function CanvasStudio({ user, onNavigateLogin }: CanvasStudioProps) {
  if (!user) {
    return (
      <div className="page narrow center">
        <div className="card">
          <h2>Login required</h2>
          <p className="muted">Sign in to open the studio canvas.</p>
          <button className="btn-primary" onClick={onNavigateLogin}>
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-root" data-testid="studio-canvas">
      <header className="studio-topbar">
        <div>
          <p className="eyebrow small">Studio</p>
          <h1>Untitled project</h1>
        </div>
        <div className="studio-topbar-meta">
          <span className="credit-badge">{user.balance_credits} credits</span>
          <span className="pill">Storyboard</span>
        </div>
      </header>
      <div className="studio-stage">
        <p className="studio-empty muted">Canvas is ready. Add story blocks to begin.</p>
      </div>
    </div>
  );
}
