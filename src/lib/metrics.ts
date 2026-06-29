export function calculateSpeedup(fastMs: number, slowMs: number): number | null {
  if (!Number.isFinite(fastMs) || !Number.isFinite(slowMs)) {
    return null;
  }

  if (fastMs <= 0 || slowMs <= 0) {
    return null;
  }

  return Number((slowMs / fastMs).toFixed(2));
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}
