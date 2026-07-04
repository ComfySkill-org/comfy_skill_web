import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import type { User } from '../api/client';

type CanvasStudioProps = {
  user: User | null;
  onNavigateLogin: () => void;
};

type StoryBlock = {
  id: string;
  title: string;
  synopsis: string;
  status: 'idle' | 'ready' | 'generating';
  x: number;
  y: number;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

const SEED_BLOCKS: StoryBlock[] = [
  {
    id: 'shot-1',
    title: 'Opening beat',
    synopsis: 'Wide establishing shot. Soft morning light over the quiet street.',
    status: 'ready',
    x: 80,
    y: 120,
  },
  {
    id: 'shot-2',
    title: 'Character enter',
    synopsis: 'Hero steps into frame, glances toward the bakery window.',
    status: 'idle',
    x: 360,
    y: 160,
  },
  {
    id: 'shot-3',
    title: 'Close reaction',
    synopsis: 'Tight face shot. A small smile as the door chime rings.',
    status: 'idle',
    x: 640,
    y: 120,
  },
];

/**
 * Product-first studio canvas (PRD F3/F4).
 * Params panel lands in a follow-up step.
 */
export default function CanvasStudio({ user, onNavigateLogin }: CanvasStudioProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [blocks, setBlocks] = useState<StoryBlock[]>(SEED_BLOCKS);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const panDragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const blockDragRef = useRef<{ id: string; x: number; y: number; originX: number; originY: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))));
  }, []);

  const onViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || blockDragRef.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      panDragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      setPanning(true);
    },
    [pan.x, pan.y],
  );

  const onViewportPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const panDrag = panDragRef.current;
    if (panDrag) {
      setPan({
        x: panDrag.panX + (event.clientX - panDrag.x),
        y: panDrag.panY + (event.clientY - panDrag.y),
      });
      return;
    }

    const blockDrag = blockDragRef.current;
    if (!blockDrag) return;
    const scale = zoomRef.current || 1;
    const nextX = blockDrag.originX + (event.clientX - blockDrag.x) / scale;
    const nextY = blockDrag.originY + (event.clientY - blockDrag.y) / scale;
    setBlocks((current) =>
      current.map((block) => (block.id === blockDrag.id ? { ...block, x: nextX, y: nextY } : block)),
    );
  }, []);

  const endViewportPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (panDragRef.current) {
      panDragRef.current = null;
      setPanning(false);
    }
    if (blockDragRef.current) {
      blockDragRef.current = null;
      setDraggingBlockId(null);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onBlockPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, block: StoryBlock) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    blockDragRef.current = {
      id: block.id,
      x: event.clientX,
      y: event.clientY,
      originX: block.x,
      originY: block.y,
    };
    setDraggingBlockId(block.id);
  }, []);

  const onBlockPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const blockDrag = blockDragRef.current;
    if (!blockDrag) return;
    const scale = zoomRef.current || 1;
    const nextX = blockDrag.originX + (event.clientX - blockDrag.x) / scale;
    const nextY = blockDrag.originY + (event.clientY - blockDrag.y) / scale;
    setBlocks((current) =>
      current.map((block) => (block.id === blockDrag.id ? { ...block, x: nextX, y: nextY } : block)),
    );
  }, []);

  const onBlockPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (blockDragRef.current) {
      blockDragRef.current = null;
      setDraggingBlockId(null);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
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
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={endViewportPointer}
          onPointerCancel={endViewportPointer}
        >
          <div
            className="studio-world"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            data-testid="studio-world"
          >
            {blocks.map((block) => (
              <article
                key={block.id}
                className={`story-block${draggingBlockId === block.id ? ' is-dragging' : ''}`}
                data-testid={`story-block-${block.id}`}
                style={{ left: block.x, top: block.y }}
                onPointerDown={(event) => onBlockPointerDown(event, block)}
                onPointerMove={onBlockPointerMove}
                onPointerUp={onBlockPointerUp}
                onPointerCancel={onBlockPointerUp}
              >
                <div className="story-block-preview" aria-hidden="true" />
                <div className="story-block-body">
                  <div className="story-block-head">
                    <h2>{block.title}</h2>
                    <span className={`story-block-status status-${block.status}`}>{block.status}</span>
                  </div>
                  <p>{block.synopsis}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="studio-zoom-badge" aria-live="polite">
          {zoomPercent}%
        </div>
      </div>
    </div>
  );
}
