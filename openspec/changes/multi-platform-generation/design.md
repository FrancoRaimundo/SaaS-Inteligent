# Design: Multi-Platform Generation (MVP)

## Technical Approach

Single-page feature wired into `App.tsx`. A hook (`useGeneration`) owns a `useReducer` state machine. Components are pure presentational — they receive state and callbacks as props. The LLM service is a thin wrapper around `openai` SDK with `dangerouslyAllowBrowser: true`. Prompt templates are exported functions returning typed `ChatCompletionMessageParam[]`. Zod validates every LLM response at the type level and at runtime.

---

## Architecture Overview

### Component Tree

```
App
 ├── GeneratorForm  (topic input, tone select, submit)
 └── ResultsPanel   (visible only on success)
      ├── ResultCard  (tiktokScript)
      ├── ResultCard  (instagramPost)
      └── ResultCard  (hashtags)
```

App owns the hook → hook returns `{ state, generate, reset }` → passed as props down.

### Module Map

```
src/
 ├── types/generation.ts      Zod schema + type exports
 ├── prompts/generate.ts      buildGeneratePrompt(topic, tone)
 ├── services/llm.ts          createLLMService(), generateContent()
 ├── hooks/useGeneration.ts   useReducer: idle | loading | success | error
 ├── components/
 │   ├── GeneratorForm.tsx
 │   ├── ResultsPanel.tsx
 │   └── ResultCard.tsx
 ├── index.css                (fix: move @import "tailwindcss" to top)
 ├── App.tsx                  (wire everything)
 └── test/                    (mirrors src structure)
     ├── types/generation.test.ts
     ├── prompts/generate.test.ts
     ├── services/llm.test.ts
     └── components/GeneratorForm.test.tsx
         components/ResultsPanel.test.tsx
         components/ResultCard.test.tsx
```

---

## Architecture Decisions

### D1: `useReducer` over `useState` or Redux

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `useState` | Simple but spread logic across callbacks | ❌ |
| `useReducer` | Single dispatch, state machine enforced by TS discriminated union | ✅ |
| Redux/Zustand | Overkill for single-feature state | ❌ |

### D2: Props-down pattern over context

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Props drilling | Verbose but explicit and testable | ✅ |
| React Context | Hides dependencies, harder to test in isolation | ❌ |

### D3: `openai` with `dangerouslyAllowBrowser` vs backend proxy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Browser direct | API key exposed, but zero backend cost for MVP | ✅ |
| Backend proxy | Secure, but scope explosion | ❌ (out of scope per proposal) |

### D4: Tone as `const` union type over `enum`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `enum` | Blocked by `erasableSyntaxOnly: true` | ❌ |
| `const` type union + `as const` array | Works with TS 6 strict mode | ✅ |

---

## File-by-File Specification

### `src/types/generation.ts`

| Property | Value |
|----------|-------|
| **Exports** | `Tone` (type), `GenerationResult` (type), `GenerationResultSchema` (Zod object), `TONE_OPTIONS` (readonly array) |
| **Types** | `type Tone = 'professional' \| 'casual' \| 'humorous' \| 'inspirational'` |
| **Schema** | `z.object({ tiktokScript: z.string(), instagramPost: z.string(), hashtags: z.string() })` |
| **Dependencies** | `zod` |
| **Responsibility** | Single source of truth for response shape |
| **NOT here** | Prompt logic, API calls, UI state types |

### `src/prompts/generate.ts`

| Property | Value |
|----------|-------|
| **Exports** | `buildGeneratePrompt(topic: string, tone: Tone)` |
| **Returns** | `ChatCompletionMessageParam[]` (system + user) |
| **Dependencies** | `openai/resources/chat/completions`, `types/generation` |
| **Responsibility** | Build typed message array for the LLM call |
| **NOT here** | Zod validation, API calls, UI state |

### `src/services/llm.ts`

| Property | Value |
|----------|-------|
| **Exports** | `createLLMService()` |
| **Returns** | `{ generateContent(prompt, signal?): Promise<GenerationResult> }` |
| **Dependencies** | `openai`, `types/generation` |
| **Responsibility** | Init client (one-time), call API, validate, return typed result |
| **NOT here** | UI state, prompt text, form logic |

### `src/hooks/useGeneration.ts`

