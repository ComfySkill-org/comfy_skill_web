import type { QualityTier } from '../api/client';

export type PersistedStoryBlock = {
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

export type PersistedStudioState = {
  projectTitle: string;
  studioView: 'storyboard' | 'workflow';
  blocks: PersistedStoryBlock[];
};

const STORAGE_KEY = 'comfyskill.studio.board.v1';

export function loadStudioState(): PersistedStudioState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedStudioState;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStudioState(state: PersistedStudioState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures in local MVP.
  }
}
