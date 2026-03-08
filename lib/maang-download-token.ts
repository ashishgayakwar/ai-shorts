import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 10 * 60;

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || "maang-download-fallback-secret";
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function createMaangDownloadToken(): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const nonce = Math.random().toString(36).slice(2, 12);
  const payload = `${exp}:${nonce}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest();
  return `${toBase64Url(payload)}.${toBase64Url(sig)}`;
}

export function verifyMaangDownloadToken(token: string): boolean {
  const [payloadEncoded, sigEncoded] = token.split(".");
  if (!payloadEncoded || !sigEncoded) return false;

  const payloadBuffer = fromBase64Url(payloadEncoded);
  const providedSig = fromBase64Url(sigEncoded);
  const expectedSig = createHmac("sha256", getSecret()).update(payloadBuffer).digest();

  if (providedSig.length !== expectedSig.length) return false;
  if (!timingSafeEqual(providedSig, expectedSig)) return false;

  const payload = payloadBuffer.toString("utf8");
  const [expStr] = payload.split(":");
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;

  return exp > Math.floor(Date.now() / 1000);
}
