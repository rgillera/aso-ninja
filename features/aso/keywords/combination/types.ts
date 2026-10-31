export type CombinationChild = {
  term: string;
  volume: number;
  results: number;
  difficulty: number;
  chance: number;
  starred: boolean;
  tracked: boolean;
};

export type CombinationGroup = {
  seed: string;
  expanded: boolean;
  loading: boolean;
  children: CombinationChild[];
  // "Generate more" round in flight for this group.
  loadingMore?: boolean;
  // The last "Generate more" round found nothing new. Session-only, so a
  // later visit can try again.
  exhausted?: boolean;
};

// Combinations kept per seed, across the first batch and every "Generate
// more" round. Each one costs an LLM call share plus a rate-limited Apple
// search, and past ~40 the model mostly rewords what it already gave.
export const MAX_COMBINATIONS_PER_SEED = 40;
export const COMBINATIONS_PER_ROUND = 8;
