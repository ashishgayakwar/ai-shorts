# PM Resume Screener Process (aipmworld.com)

## 1) What this feature does
- Route: `/pm-resume-screener`
- User inputs:
  - Job Description (text)
  - Resume via tabs:
    - 📎 Upload PDF
    - 📝 Paste Text
- Backend analyzes JD vs `resumeText` using OpenAI and returns:
  - `fitScore` (0-100)
  - `status` (`Strong Match` | `Needs Work` | `Not a Fit`)
  - `matching[]`
  - `missing[]`
  - `oneThingToFixNow`

## 2) End-to-end runtime flow
1. User opens `/pm-resume-screener` and submits the form.
2. If user selects 📎 Upload PDF, client extracts text with `pdfjs-dist` (PDF.js).
3. If extracted text is under 100 chars, UI auto-switches to 📝 Paste Text and shows:
   - `We couldn't read your PDF. Please paste your resume text below instead.`
4. Client sends JSON to `POST /api/pm-resume-screener` with:
   - `jobDescription`
   - `resumeText` (either extracted or pasted)
5. Server validates input lengths and enforces rate-limits (IP + server-derived fingerprint):
   - Max 5 analyses per visitor.
   - 30-second cooldown between requests.
6. Server sends JD + resume text to OpenAI (`gpt-4o`) with JSON-only schema instructions.
7. Server normalizes response and computes status from score thresholds:
   - `>= 75`: Strong Match
   - `45-74`: Needs Work
   - `< 45`: Not a Fit
8. API returns JSON to UI, and UI renders editorial cards.

## 3) Privacy and storage behavior
- Resume PDF is **not persisted**.
- Client-side PDF extraction is in-memory only.
- Resume text is used only for the live request to OpenAI.
- DB only stores hashed rate-limit artifacts:
  - `visitorHash`
  - `ipHash`
  - `fingerprintHash`
  - `createdAt`

## 4) DB-related work
### Prisma model
- Added model `ResumeScreenerRequest` in `prisma/schema.prisma`.
- Fields:
  - `id` (PK)
  - `visitorHash`
  - `ipHash`
  - `fingerprintHash`
  - `createdAt`
- Indexes:
  - `(visitorHash, createdAt)`
  - `(createdAt)`

### Migration
- Added migration:
  - `prisma/migrations/20260325143000_add_resume_screener_request/migration.sql`

### Rate-limit data strategy
- Preferred path: Postgres table `ResumeScreenerRequest` for server-side enforcement.
- Fallback path: if table is missing (`42P01` / relation error), uses in-memory rate-limit map.

## 5) API-related work
### Endpoint
- `POST /api/pm-resume-screener`
- File: `app/api/pm-resume-screener/route.ts`

### Request format
- `application/json`
- Keys:
  - `jobDescription` (string)
  - `resumeText` (string, min 100 chars)

### Response format (success)
```json
{
  "result": {
    "fitScore": 78,
    "status": "Strong Match",
    "matching": ["..."],
    "missing": ["..."],
    "oneThingToFixNow": "..."
  },
  "remaining": 4
}
```

### Key response headers
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `retry-after` (on 429)

### Main status codes
- `200`: analysis success
- `400`: validation failure (`jobDescription` or `resumeText`)
- `429`: cooldown / max limit hit
- `500`: server or OpenAI failure

## 6) Key / env variable related work
### Required
- `OPENAI_API_KEY`
  - Used to call OpenAI for analysis.

### Required for persistent DB rate limiting
- `DATABASE_URL`
  - Used by Prisma/Postgres.

### Used for hashing secret salt
- `NEXTAUTH_SECRET`
  - Used to salt hash generation for IP/fingerprint hashes.
  - Fallback salt chain in code: `NEXTAUTH_SECRET` -> `OPENAI_API_KEY` -> hardcoded fallback.

## 7) Local run process
1. Install deps:
```bash
npm install
```
2. Ensure env values exist in `.env` / `.env.local`:
   - `OPENAI_API_KEY`
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
3. Apply migrations:
```bash
npx prisma migrate deploy
```
4. Run app on custom port:
```bash
npm run dev -- --port 8081
```
5. Open:
- `http://localhost:8081/pm-resume-screener`

## 8) Files added/updated for this feature
- `app/pm-resume-screener/page.tsx`
- `app/pm-resume-screener/pm-resume-screener-client.tsx`
- `app/api/pm-resume-screener/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260325143000_add_resume_screener_request/migration.sql`
- `app/page.tsx` (home card + nav link)
- `app/GlobalFooter.tsx` (footer link)
- `app/sitemap.ts` (route entry)
- `package.json` (added `pdfjs-dist`)
