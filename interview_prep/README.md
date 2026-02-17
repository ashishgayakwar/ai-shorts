# Interview Answer Factory (Scaffolding)

This folder contains specification-first scaffolding for the AIPM World Interview Preparation section.

Scope of this scaffold:
- No pipeline code
- No API calls
- No generation loop
- Contracts, prompts, schema, and embedded question bank only

Files:
- `spec.md`: requirements, constraints, scoring gates, and revision policy
- `schema.json`: strict JSON contract with explicit 10-block framework
- `prompts/generator.md`: master generator prompt + canonical schema example + spoken example
- `prompts/critic.md`: master critic prompt + rubric + weak->feedback->improved example
- `questions.py`: embedded question bank as Python list of dicts
- `output_format.md`: website ingestion output contract

Framework headings must remain exactly:
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
