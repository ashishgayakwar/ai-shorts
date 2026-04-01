export const FRAMEWORK_DEFINITIONS = {
  rice: "RICE ranks opportunities by Reach, Impact, Confidence, and Effort to prioritize backlog decisions.",
  moscow:
    "MoSCoW classifies requirements into Must, Should, Could, and Won't to keep scope disciplined.",
  kano: "Kano maps features into basic expectations, performance drivers, and delight factors for user satisfaction.",
  fiveWhys: "5 Whys repeatedly asks why a problem occurs to uncover the true root cause.",
  jtbd: "Jobs to Be Done defines what progress users are hiring the product to achieve in context.",
  prd: "PRD captures the product problem, target user, scope, metrics, risks, and release plan.",
  stories:
    "User Stories express user intent and expected value in a build-ready format for execution teams.",
  acceptance:
    "Acceptance Criteria define testable conditions that must be met before work is considered done.",
  okr: "OKRs link a strategic objective to measurable key results so outcomes can be tracked clearly.",
  northStar:
    "North Star identifies the core value metric that reflects sustained user and business impact.",
  impactEffort:
    "Impact x Effort helps sequence initiatives based on expected value versus implementation cost.",
} as const;

export type FrameworkKey = keyof typeof FRAMEWORK_DEFINITIONS;