| Property | Value |
|----------|-------|
| **Exports** | `useGeneration()` |
| **Returns** | `{ state: State, generate: (topic, tone) => void, reset: () => void }` |
| **Dependencies** | `react`, `services/llm`, `types/generation`, `prompts/generate` |
| **Responsibility** | Orchestrate generate flow: validate → build prompt → call service → dispatch |
| **NOT here** | JSX, DOM manipulation, form state |

### `src/components/GeneratorForm.tsx`

| Property | Value |
|----------|-------|
| **Props** | `{ onGenerate: (topic: string, tone: Tone) => void; disabled: boolean; error?: string }` |
| **Internal** | Local `useState` for topic + tone; validation in submit handler |
| **Dependencies** | `types/generation`, `react` |
| **Responsibility** | Render inputs, validate on submit, call `onGenerate` |
| **NOT here** | API calls, result display |

### `src/components/ResultsPanel.tsx`

| Property | Value |
|----------|-------|
| **Props** | `{ result: GenerationResult }` |
| **Dependencies** | `types/generation`, `ResultCard` |
| **Responsibility** | Layout three ResultCards with labels |
| **NOT here** | Form state, API calls |

### `src/components/ResultCard.tsx`

| Property | Value |
|----------|-------|
| **Props** | `{ label: string; content: string }` |
| **Internal** | `useState` for "Copied!" confirmation |
| **Dependencies** | `react` |
| **Responsibility** | Display content + copy button with fallback |
| **NOT here** | API calls, multiple cards, orchestration |

---

## Data Flow

```
User clicks "Generate"
   │
   ▼
GeneratorForm.onSubmit()
   ├─ Validate topic (1-200 chars, non-empty) ──✗──→ show inline error (no dispatch)
   │
   └─ ✓ → onGenerate(topic, tone)
              │
              ▼
         useGeneration.generate()
              ├─ dispatch({ type: 'GENERATE' })  → state = { status: 'loading' }
              ├─ const prompt = buildGeneratePrompt(topic, tone)
              ├─ const controller = new AbortController()
              ├─ service.generateContent(prompt, controller.signal)
              │        │
              │        ▼
              │   OpenAI Chat Completions (gpt-4o-mini, response_format: json_schema)
              │        │
              │        ▼
              │   Zod.parse(response.choices[0].message.content)
              │        │
              │   ┌────┴───┐
              │   │ valid  │ invalid ──→ dispatch({ type: 'ERROR', message })
              │   └────┬───┘
              │        ▼
              │   dispatch({ type: 'SUCCESS', data })
              │
              ▼
         Re-render:
           loading → button disabled + spinner
           success → ResultsPanel appears with 3 ResultCards
           error   → error banner + form re-enabled
```

---

## State Machine

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GenerationResult }
  | { status: 'error'; message: string }

type Action =
  | { type: 'GENERATE' }
  | { type: 'SUCCESS'; data: GenerationResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }
```

| Current | Action | Next | Side Effect |
|---------|--------|------|-------------|
| `idle` | GENERATE | `loading` | N/A |
| `loading` | GENERATE | `loading` | **Ignored** (double-submit prevention) |
| `loading` | SUCCESS | `success` | Holds `data` |
| `loading` | ERROR | `error` | Holds `message` |
| `success` | RESET | `idle` | Clears data |
| `error` | RESET | `idle` | Clears error |
| `error` | GENERATE | `loading` | Re-try (user modifies topic/tone triggers RESET first) |

RESET fires on input change while in success/error (detected via form blur or change).

---

## Prompt Template Design

### System Prompt

```
You are a social media content creator. Given a topic and a tone,
generate platform-optimized content for TikTok and Instagram.

Respond with valid JSON using this exact schema:
{
  "tiktokScript": "string — a 30-60 second TikTok script with hooks, body, and CTA in the requested tone",
  "instagramPost": "string — an Instagram caption optimized for engagement in the requested tone",
  "hashtags": "string — a comma-separated list of 5-10 relevant hashtags"
}
```

### User Message Template

```
Topic: {topic}
Tone: {tone}
```

### JSON Schema (passed to `response_format`)

```json
{
  "name": "generated_content",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "tiktokScript": { "type": "string" },
      "instagramPost": { "type": "string" },
      "hashtags": { "type": "string" }
    },
    "required": ["tiktokScript", "instagramPost", "hashtags"],
    "additionalProperties": false
  }
}
```

### Zod Schema (for runtime validation)

```typescript
const GenerationResultSchema = z.object({
  tiktokScript: z.string(),
  instagramPost: z.string(),
  hashtags: z.string(),
})
```

---

## LLM Service Design

### Initialization

```typescript
import OpenAI from 'openai'

