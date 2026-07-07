import { useState } from 'react';
import type { User } from '../api/client';

type CanvasStudioProps = {
  user: User | null;
  onNavigateLogin: () => void;
};

/**
 * Product-first studio canvas (PRD F3).
 * Pan/zoom interaction and story blocks land in follow-up steps.
 */
export default function CanvasStudio({ user, onNavigateLogin }: CanvasStudioProps) {
  const [zoom] = useState(1);

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

  const zoomPercent = Math.round(zoom * 100);

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
        <div className="studio-viewport" data-testid="studio-viewport">
          <div
            className="studio-world"
            style={{ transform: `scale(${zoom})` }}
            data-testid="studio-world"
          >
            <p className="studio-empty muted">Canvas is ready. Add story blocks to begin.</p>
          </div>
        </div>
        <div className="studio-zoom-badge" aria-live="polite">
          {zoomPercent}%
        </div>
      </div>
    </div>
  );
}
