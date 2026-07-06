import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import type { User } from '../api/client';

type CanvasStudioProps = {
  user: User | null;
  onNavigateLogin: () => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

/**
 * Product-first studio canvas (PRD F3).
 * Story blocks and params panel land in follow-up steps.
 */
export default function CanvasStudio({ user, onNavigateLogin }: CanvasStudioProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))));
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      setPanning(true);
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({
      x: drag.panX + (event.clientX - drag.x),
      y: drag.panY + (event.clientY - drag.y),
    });
  }, []);

  const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      setPanning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

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
        <div
          className={`studio-viewport${panning ? ' is-panning' : ''}`}
          data-testid="studio-viewport"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div
            className="studio-world"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
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
