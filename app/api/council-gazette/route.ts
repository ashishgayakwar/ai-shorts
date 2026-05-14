import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import type { CouncilRequest, CouncilResponse, ModelAnswer, SynthesisResult } from "@/app/council-gazette/types";
import { checkApiRateLimit, ipRateLimitKey } from "@/lib/api-rate-limit";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MODEL_TIMEOUT_MS = 60_000;
const MODEL_MAX_TOKENS = 800;
const GEMINI_MAX_OUTPUT_TOKENS = 4000;

const SYSTEM_PROMPT =
  "You are a brilliant, opinionated analyst. You give direct, specific, well-reasoned answers. No hedging. No generic advice. Every claim must be specific to the question asked. Write like a confident expert filing a dispatch, not a cautious assistant covering its bases.";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});
const deepseekFallback = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

function buildUserPrompt(question: string): string {
  return `Question: ${question}

Write a complete, structured answer to this question. Your answer must:
- Open with a single declarative sentence that captures your core thesis (this becomes the headline — make it punchy, 6-10 words, newspaper headline style)
- Write exactly 380-400 words. Count every word before responding. Do not go under 380 or over 400. This is a hard limit.
- Include specific examples, numbers, or mechanisms — no vague generalities
- End with one concrete measurement or success signal

Format your response as JSON:
{
  "headline": "Your 6-10 word headline here",
  "body": "Your full answer here as plain text with double newlines between paragraphs. Use **bold** for emphasis sparingly."
}

Before returning JSON, count your body word count and confirm it is between 380-400.

Return ONLY the JSON object. No markdown fences. No explanation.`;
}

function buildSynthesisPrompt(question: string, answers: ModelAnswer[]): string {
  const gptAnswer = answers.find((answer) => answer.model === "gpt");
  const deepseekAnswer = answers.find((answer) => answer.model === "deepseek");
  const geminiAnswer = answers.find((answer) => answer.model === "gemini");

  return `You have received three expert answers to this question: "${question}"

GPT-4o said: ${gptAnswer?.body ?? "No response."}
DeepSeek said: ${deepseekAnswer?.body ?? "No response."}
Gemini said: ${geminiAnswer?.body ?? "No response."}

Produce a synthesis as JSON:
{
  "agree": [
    "First point all three agree on — specific, not vague",
    "Second point of consensus",
    "Third point of consensus"
  ],
  "disagree": [
    "First point where they diverge — name which model takes which position",
    "Second point of contention",
    "Third point of divergence"
  ],
  "verdict": "80-120 words. The editor's synthesis. What is the smartest combined reading of all three? What is the sequence of actions? Be specific and direct. Write in formal editorial prose, past tense."
}

Return ONLY the JSON. No markdown.`;
}

function getErrorDetails(error: unknown): { status?: number; message: string } {
  const status = typeof error === "object" && error !== null ? (error as { status?: number }).status : undefined;
  const message =
    typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: string }).message === "string"
      ? (error as { message: string }).message
      : "Unknown upstream error";

  return { status, message };
}

function toPlainErrorMessage(error: unknown): string {
  const { status, message } = getErrorDetails(error);
  if (error instanceof Error && error.name === "AbortError") {
    return "Transmission timed out before filing completed.";
  }
  if (status === 401) return "Authentication failed for this correspondent (401).";
  if (status === 429) return "Rate limit reached for this correspondent (429).";
  if (typeof status === "number" && status >= 500) return `Upstream server error (${status}) from this correspondent.`;
  if (message) return `Dispatch error: ${message.slice(0, 180)}`;
  return "This correspondent did not file in time.";
}

function normalizeJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```") && !trimmed.endsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractJsonObject(raw: string): string {
  const normalized = normalizeJsonText(raw);
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1);
  }
  return normalized;
}

function stripJsonScaffold(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^[\s\n\r\t]*\{[\s\n\r\t]*/, "")
    .replace(/[\s\n\r\t]*\}[\s\n\r\t]*$/, "")
    .replace(/"headline"\s*:\s*"/i, "")
    .replace(/"\s*,\s*"body"\s*:\s*"/i, "\n\n")
    .replace(/"\s*,?\s*$/, "")
    .trim();
}

function firstSentenceHeadline(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Transmission received without clear headline";
  const sentence = cleaned.split(/[.!?]/)[0] || cleaned;
  const words = sentence.trim().split(/\s+/).slice(0, 10);
  return words.join(" ").trim();
}

function salvageAnswerPayload(raw: string): { headline: string; body: string } {
  const normalized = normalizeJsonText(raw);

  const headlineMatch = normalized.match(/"headline"\s*:\s*"([\s\S]*?)"\s*,/i);
  const bodyMatch = normalized.match(/"body"\s*:\s*"([\s\S]*?)"\s*}\s*$/i);

  if (headlineMatch?.[1] && bodyMatch?.[1]) {
    return {
      headline: headlineMatch[1].replace(/\\"/g, "\"").trim(),
      body: bodyMatch[1].replace(/\\"/g, "\"").trim(),
    };
  }

  const scaffoldless = stripJsonScaffold(normalized);
  return {
    headline: firstSentenceHeadline(scaffoldless),
    body: scaffoldless || "This correspondent sent a partial dispatch that could not be fully parsed.",
  };
}

function parseAnswerPayload(raw: string): { headline: string; body: string } {
  try {
    const parsed: unknown = JSON.parse(extractJsonObject(raw));
    if (!isValidAnswer(parsed)) {
      throw new Error("Invalid model payload");
    }
    return parsed;
  } catch {
    const salvaged = salvageAnswerPayload(raw);
    if (!salvaged.body.trim()) {
      throw new Error("Invalid model payload");
    }
    return salvaged;
  }
}

function parseGeminiPayload(raw: string): { headline: string; body: string; strict: boolean } {
  try {
    const parsed: unknown = JSON.parse(extractJsonObject(raw));
    if (!isValidAnswer(parsed)) {
      throw new Error("Gemini response did not match required JSON schema.");
    }
    return {
      headline: parsed.headline.trim(),
      body: parsed.body.trim(),
      strict: true,
    };
  } catch {
    const salvaged = salvageAnswerPayload(raw);
    if (!salvaged.headline.trim() || !salvaged.body.trim()) {
      throw new Error("Gemini returned malformed JSON payload.");
    }
    return {
      headline: salvaged.headline.trim(),
      body: salvaged.body.trim(),
      strict: false,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidAnswer(data: unknown): data is { headline: string; body: string } {
  if (!isRecord(data)) return false;
  return typeof data.headline === "string" && typeof data.body === "string";
}

function isValidSynthesis(data: unknown): data is SynthesisResult {
  if (!isRecord(data)) return false;
  if (!Array.isArray(data.agree) || data.agree.some((item) => typeof item !== "string")) return false;
  if (!Array.isArray(data.disagree) || data.disagree.some((item) => typeof item !== "string")) return false;
  return typeof data.verdict === "string";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGPT(question: string): Promise<ModelAnswer> {
  const start = Date.now();
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: MODEL_MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(question) },
        ],
      },
      { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = parseAnswerPayload(raw);

    return {
      model: "gpt",
      headline: parsed.headline.trim(),
      body: parsed.body.trim(),
      status: "done",
      elapsed: Date.now() - start,
    };
  } catch (error) {
    console.error("Council Gazette GPT call failed", error);
    return {
      model: "gpt",
      headline: "Transmission failed",
      body: toPlainErrorMessage(error),
      status: "error",
      elapsed: Date.now() - start,
    };
  }
}

async function callDeepSeek(question: string): Promise<ModelAnswer> {
  const start = Date.now();
  if (!process.env.DEEPSEEK_API_KEY) {
    return {
      model: "deepseek",
      headline: "Transmission failed",
      body: "DeepSeek API key is missing on server.",
      status: "error",
      elapsed: Date.now() - start,
    };
  }

  try {
    const makePrimary = () =>
      deepseek.chat.completions.create(
        {
          model: "deepseek-chat",
          temperature: 0.8,
          max_tokens: MODEL_MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(question) },
          ],
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );

    const makeFallback = () =>
      deepseekFallback.chat.completions.create(
        {
          model: "deepseek-chat",
          temperature: 0.8,
          max_tokens: MODEL_MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(question) },
          ],
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );

    let completion;
    try {
      completion = await makePrimary();
    } catch {
      completion = await makeFallback();
    }

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = parseAnswerPayload(raw);

    return {
      model: "deepseek",
      headline: parsed.headline.trim(),
      body: parsed.body.trim(),
      status: "done",
      elapsed: Date.now() - start,
    };
  } catch (error) {
    console.error("Council Gazette DeepSeek call failed", error);
    return {
      model: "deepseek",
      headline: "Transmission failed",
      body: toPlainErrorMessage(error),
      status: "error",
      elapsed: Date.now() - start,
    };
  }
}

async function callGemini(question: string): Promise<ModelAnswer> {
  const start = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return {
      model: "gemini",
      headline: "Transmission failed",
      body: "Gemini API key is missing on server.",
      status: "error",
      elapsed: Date.now() - start,
    };
  }

  const runGeminiRequest = async (): Promise<ModelAnswer> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildUserPrompt(question) }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              required: ["headline", "body"],
              properties: {
                headline: { type: "STRING" },
                body: { type: "STRING" },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      },
    );

    const json: unknown = await response.json();
    if (!response.ok) {
      const errorMessage =
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: { message?: string } }).error?.message === "string"
          ? (json as { error: { message: string } }).error.message
          : undefined;
      const message =
        errorMessage ??
        (typeof json === "object" && json !== null && "error" in json
          ? JSON.stringify((json as { error?: unknown }).error)
          : `Gemini API error ${response.status}`);
      console.error("Council Gazette Gemini HTTP error", {
        status: response.status,
        model: "gemini-2.5-flash",
        message,
      });
      throw new Error(message);
    }

    const gemini = json as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const firstCandidate = gemini.candidates?.[0];
    const text =
      firstCandidate?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "{}";
    if (firstCandidate?.finishReason && firstCandidate.finishReason !== "STOP") {
      console.warn("Council Gazette Gemini non-STOP finishReason", {
        finishReason: firstCandidate.finishReason,
      });
    }
    const parsed = parseGeminiPayload(text);
    const bodyWordCount = parsed.body.trim().split(/\s+/).filter(Boolean).length;
    if (bodyWordCount < 150) {
      throw new Error(`Gemini response too short (${bodyWordCount} words). Minimum is 150 words.`);
    }
    if (!parsed.strict) {
      console.warn("Council Gazette Gemini payload required salvage parsing");
    }

    return {
      model: "gemini",
      headline: parsed.headline,
      body: parsed.body,
      status: "done",
      elapsed: Date.now() - start,
    };
  };

  try {
    return await runGeminiRequest();
  } catch (firstError) {
    try {
      await sleep(1000);
      return await runGeminiRequest();
    } catch (error) {
      console.error("Council Gazette Gemini call failed", { firstError, secondError: error });
      return {
        model: "gemini",
        headline: "Transmission failed",
        body: toPlainErrorMessage(error),
        status: "error",
        elapsed: Date.now() - start,
      };
    }
  }
}

function ensureResult(
  settled: PromiseSettledResult<ModelAnswer>,
  model: ModelAnswer["model"]
): ModelAnswer {
  if (settled.status === "fulfilled") {
    return settled.value;
  }

  return {
    model,
    headline: "Transmission failed",
    body: toPlainErrorMessage(settled.reason),
    status: "error",
  };
}

async function buildSynthesis(question: string, answers: ModelAnswer[]): Promise<SynthesisResult> {
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are the editor of The Council Gazette. Compare the three dispatches, identify true consensus vs meaningful disagreements, then deliver an actionable verdict in formal editorial prose.",
          },
          { role: "user", content: buildSynthesisPrompt(question, answers) },
        ],
      },
      { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed: unknown = JSON.parse(normalizeJsonText(raw));
    if (!isValidSynthesis(parsed)) {
      throw new Error("Invalid synthesis payload");
    }

    return {
      agree: parsed.agree.slice(0, 3),
      disagree: parsed.disagree.slice(0, 3),
      verdict: parsed.verdict.trim(),
    };
  } catch {
    return {
      agree: [
        "Consensus could not be computed from all dispatches this cycle.",
        "At least one correspondent failed to deliver a reliable report.",
        "Retrying the same question usually restores full comparison quality.",
      ],
      disagree: [
        "Model reliability varied during this run.",
        "At least one dispatch lacked complete supporting analysis.",
        "Editorial comparison was reduced to partial evidence.",
      ],
      verdict:
        "The editor reported that the council file was incomplete for this edition. A second submission was recommended so all three correspondents could be weighed fairly before issuing a final strategic sequence.",
    };
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = (await request.json()) as CouncilRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  if (question.length < 10) {
    return NextResponse.json({ error: "Question is too short. Min 10 characters." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question is too long. Max 500 characters." }, { status: 400 });
  }

  const rateLimit = await checkApiRateLimit({
    key: ipRateLimitKey(request, "council-gazette"),
    route: "council-gazette",
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const settled = await Promise.allSettled([callGPT(question), callDeepSeek(question), callGemini(question)]);
  const answers: ModelAnswer[] = [
    ensureResult(settled[0], "gpt"),
    ensureResult(settled[1], "deepseek"),
    ensureResult(settled[2], "gemini"),
  ];

  const synthesis = await buildSynthesis(question, answers);

  const response: CouncilResponse = {
    question,
    answers,
    synthesis,
  };

  return NextResponse.json(response, {
    headers: {
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    },
  });
}
