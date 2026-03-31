export interface MetricsResult {
  company: {
    name: string;
    business_type: string;
    summary: string;
    primary_user: string;
    secondary_user: string | null;
    value_event: string;
    assumptions: string[];
    confidence: "high" | "medium" | "low";
  };
  north_star: {
    name: string;
    definition: string;
    formula: string;
    why_this_works: string;
    rejected_alternatives: Array<{
      metric: string;
      why_weaker: string;
    }>;
  };
  input_metrics: Array<{
    name: string;
    description: string;
    owner: string;
  }>;
  guardrails: Array<{
    name: string;
    description: string;
  }>;
  metric_traps: Array<{
    title: string;
    explanation: string;
  }>;
  callouts: {
    north_star_insight: string;
    system_insight: string;
  };
}

export type AnalysisState = "idle" | "loading" | "success" | "error";

export interface ReasoningStep {
  label: string;
  status: "pending" | "active" | "done";
}
