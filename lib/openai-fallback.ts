import OpenAI from "openai";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldFallbackToDeepSeek(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") return true;
  if (typeof error !== "object" || error === null || !("status" in error)) return false;
  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number") return false;
  return status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
}

type CreateCompletionArgs = {
  openai: OpenAI;
  deepseek: OpenAI | null;
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
  timeoutMs?: number;
  retryDelayMs?: number;
};

export async function createCompletionWithDeepSeekFallback({
  openai,
  deepseek,
  params,
  timeoutMs = 60_000,
  retryDelayMs = 1_000,
}: CreateCompletionArgs) {
  const createWith = (client: OpenAI) =>
    client.chat.completions.create(params, { signal: AbortSignal.timeout(timeoutMs) });

  try {
    return await createWith(openai);
  } catch (firstError) {
    if (!shouldFallbackToDeepSeek(firstError)) throw firstError;

    try {
      await sleep(retryDelayMs);
      return await createWith(openai);
    } catch (secondError) {
      if (!deepseek || !shouldFallbackToDeepSeek(secondError)) {
        throw secondError;
      }
      return createWith(deepseek);
    }
  }
}
