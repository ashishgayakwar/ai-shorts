# Interview Answer Factory Spec

## Objective
Generate two answer variants per interview question:
- Spoken interview answer (`spoken_markdown`)
- Spoken full script (`spoken_full_script`)
- Written reference answer (`written_markdown`)

Both answers must follow the same strict 10-block framework with visible headings.

## Required Framework (Exact Headings)
1. Strategy/Goal
2. Users/Segmentation
3. Problem Definition
4. Options & Decision
5. Architecture/How it works
6. Execution Plan
7. Metrics
8. Risks & Failure Modes
9. Tradeoffs
10. Roadmap

## Hard Constraints
- Every block must exist and be non-empty.
- `Options & Decision` must include at least 2 options and a clear final decision.
- `Execution Plan` must include phased rollout.
- `Metrics` must include Primary, Secondary, and Guardrails.
- `Risks & Failure Modes` must include at least 3 risks and mitigation for each.
- `Tradeoffs` must include at least 2 explicit tradeoffs.
- `spoken_full_script` must be one continuous paragraph with no headings and no bullet markers.
- `spoken_full_script` must have at least 8 sentences and naturally cover all 10 framework blocks.
- `followups` must include `clarification`, `depth`, and `challenge`, with 2-3 items in each list.
- `interviewer_signals` must include:
  - `primary` (core capability tested),
  - `secondary` (2-4 supporting capabilities),
  - `red_flags` (2-4 common candidate mistakes).
- No made-up numbers or factual claims.
- Numbers are allowed only if explicitly present under `Assumptions`.
- If any hard constraint fails, output is rejected or revised.

## Two-Pass Pipeline Contract (No code here)
1. Generator pass produces draft spoken/written outputs and structured blocks.
2. Critic pass scores, checks hard gates, and provides targeted revision instructions.
3. Revision loop may run up to 3 cycles.

## Scoring Gates
- Spoken score must be `>= 90`.
- Written score must be `>= 92`.
- All hard gates must pass.
- Final `passed=true` requires both score thresholds and hard-gate success.

## Output Required for Website Ingestion
- `question_id`
- `category`
- `question`
- `spoken_markdown`
- `spoken_full_script`
- `written_markdown`
- `followups`
- `interviewer_signals`
- `blocks_json`
- `critic_scores`
- `passed`
- `assumptions` (required field for number/fact governance)

## Revision/Failure Rules
- If any block is missing/empty, revise immediately.
- If any unsupported number appears, revise immediately.
- If `spoken_full_script` contains bullets/headings or has fewer than 8 sentences, revise immediately.
- If follow-up lists are missing or have fewer than 2 items, revise immediately.
- If `interviewer_signals` fields are missing or list sizes are invalid, revise immediately.
- If score gate fails, revise up to 3 cycles.
- If still failing after cycle 3, mark `passed=false`.
