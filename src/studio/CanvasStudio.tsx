import { FormEvent, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { jobsApi, type QualityTier, type User } from '../api/client';
import { loadStudioState, saveStudioState } from './studioStorage';

type CanvasStudioProps = {
  user: User | null;
  onNavigateLogin: () => void;
  onUserRefresh?: () => Promise<void>;
};

type StoryBlock = {
  id: string;
  title: string;
  synopsis: string;
  status: 'idle' | 'ready' | 'generating' | 'done' | 'failed';
  quality: QualityTier;
  outputUrl?: string;
  jobId?: string;
  error?: string;
  x: number;
  y: number;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

const QUALITY_OPTIONS: { tier: QualityTier; label: string }[] = [
  { tier: 'budget', label: 'Budget' },
  { tier: 'standard', label: 'Medium' },
  { tier: 'premium', label: 'Good' },
];

const SEED_BLOCKS: StoryBlock[] = [
  {
    id: 'shot-1',
    title: 'Opening beat',
    synopsis: 'Wide establishing shot. Soft morning light over the quiet street.',
    status: 'ready',
    quality: 'standard',
    x: 80,
    y: 120,
  },
  {
    id: 'shot-2',
    title: 'Character enter',
    synopsis: 'Hero steps into frame, glances toward the bakery window.',
    status: 'idle',
    quality: 'standard',
    x: 360,
    y: 160,
  },
  {
    id: 'shot-3',
    title: 'Close reaction',
    synopsis: 'Tight face shot. A small smile as the door chime rings.',
    status: 'idle',
    quality: 'budget',
    x: 640,
    y: 120,
  },
];

const BLOCK_WIDTH = 220;
const BLOCK_ANCHOR_Y = 96;

function linkPath(from: StoryBlock, to: StoryBlock) {
  const x1 = from.x + BLOCK_WIDTH;
  const y1 = from.y + BLOCK_ANCHOR_Y;
  const x2 = to.x;
  const y2 = to.y + BLOCK_ANCHOR_Y;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

/**
 * Product-first studio canvas (PRD F3/F4/F5/F6).
 * Parameters stay hidden until the block 「参数」 control is opened.
 */
export default function CanvasStudio({ user, onNavigateLogin, onUserRefresh }: CanvasStudioProps) {
  const saved = typeof window !== 'undefined' ? loadStudioState() : null;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [blocks, setBlocks] = useState<StoryBlock[]>(saved?.blocks ?? SEED_BLOCKS);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [paramsBlockId, setParamsBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [assistantNote, setAssistantNote] = useState('用一句话描述今天的故事，我会帮你落到画布上的镜头块。');
  const [projectTitle, setProjectTitle] = useState(saved?.projectTitle ?? 'Untitled project');
  const [studioView, setStudioView] = useState<'storyboard' | 'workflow'>(saved?.studioView ?? 'storyboard');
  const panDragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const blockDragRef = useRef<{ id: string; x: number; y: number; originX: number; originY: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    saveStudioState({
      projectTitle,
      studioView,
      blocks: blocks.map((block) => ({
        ...block,
        status: block.status === 'generating' ? 'ready' : block.status,
      })),
    });
  }, [blocks, projectTitle, studioView]);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))));
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))));
  }, []);

  const onViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || blockDragRef.current) return;
      setSelectedBlockId(null);
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
    setSelectedBlockId(block.id);
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

  const toggleParams = useCallback((blockId: string) => {
    setParamsBlockId((current) => (current === blockId ? null : blockId));
  }, []);

  const setBlockQuality = useCallback((blockId: string, quality: QualityTier) => {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, quality } : block)));
  }, []);

  const addStoryBlock = useCallback(() => {
    setBlocks((current) => {
      const index = current.length + 1;
      const offset = (index % 4) * 36;
      return [
        ...current,
        {
          id: `shot-${Date.now()}`,
          title: `Shot ${index}`,
          synopsis: 'Describe this beat in plain language.',
          status: 'idle' as const,
          quality: 'standard' as QualityTier,
          x: 120 + offset,
          y: 220 + offset,
        },
      ];
    });
  }, []);

  const removeStoryBlock = useCallback((blockId: string) => {
    setBlocks((current) => current.filter((block) => block.id !== blockId));
    setParamsBlockId((current) => (current === blockId ? null : current));
    setDraggingBlockId((current) => (current === blockId ? null : current));
    setSelectedBlockId((current) => (current === blockId ? null : current));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === 'input' ||
        tag === 'textarea' ||
        Boolean(target?.isContentEditable);
      if (typing) return;

      if (event.key === 'Escape') {
        setSelectedBlockId(null);
        setParamsBlockId(null);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlockId) {
        event.preventDefault();
        removeStoryBlock(selectedBlockId);
        return;
      }

      if (!selectedBlockId) return;
      const step = event.shiftKey ? 24 : 8;
      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      if (event.key === 'ArrowRight') dx = step;
      if (event.key === 'ArrowUp') dy = -step;
      if (event.key === 'ArrowDown') dy = step;
      if (!dx && !dy) return;
      event.preventDefault();
      setBlocks((current) =>
        current.map((block) =>
          block.id === selectedBlockId ? { ...block, x: block.x + dx, y: block.y + dy } : block,
        ),
      );
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removeStoryBlock, selectedBlockId]);

  const duplicateSelectedBlock = useCallback(() => {
    if (!selectedBlockId) return;
    setBlocks((current) => {
      const source = current.find((block) => block.id === selectedBlockId);
      if (!source) return current;
      const copy: StoryBlock = {
        ...source,
        id: `shot-${Date.now()}`,
        title: `${source.title} copy`,
        status: source.status === 'generating' ? 'ready' : source.status,
        jobId: undefined,
        error: undefined,
        x: source.x + 36,
        y: source.y + 36,
      };
      setSelectedBlockId(copy.id);
      return [...current, copy];
    });
  }, [selectedBlockId]);

  const resetStudioBoard = useCallback(() => {
    setBlocks(SEED_BLOCKS.map((block) => ({ ...block })));
    setProjectTitle('Untitled project');
    setStudioView('storyboard');
    setSelectedBlockId(null);
    setParamsBlockId(null);
    setDraggingBlockId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAssistantDraft('');
    setAssistantNote('画布已重置。用一句话描述今天的故事，重新落到镜头块上。');
  }, []);

  const submitAssistant = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const brief = assistantDraft.trim();
      if (!brief) return;
      const title = brief.length > 28 ? `${brief.slice(0, 28)}…` : brief;

      if (selectedBlockId) {
        setBlocks((current) =>
          current.map((block) =>
            block.id === selectedBlockId
              ? {
                  ...block,
                  title: title || block.title,
                  synopsis: brief,
                  status: block.status === 'generating' ? block.status : 'ready',
                  error: undefined,
                }
              : block,
          ),
        );
        setAssistantNote('已更新当前选中的镜头块。可以继续改写，或点 Gen 生成画面。');
        setAssistantDraft('');
        return;
      }

      setBlocks((current) => {
        const index = current.length + 1;
        const offset = (index % 4) * 40;
        const id = `shot-${Date.now()}`;
        setSelectedBlockId(id);
        return [
          ...current,
          {
            id,
            title: title || `Shot ${index}`,
            synopsis: brief,
            status: 'ready' as const,
            quality: 'standard' as QualityTier,
            x: 160 + offset,
            y: 200 + offset,
          },
        ];
      });
      setAssistantNote('已把这段描述落到一个新镜头块。继续补充下一拍，或去画布上调整位置。');
      setAssistantDraft('');
    },
    [assistantDraft, selectedBlockId],
  );

  const patchBlock = useCallback((blockId: string, patch: Partial<StoryBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  }, []);

  const generateBlock = useCallback(
    async (block: StoryBlock) => {
      if (block.status === 'generating') return;
      patchBlock(block.id, { status: 'generating', error: undefined });
      try {
        const { job } = await jobsApi.create({
          prompt: block.synopsis,
          quality_tier: block.quality,
          project_id: 'untitled-project',
          block_id: block.id,
        });
        patchBlock(block.id, { jobId: job.id });
        await onUserRefresh?.();
        let latest = job;
        for (let attempt = 0; attempt < 8 && latest.status !== 'completed' && latest.status !== 'failed'; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          latest = await jobsApi.get(job.id);
        }
        if (latest.status === 'completed') {
          patchBlock(block.id, {
            status: 'done',
            outputUrl: latest.output_url ?? undefined,
            error: undefined,
          });
        } else {
          patchBlock(block.id, {
            status: 'failed',
            error: latest.error_message ?? 'Generation did not finish',
          });
        }
      } catch (err) {
        patchBlock(block.id, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Generation failed',
        });
      } finally {
        await onUserRefresh?.();
      }
    },
    [onUserRefresh, patchBlock],
  );

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
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="studio-root" data-testid="studio-canvas">
      <header className="studio-topbar">
        <div>
          <p className="eyebrow small">Studio</p>
          <input
            className="studio-project-title"
            value={projectTitle}
            aria-label="Project title"
            onChange={(event) => setProjectTitle(event.target.value)}
          />
        </div>
        <div className="studio-topbar-meta">
          <div className="studio-view-toggle" role="group" aria-label="Studio view">
            <button
              type="button"
              className={studioView === 'workflow' ? 'active' : ''}
              onClick={() => setStudioView('workflow')}
            >
              工作流
            </button>
            <button
              type="button"
              className={studioView === 'storyboard' ? 'active' : ''}
              onClick={() => setStudioView('storyboard')}
            >
              故事板
            </button>
          </div>
          <span className="credit-badge">{user.balance_credits} credits</span>
        </div>
      </header>
      <div className="studio-body">
      <div className={`studio-stage studio-view-${studioView}`}>
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
            <svg className="studio-links" aria-hidden="true" data-testid="studio-links">
              {blocks.slice(0, -1).map((block, index) => {
                const next = blocks[index + 1];
                return (
                  <path
                    key={`${block.id}-${next.id}`}
                    className="studio-link-path"
                    d={linkPath(block, next)}
                  />
                );
              })}
            </svg>
            {blocks.map((block) => (
              <article
                key={block.id}
                className={`story-block${draggingBlockId === block.id ? ' is-dragging' : ''}${selectedBlockId === block.id ? ' is-selected' : ''}`}
                data-testid={`story-block-${block.id}`}
                style={{ left: block.x, top: block.y }}
                onPointerDown={(event) => onBlockPointerDown(event, block)}
                onPointerMove={onBlockPointerMove}
                onPointerUp={onBlockPointerUp}
                onPointerCancel={onBlockPointerUp}
              >
                <div
                  className="story-block-preview"
                  aria-hidden={!block.outputUrl}
                  style={block.outputUrl ? { backgroundImage: `url(${block.outputUrl})` } : undefined}
                />
                <div className="story-block-body">
                  <div className="story-block-head">
                    <input
                      className="story-block-title-input"
                      value={block.title}
                      aria-label="Shot title"
                      onPointerDown={(event) => event.stopPropagation()}
                      onChange={(event) => patchBlock(block.id, { title: event.target.value })}
                    />
                    <span className={`story-block-status status-${block.status}`}>{block.status}</span>
                  </div>
                  <textarea
                    className="story-block-synopsis-input"
                    value={block.synopsis}
                    aria-label="Shot synopsis"
                    rows={3}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => patchBlock(block.id, { synopsis: event.target.value, status: block.status === 'done' ? 'ready' : block.status })}
                  />
                  {block.error && <p className="story-block-error">{block.error}</p>}
                  <div className="story-block-actions">
                    <button
                      type="button"
                      className="story-block-generate-btn"
                      data-testid={`generate-btn-${block.id}`}
                      disabled={block.status === 'generating'}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        void generateBlock(block);
                      }}
                    >
                      {block.status === 'generating' ? '生成中…' : '生成'}
                    </button>
                    <button
                      type="button"
                      className="story-block-params-btn"
                      data-testid={`params-btn-${block.id}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleParams(block.id);
                      }}
                    >
                      参数
                    </button>
                    <button
                      type="button"
                      className="story-block-delete-btn"
                      data-testid={`delete-btn-${block.id}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeStoryBlock(block.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                  {paramsBlockId === block.id && (
                    <div
                      className="story-block-params-panel"
                      data-testid={`params-panel-${block.id}`}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <p className="story-block-params-label">Quality</p>
                      <div className="story-block-params-options">
                        {QUALITY_OPTIONS.map((option) => (
                          <button
                            key={option.tier}
                            type="button"
                            className={block.quality === option.tier ? 'active' : ''}
                            onClick={() => setBlockQuality(block.id, option.tier)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="story-block-params-close"
                        onClick={() => setParamsBlockId(null)}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="studio-zoom-badge" aria-live="polite">
          {zoomPercent}%
        </div>
        <div className="studio-toolbar" role="toolbar" aria-label="Studio tools">
          <button
            type="button"
            className="studio-toolbar-add"
            data-testid="studio-add-block"
            title="Add story block"
            onClick={addStoryBlock}
          >
            +
          </button>
          <button
            type="button"
            data-testid="studio-duplicate-block"
            title="Duplicate selected block"
            disabled={!selectedBlockId}
            onClick={duplicateSelectedBlock}
          >
            Dup
          </button>
          <button
            type="button"
            className="studio-toolbar-generate"
            data-testid="studio-generate-selected"
            title="Generate selected block"
            disabled={
              !selectedBlockId ||
              blocks.find((block) => block.id === selectedBlockId)?.status === 'generating'
            }
            onClick={() => {
              const selected = blocks.find((block) => block.id === selectedBlockId);
              if (selected) void generateBlock(selected);
            }}
          >
            Gen
          </button>
          <span className="studio-toolbar-sep" aria-hidden="true" />
          <button type="button" title="Zoom out" data-testid="studio-zoom-out" onClick={() => zoomBy(-0.1)}>
            −
          </button>
          <button type="button" title="Zoom in" data-testid="studio-zoom-in" onClick={() => zoomBy(0.1)}>
            +
          </button>
          <button type="button" title="Reset zoom" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            Fit
          </button>
          <button
            type="button"
            className="studio-toolbar-reset"
            data-testid="studio-reset-board"
            title="Reset board"
            onClick={resetStudioBoard}
          >
            Reset
          </button>
        </div>
      </div>
      <aside className="studio-assistant" data-testid="studio-assistant">
        <div className="studio-assistant-head">
          <p className="eyebrow small">Assistant</p>
          <h2>新对话</h2>
        </div>
        <p className="studio-assistant-note">{assistantNote}</p>
        <div className="studio-assistant-selection" data-testid="studio-assistant-selection">
          <p className="studio-assistant-label">当前镜头</p>
          {selectedBlock ? (
            <>
              <strong>{selectedBlock.title}</strong>
              <p>{selectedBlock.synopsis}</p>
              <span className={`story-block-status status-${selectedBlock.status}`}>{selectedBlock.status}</span>
            </>
          ) : (
            <p className="studio-assistant-selection-empty">未选中镜头。点选画布上的块，或直接落到新镜头。</p>
          )}
        </div>
        <div className="studio-assistant-templates">
          <p className="studio-assistant-label">用产品模板起稿</p>
          <button type="button" onClick={() => setAssistantDraft('皮克斯风短片：一只迷路的纸飞机找回主人')}>
            皮克斯动画
          </button>
          <button type="button" onClick={() => setAssistantDraft('爆款短片结构：钩子开场 → 反转 → 强结尾')}>
            爆款短片
          </button>
          <button type="button" onClick={() => setAssistantDraft('新中式美学：雨巷灯笼与慢推镜头')}>
            新中式美学
          </button>
        </div>
        <form className="studio-assistant-form" onSubmit={submitAssistant}>
          <label>
            <span className="sr-only">Story brief</span>
            <textarea
              className="studio-assistant-input"
              value={assistantDraft}
              onChange={(event) => setAssistantDraft(event.target.value)}
              placeholder="用 Skill，开启今天的故事…"
              rows={3}
            />
          </label>
          <button className="btn-primary full" type="submit">
            {selectedBlockId ? '更新选中镜头' : '落到画布'}
          </button>
        </form>
      </aside>
      </div>
    </div>
  );
}
