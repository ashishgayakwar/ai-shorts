export interface RoastExhibit {
  tag: string;
  verdict: string;
  body: string;
  brutality: 1 | 2 | 3;
}

export interface RoastScore {
  line: string;
  index: number;
}

export interface RoastDefence {
  title: string;
  body: string;
}

export interface RoastResult {
  exhibits: RoastExhibit[];
  score: RoastScore;
  defence: RoastDefence;
}

export interface RoastInput {
  idea: string;
  audience: string | null;
  stage: string | null;
  risk: string | null;
}

export type ChipGroup = "audience" | "stage" | "risk";