export function createLLMService() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    return {
      generateContent: () =>
        Promise.reject(new Error('OpenAI API key not configured.')),
    }
  }

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  return {
    async generateContent(
      messages: ChatCompletionMessageParam[],
      signal?: AbortSignal,
    ): Promise<GenerationResult> {
      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'generated_content',
              strict: true,
              schema: { /* see above */ },
            },
          },
        },
        { signal },
      )

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('Empty response from LLM.')

      return GenerationResultSchema.parse(JSON.parse(content))
    },
  }
}
```

### Error handling

| Error Type | Detection | User Message |
|-----------|-----------|-------------|
| No API key | `!import.meta.env.VITE_OPENAI_API_KEY` | "OpenAI API key not configured." |
| Network failure | `openai` SDK throws `APIConnectionError` or timeout | "Network error. Check your connection." |
| Malformed JSON | `JSON.parse` throws | "Invalid response format. Please try again." |
| Zod validation | `parse` throws `ZodError` | "Invalid response format. Please try again." |
| Aborted | `AbortError` | Ignored (no state change) |

### Abort signal

`useGeneration` creates an `AbortController` per generate call and stores it. If a new generate fires while another is in flight, it aborts the previous controller first. On unmount, the controller is aborted in a `useEffect` cleanup.

---

## Component Design

### GeneratorForm

- **Internal state**: `topic: string`, `tone: Tone` via `useState`
- **Validation**: On submit — check `topic.trim().length > 0` and `topic.length <= 200`. Show inline errors below topic input.
- **Tone selector**: `<select>` rendering `TONE_OPTIONS.map`
- **Disabled**: When `disabled` prop is true (loading state), disable both inputs and button, button shows "Generating…"
- **Error display**: When `error` prop is set, show banner with `role="alert"` and `aria-describedby` association

### ResultsPanel

- **Layout**: CSS grid (1 column on mobile, 3 on desktop via Tailwind `grid-cols-1 md:grid-cols-3`)
- **Renders**: Three `<ResultCard>` instances with `label` and computed `content` from `result` prop
- **Labels**: "TikTok Script", "Instagram Post", "Hashtags"
- **A11y**: `aria-live="polite"` on the panel container

### ResultCard

- **Copy button**: `<button>` with `aria-label="Copy {label}"`. Calls `navigator.clipboard.writeText(content)`
- **Success feedback**: On copy, set internal state `copied: true`, show "Copied!" text for 2 seconds via `setTimeout`, then reset
- **Fallback**: If `navigator.clipboard` is unavailable or the promise rejects, show "Could not copy. Select the text manually." — do NOT throw
- **Loading style**: Skeleton placeholder (Tailwind `animate-pulse` + `bg-gray-200`) while `disabled` prop is true

---

## Testing Strategy

| File | What to Mock | Key Assertions | Edge Cases |
|------|-------------|----------------|------------|
| `types/generation.test.ts` | Nothing | Schema parses valid objects, rejects missing/extra fields | Empty strings, null, extra keys |
| `prompts/generate.test.ts` | Nothing | Returns correct message array shape, system prompt contains topic and tone | Empty topic, special chars |
| `services/llm.test.ts` | `openai` `chat.completions.create` | Returns parsed result on valid JSON, throws on invalid JSON/network error/auth error | Zod mismatch, empty response, abort signal |
| `GeneratorForm.test.tsx` | `onGenerate` callback | Calls onGenerate with valid values; blocks on empty/too-long topic; shows validation errors | Empty input, 201-char topic, loading disables, error banner |
| `ResultsPanel.test.tsx` | Nothing | Renders 3 cards with correct labels + content | null/empty strings in result |
| `ResultCard.test.tsx` | `navigator.clipboard.writeText` | Copies on click, shows confirmation, shows fallback on API failure | Clipboard API unavailable, reject promise |

---

## CSS Bug Fix

**File**: `src/index.css`

**Current** (broken):
```css
@media (prefers-color-scheme: dark) {
@import "tailwindcss";
```

**Fix**: Move `@import "tailwindcss"` to the **top of the file**, outside all media queries, as required by CSS spec.

---

## Open Questions

- None. All decisions are resolved by proposal + spec.
