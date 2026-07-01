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
};
