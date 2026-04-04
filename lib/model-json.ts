function normalizeFenceWrappedText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractBalancedJsonObject(raw: string): string | null {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let idx = 0; idx < raw.length; idx += 1) {
    const ch = raw[idx];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = idx;
      depth += 1;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start >= 0) {
        return raw.slice(start, idx + 1);
      }
    }
  }

  return null;
}

function candidateJsonStrings(raw: string): string[] {
  const normalized = normalizeFenceWrappedText(raw);
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    candidates.push(trimmed);
  };

  add(normalized);

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    add(normalized.slice(firstBrace, lastBrace + 1));
  }

  add(extractBalancedJsonObject(normalized));
  return candidates;
}

export function parseModelJson(raw: string): unknown {
  let lastError: unknown;

  for (const candidate of candidateJsonStrings(raw)) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Model returned malformed JSON";
  throw new Error(message);
}
