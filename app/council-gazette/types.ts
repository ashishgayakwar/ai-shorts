export interface ModelAnswer {
  model: "gpt" | "deepseek" | "gemini";
  headline: string;
  body: string;
  status: "done" | "error";
  elapsed?: number;
}

export interface SynthesisResult {
  agree: string[];
  disagree: string[];
  verdict: string;
}

export interface CouncilResponse {
  question: string;
  answers: ModelAnswer[];
  synthesis: SynthesisResult;
}

export interface CouncilRequest {
  question: string;
}

export type BodyFontOption = "libre" | "cormorant" | "playfair" | "caveat" | "kalam";
export type BodySizeOption = 16 | 18 | 21 | 24;
