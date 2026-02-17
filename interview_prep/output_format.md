# Output Format for AIPM World Ingestion

Each generated record must be a JSON object with the fields below.

## Required Fields
- `question_id` (string)
- `category` (string)
- `question` (string)
- `assumptions` (array of strings; required even if empty)
- `spoken_markdown` (string)
- `spoken_full_script` (string, continuous spoken paragraph)
- `written_markdown` (string)
- `followups` (object with `clarification`, `depth`, `challenge`)
- `interviewer_signals` (object with `primary`, `secondary`, `red_flags`)
- `blocks_json` (object with exact 10 block keys)
- `critic_scores` (object with score + hard-gate details)
- `passed` (boolean)

## 10 Required Block Keys (Exact)
- `Strategy/Goal`
- `Users/Segmentation`
- `Problem Definition`
- `Options & Decision`
- `Architecture/How it works`
- `Execution Plan`
- `Metrics`
- `Risks & Failure Modes`
- `Tradeoffs`
- `Roadmap`

## Gate Expectations
- Spoken score `>= 90`
- Written score `>= 92`
- All hard gates `true`
- If not, `passed=false`

## Example (Abbreviated)
```json
{
  "question_id": "q_product_001",
  "category": "product_design",
  "question": "How would you improve onboarding for first-time AI PM users?",
  "assumptions": [],
  "spoken_markdown": "## Strategy/Goal\\n...\\n## Users/Segmentation\\n...\\n## Problem Definition\\n...\\n## Options & Decision\\n...\\n## Architecture/How it works\\n...\\n## Execution Plan\\n...\\n## Metrics\\n...\\n## Risks & Failure Modes\\n...\\n## Tradeoffs\\n...\\n## Roadmap\\n...\\n\\n## Speak Out Loud (Full Script)\\n...",
  "spoken_full_script": "...",
  "written_markdown": "## Strategy/Goal\\n...\\n## Users/Segmentation\\n...\\n## Problem Definition\\n...\\n## Options & Decision\\n...\\n## Architecture/How it works\\n...\\n## Execution Plan\\n...\\n## Metrics\\n...\\n## Risks & Failure Modes\\n...\\n## Tradeoffs\\n...\\n## Roadmap\\n...",
  "followups": {
    "clarification": ["...", "..."],
    "depth": ["...", "..."],
    "challenge": ["...", "..."]
  },
  "interviewer_signals": {
    "primary": "...",
    "secondary": ["...", "..."],
    "red_flags": ["...", "..."]
  },
  "blocks_json": {
    "Strategy/Goal": "...",
    "Users/Segmentation": "...",
    "Problem Definition": "...",
    "Options & Decision": "...",
    "Architecture/How it works": "...",
    "Execution Plan": "...",
    "Metrics": "...",
    "Risks & Failure Modes": "...",
    "Tradeoffs": "...",
    "Roadmap": "..."
  },
  "critic_scores": {
    "spoken_score": 92,
    "written_score": 94,
    "cycle_count": 2,
    "hard_gates": {
      "all_blocks_present": true,
      "no_empty_blocks": true,
      "options_min_2_with_choice": true,
      "execution_has_phases": true,
      "metrics_has_primary_secondary_guardrails": true,
      "metrics_success_defined": true,
      "risks_min_3_with_mitigations": true,
      "tradeoffs_min_2": true,
      "spoken_full_script_present_and_continuous": true,
      "followups_present_and_valid": true,
      "interviewer_signals_present_and_valid": true,
      "numbers_only_from_assumptions": true,
      "no_unsupported_facts": true,
      "spoken_score_gate": true,
      "written_score_gate": true
    },
    "issues": []
  },
  "passed": true
}
```
