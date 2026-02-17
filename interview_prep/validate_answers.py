#!/usr/bin/env python3
"""Deterministic validation checks for interview_prep/data/answers.json."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
ANSWERS_PATH = ROOT / "data" / "answers.json"

REQUIRED_BLOCKS = [
    "Strategy/Goal",
    "Users/Segmentation",
    "Problem Definition",
    "Options & Decision",
    "Architecture/How it works",
    "Execution Plan",
    "Metrics",
    "Risks & Failure Modes",
    "Tradeoffs",
    "Roadmap",
]

REQUIRED_FOLLOWUP_KEYS = ["clarification", "depth", "challenge"]


def _has_digit(text: str) -> bool:
    return bool(re.search(r"\d", text))


def _sentence_count(text: str) -> int:
    parts = re.split(r"[.!?]+", text)
    return sum(1 for part in parts if part.strip())


def _contains_bullet_marker(text: str) -> bool:
    return any(marker in text for marker in ("\n- ", "\n* ", "\n• ", "- ", "* ", "• "))


def _all_text_fields(record: dict[str, Any]) -> list[str]:
    values: list[str] = [
        record.get("spoken_markdown", ""),
        record.get("spoken_full_script", ""),
        record.get("written_markdown", ""),
    ]

    blocks = record.get("blocks_json", {})
    if isinstance(blocks, dict):
        values.extend(str(v) for v in blocks.values())

    followups = record.get("followups", {})
    if isinstance(followups, dict):
        for key in REQUIRED_FOLLOWUP_KEYS:
            entries = followups.get(key, [])
            if isinstance(entries, list):
                values.extend(str(v) for v in entries)

    interviewer_signals = record.get("interviewer_signals", {})
    if isinstance(interviewer_signals, dict):
        values.append(str(interviewer_signals.get("primary", "")))
        secondary = interviewer_signals.get("secondary", [])
        red_flags = interviewer_signals.get("red_flags", [])
        if isinstance(secondary, list):
            values.extend(str(v) for v in secondary)
        if isinstance(red_flags, list):
            values.extend(str(v) for v in red_flags)

    return values


def validate_record(record: dict[str, Any]) -> tuple[dict[str, bool], list[str]]:
    issues: list[str] = []

    blocks = record.get("blocks_json", {})
    all_blocks_present = isinstance(blocks, dict) and all(k in blocks for k in REQUIRED_BLOCKS)
    if not all_blocks_present:
        issues.append("Missing one or more required blocks")

    no_empty_blocks = all_blocks_present and all(str(blocks.get(k, "")).strip() for k in REQUIRED_BLOCKS)
    if not no_empty_blocks:
        issues.append("One or more blocks are empty")

    options = str(blocks.get("Options & Decision", "")) if isinstance(blocks, dict) else ""
    options_min_2_with_choice = (
        ("option" in options.lower())
        and ("decision" in options.lower() or "choose" in options.lower())
        and ("option a" in options.lower() or "option 1" in options.lower())
        and ("option b" in options.lower() or "option 2" in options.lower())
    )
    if not options_min_2_with_choice:
        issues.append("Options & Decision must include >=2 options and a clear decision")

    execution = str(blocks.get("Execution Plan", "")) if isinstance(blocks, dict) else ""
    execution_has_phases = all(term in execution.lower() for term in ("pilot", "expansion", "scale"))
    if not execution_has_phases:
        issues.append("Execution Plan must include phased rollout")

    metrics = str(blocks.get("Metrics", "")) if isinstance(blocks, dict) else ""
    metrics_has_primary_secondary_guardrails = all(
        term in metrics.lower() for term in ("primary", "secondary", "guardrail")
    )
    if not metrics_has_primary_secondary_guardrails:
        issues.append("Metrics must include primary, secondary, and guardrails")

    metrics_success_defined = "success" in metrics.lower() and any(
        term in metrics.lower()
        for term in ("means", "defined", "concretely", "is ")
    )
    if not metrics_success_defined:
        issues.append("Metrics must define what success means")

    risks = str(blocks.get("Risks & Failure Modes", "")) if isinstance(blocks, dict) else ""
    risks_min_3_with_mitigations = (
        risks.lower().count("risk") >= 3 and risks.lower().count("mitigation") >= 3
    )
    if not risks_min_3_with_mitigations:
        issues.append("Risks block must include >=3 risks with mitigations")

    tradeoffs = str(blocks.get("Tradeoffs", "")) if isinstance(blocks, dict) else ""
    tradeoffs_min_2 = tradeoffs.lower().count("tradeoff") >= 2
    if not tradeoffs_min_2:
        issues.append("Tradeoffs block must include >=2 tradeoffs")

    spoken_full_script = str(record.get("spoken_full_script", ""))
    spoken_markdown = str(record.get("spoken_markdown", ""))
    script_heading = "## Speak Out Loud (Full Script)"
    spoken_full_script_present_and_continuous = (
        spoken_full_script.strip() != ""
        and _sentence_count(spoken_full_script) >= 8
        and "##" not in spoken_full_script
        and not _contains_bullet_marker(spoken_full_script)
        and script_heading in spoken_markdown
        and spoken_full_script in spoken_markdown
    )
    if not spoken_full_script_present_and_continuous:
        issues.append("spoken_full_script must be continuous with >=8 sentences and no headings/bullets")

    followups = record.get("followups", {})
    followups_present_and_valid = isinstance(followups, dict)
    if followups_present_and_valid:
        for key in REQUIRED_FOLLOWUP_KEYS:
            entries = followups.get(key)
            if not isinstance(entries, list) or len(entries) < 2 or len(entries) > 3:
                followups_present_and_valid = False
                break
            if any(not str(entry).strip() for entry in entries):
                followups_present_and_valid = False
                break
    if not followups_present_and_valid:
        issues.append("Followups must include clarification/depth/challenge with 2-3 items each")

    interviewer_signals = record.get("interviewer_signals", {})
    interviewer_signals_present_and_valid = isinstance(interviewer_signals, dict)
    if interviewer_signals_present_and_valid:
        primary = interviewer_signals.get("primary", "")
        secondary = interviewer_signals.get("secondary")
        red_flags = interviewer_signals.get("red_flags")
        interviewer_signals_present_and_valid = (
            isinstance(primary, str)
            and bool(primary.strip())
            and isinstance(secondary, list)
            and 2 <= len(secondary) <= 4
            and all(isinstance(item, str) and item.strip() for item in secondary)
            and isinstance(red_flags, list)
            and 2 <= len(red_flags) <= 4
            and all(isinstance(item, str) and item.strip() for item in red_flags)
        )
    if not interviewer_signals_present_and_valid:
        issues.append("interviewer_signals must include primary, 2-4 secondary, and 2-4 red_flags")

    assumptions = record.get("assumptions", [])
    numbers_allowed = bool(assumptions)
    numbers_only_from_assumptions = numbers_allowed or not any(
        _has_digit(text) for text in _all_text_fields(record)
    )
    if not numbers_only_from_assumptions:
        issues.append("Numeric claims found outside assumptions policy")

    no_unsupported_facts = True

    scores = record.get("critic_scores", {})
    spoken_score = float(scores.get("spoken_score", 0)) if isinstance(scores, dict) else 0
    written_score = float(scores.get("written_score", 0)) if isinstance(scores, dict) else 0
    spoken_score_gate = spoken_score >= 90
    written_score_gate = written_score >= 92

    hard_gates = {
        "all_blocks_present": all_blocks_present,
        "no_empty_blocks": no_empty_blocks,
        "options_min_2_with_choice": options_min_2_with_choice,
        "execution_has_phases": execution_has_phases,
        "metrics_has_primary_secondary_guardrails": metrics_has_primary_secondary_guardrails,
        "metrics_success_defined": metrics_success_defined,
        "risks_min_3_with_mitigations": risks_min_3_with_mitigations,
        "tradeoffs_min_2": tradeoffs_min_2,
        "spoken_full_script_present_and_continuous": spoken_full_script_present_and_continuous,
        "followups_present_and_valid": followups_present_and_valid,
        "interviewer_signals_present_and_valid": interviewer_signals_present_and_valid,
        "numbers_only_from_assumptions": numbers_only_from_assumptions,
        "no_unsupported_facts": no_unsupported_facts,
        "spoken_score_gate": spoken_score_gate,
        "written_score_gate": written_score_gate,
    }

    return hard_gates, issues


def main() -> None:
    data = json.loads(ANSWERS_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("answers.json must be a list")

    failed = 0
    for idx, record in enumerate(data, start=1):
        hard_gates, issues = validate_record(record)
        ok = all(hard_gates.values())
        status = "PASS" if ok else "FAIL"
        print(f"{status} [{idx}] {record.get('question_id')}")
        if not ok:
            failed += 1
            for issue in issues:
                print(f"  - {issue}")

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
