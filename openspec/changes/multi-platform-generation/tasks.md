# Tasks: Multi-Platform Generation (MVP)

> **Phase ID**: `multi-platform-generation`
> **Total estimated lines**: ~574 (555 new + 19 modified)
> **Total files**: 16 (13 new + 3 modified)
> **Delivery strategy**: ask-on-risk (forecast > 400 lines — decision needed before apply)

---

## Phase 1: Foundation

### 1.1 Install dependencies

- **Title**: Add `openai` and `zod` to package.json
- **Description**: Add `openai` and `zod` as runtime dependencies to `package.json`, then run `npm install`.
- **Files to create/modify**:
  - `package.json` (modified — add `"openai": "^4.98.0"` and `"zod": "^3.24.4"` to `dependencies`)
- **Dependencies**: None
- **Estimated lines changed**: 2 modified
- **Test strategy**: N/A (dependency installation)
- **Acceptance criteria**:
  - ✅ `npm ls openai` and `npm ls zod` resolve without errors
  - ✅ `npm run build` compiles successfully (tsc + vite)
  - ✅ No new lint warnings

---

### 1.2 Create types and validation module

- **Title**: Create `src/types/generation.ts` with Zod schema, type exports, and tone constants
- **Description**:
  - ✅ Define `TONE_OPTIONS` as `const` array: `['professional', 'casual', 'humorous', 'inspirational']`
  - ✅ Export `type Tone = (typeof TONE_OPTIONS)[number]`
  - ✅ Define `GenerationResultSchema` as `z.object({ tiktokScript: z.string(), instagramPost: z.string(), hashtags: z.string() })`
  - ✅ Export `type GenerationResult = z.infer<typeof GenerationResultSchema>`
  - ✅ Write tests: valid object parses, missing fields rejected, extra keys rejected, `TONE_OPTIONS` has 4 entries
- **Files to create/modify**:
  - `src/types/generation.ts` (new)
  - `src/types/generation.test.ts` (new)
- **Dependencies**: 1.1 (needs `zod`)
- **Estimated lines changed**: 50 new (20 + 30)
- **Test strategy**:
  - ✅ `GenerationResultSchema` parses a valid `{ tiktokScript, instagramPost, hashtags }` object
  - ✅ Schema rejects objects missing any required field
  - ✅ Schema rejects objects with extra properties (Zod default `.strip()` behavior)
  - ✅ `TONE_OPTIONS` is read-only array of length 4 with expected values
- **Acceptance criteria**:
  - ✅ `npx vitest run src/types/generation.test.ts` passes
  - ✅ TypeScript compiles without errors (no `enum`, no `namespace` violations)

---

## Phase 2: Core Logic

### 2.1 Create prompt template module

- **Title**: Create `src/prompts/generate.ts` with `buildGeneratePrompt` function
- **Description**:
  - ✅ Export `buildGeneratePrompt(topic: string, tone: Tone): ChatCompletionMessageParam[]`
  - ✅ System prompt instructs LLM to generate TikTok script, Instagram post, and hashtags as JSON
  - ✅ User message contains `Topic: {topic}` and `Tone: {tone}`
  - ✅ Write tests: returns array with system + user messages, topic and tone appear in content, empty topic works, special characters handled
- **Files to create/modify**:
  - `src/prompts/generate.ts` (new)
  - `src/prompts/generate.test.ts` (new)
- **Dependencies**: 1.2 (needs `Tone` type)
- **Estimated lines changed**: 55 new (25 + 30)
- **Test strategy**:
  - ✅ Returns `ChatCompletionMessageParam[]` with exactly 2 messages (system + user)
  - ✅ System prompt contains expected instructions
  - ✅ User message contains the provided topic and tone strings
  - ✅ Special characters in topic (quotes, newlines) are embedded correctly
- **Acceptance criteria**:
  - ✅ `npx vitest run src/prompts/generate.test.ts` passes
  - ✅ TypeScript compiles without errors
  - ✅ Uses `import type` for type-only imports per `verbatimModuleSyntax`

---

### 2.2 Create LLM service module

- **Title**: Create `src/services/llm.ts` with `createLLMService` factory
- **Description**:
  - ✅ Export `createLLMService(): { generateContent(messages, signal?): Promise<GenerationResult> }`
  - ✅ On init, check `import.meta.env.VITE_OPENAI_API_KEY` — if missing, return a stub that rejects with "OpenAI API key not configured."
  - ✅ If key present, create `new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`
  - ✅ `generateContent` calls `client.chat.completions.create` with model `gpt-4o-mini`, `response_format: { type: 'json_schema', json_schema: { ... } }`
  - ✅ Parse response: `JSON.parse(content)` then `GenerationResultSchema.parse(...)`
  - ✅ Map errors: `APIConnectionError` → "Network error", `JSON.parse`/`ZodError` → "Invalid response format", `AbortError` → re-throw (let hook handle)
  - ✅ Write tests: valid flow, malformed JSON, missing API key, network error, abort signal
- **Files to create/modify**:
  - `src/services/llm.ts` (new)
  - `src/services/llm.test.ts` (new)
- **Dependencies**: 1.2 (needs `GenerationResultSchema`, `GenerationResult`), 2.1 (needs `ChatCompletionMessageParam`)
- **Estimated lines changed**: 105 new (45 + 60)
- **Test strategy**:
  - ✅ Mock `openai` module (vitest `vi.mock`) to control `chat.completions.create`
  - ✅ Valid JSON response → returns parsed `GenerationResult`
  - ✅ Malformed JSON from LLM → throws "Invalid response format. Please try again."
  - ✅ Zod mismatch (missing fields) → throws "Invalid response format. Please try again."
  - ✅ `APIConnectionError` → throws "Network error. Check your connection."
  - ✅ Missing `VITE_OPENAI_API_KEY` → stub rejects immediately without calling OpenAI
  - ✅ `AbortError` → re-throws so hook can ignore it
- **Acceptance criteria**:
  - ✅ `npx vitest run src/services/llm.test.ts` passes
  - ✅ TypeScript compiles without errors
  - ✅ No actual API calls made during tests (module fully mocked)

---

## Phase 3: State + Integration

### 3.1 Create generation state hook

- **Title**: Create `src/hooks/useGeneration.ts` with `useReducer` state machine
- **Description**:
  - ✅ Define `State` discriminated union: `idle | loading | success{data} | error{message}`
  - ✅ Define `Action`: `GENERATE | SUCCESS{data} | ERROR{message} | RESET`
  - ✅ `reducer`: idle→loading on GENERATE, loading→loading on GENERATE (ignored), loading→success on SUCCESS, loading→error on ERROR, any→idle on RESET
  - ✅ `useGeneration()` returns `{ state, generate, reset }`
  - ✅ `generate(topic, tone)`: validates inputs (non-empty, ≤200 chars), dispatches GENERATE, builds prompt via `buildGeneratePrompt`, calls `service.generateContent`, dispatches SUCCESS or ERROR
  - ✅ AbortController: create per-call, abort previous if new call fires, abort on cleanup via `useEffect`
  - ✅ Create LLM service once with `useRef`
  - ✅ Write tests: all state transitions, double-submit prevention, abort behavior, validation blocking
- **Files to create/modify**:
  - `src/hooks/useGeneration.ts` (new)
  - `src/hooks/useGeneration.test.ts` (new)
- **Dependencies**: 2.1 (prompt builder), 2.2 (LLM service)
- **Estimated lines changed**: 140 new (70 + 70)
- **Test strategy**:
  - ✅ Hook tests with `renderHook` from `@testing-library/react`
  - ✅ Initial state is `{ status: 'idle' }`
  - ✅ SUCCESS transitions to success with data
  - ✅ ERROR transitions to error with message
  - ✅ GENERATE in loading state is silently ignored (state stays loading)
  - ✅ RESET from success/error returns to idle
  - ✅ Input validation: empty topic returns error; topic > 200 chars returns error
- **Acceptance criteria**:
  - ✅ Hook tests pass
  - ✅ TypeScript compiles without errors
  - ✅ Uses `import type` for type-only imports

---

## Phase 4: UI Components

### 4.1 Create GeneratorForm component

- **Title**: Create `GeneratorForm.tsx` with topic input, tone selector, submit, validation, and error display
- **Description**:
  - ✅ Props: `{ onGenerate: (topic: string, tone: Tone) => void; disabled: boolean; error?: string; onReset: () => void }`
  - ✅ Internal `useState` for `topic` and `tone`
  - ✅ On submit: validate `topic.trim().length > 0` (→ "Topic is required") and `topic.length <= 200` (→ "Topic must be 200 characters or fewer"). Block API call on failure.
  - ✅ Tone selector: `<select>` from `TONE_OPTIONS.map`
  - ✅ Disabled state: `disabled` prop disables both inputs and button, button text changes to "Generating…"
  - ✅ Error display: banner with `role="alert"` when `error` prop is set
  - ✅ A11y: `aria-describedby` on error messages
  - ✅ Write tests: happy path submit, empty topic validation, topic > 200 chars, loading state disables, error banner renders, editing after error calls onReset
- **Files to create/modify**:
  - `src/components/GeneratorForm.tsx` (new)
  - `src/components/GeneratorForm.test.tsx` (new)
- **Dependencies**: 1.2 (needs `Tone`, `TONE_OPTIONS`)
- **Estimated lines changed**: 145 new (75 + 70)
- **Test strategy**:
  - ✅ Render with `@testing-library/react`, user interactions with `@testing-library/user-event`
  - ✅ Happy path: fill topic + select tone + click Generate → `onGenerate` called with correct values
  - ✅ Empty topic: click Generate → shows "Topic is required" validation, `onGenerate` NOT called
  - ✅ Topic > 200 chars: type 201 chars → shows "Topic must be 200 characters or fewer", `onGenerate` NOT called
  - ✅ `disabled={true}`: inputs are disabled, button shows "Generating…"
  - ✅ `error` prop set: error banner visible with `role="alert"`
- **Acceptance criteria**:
  - ✅ `npx vitest run src/components/GeneratorForm.test.tsx` passes
  - ✅ TypeScript compiles without errors

---

### 4.2 Create ResultCard component

- **Title**: Create `ResultCard.tsx` with content display and copy-to-clipboard
- **Description**:
  - ✅ Props: `{ label: string; content: string }`
  - ✅ Display label (heading) + content (paragraph) + copy button
  - ✅ Copy button: `aria-label="Copy {label}"`, calls `copyToClipboard()` utility
  - ✅ On success: show "Copied!" for 2 seconds (internal `copied` state + `setTimeout`)
  - ✅ On failure: show "Could not copy. Select the text manually." — do NOT throw
  - ✅ Cleanup timeout on unmount
  - ✅ Write tests: copy success shows confirmation, copy failure shows fallback, content renders correctly
- **Files to create/modify**:
  - `src/components/ResultCard.tsx` (new)
  - `src/components/ResultCard.test.tsx` (new)
  - `src/utils/clipboard.ts` (new) — abstraction for testable clipboard calls
- **Dependencies**: None (standalone presentational component)
- **Estimated lines changed**: 85 new (45 + 35 + 5)
- **Test strategy**:
  - ✅ Mock `copyToClipboard` utility with `vi.mock()`
  - ✅ Copy success: click copy → `copyToClipboard` called with content → "Copied!" appears
  - ✅ Clipboard API rejects → shows fallback message
  - ✅ Clipboard API unavailable → shows fallback message
  - ✅ Renders label and content text correctly
- **Acceptance criteria**:
  - ✅ `npx vitest run src/components/ResultCard.test.tsx` passes
  - ✅ TypeScript compiles without errors

---

### 4.3 Create ResultsPanel component

- **Title**: Create `ResultsPanel.tsx` with 3-card responsive layout
- **Description**:
  - ✅ Props: `{ result: GenerationResult }`
  - ✅ Renders 3 `ResultCard` instances with labels: "TikTok Script", "Instagram Post", "Hashtags"
  - ✅ Maps `result.tiktokScript`, `result.instagramPost`, `result.hashtags` to respective cards
  - ✅ CSS grid: `grid-cols-1 md:grid-cols-3` (Tailwind)
  - ✅ A11y: `aria-live="polite"` on panel container
  - ✅ Write tests: renders 3 cards with correct labels and content, empty strings render gracefully
- **Files to create/modify**:
  - `src/components/ResultsPanel.tsx` (new)
  - `src/components/ResultsPanel.test.tsx` (new)
- **Dependencies**: 4.2 (ResultCard component), 1.2 (`GenerationResult` type)
- **Estimated lines changed**: 50 new (25 + 25)
- **Test strategy**:
  - ✅ Renders 3 cards with correct labels ("TikTok Script", "Instagram Post", "Hashtags")
  - ✅ Each card displays the corresponding content from `result`
  - ✅ Empty strings in result fields render without crashing (blank card content)
  - ✅ `aria-live="polite"` attribute present on container
- **Acceptance criteria**:
  - ✅ `npx vitest run src/components/ResultsPanel.test.tsx` passes
  - ✅ TypeScript compiles without errors

---

## Phase 5: Integration

### 5.1 Wire feature into App.tsx

- **Title**: Replace Vite boilerplate with content generation UI
- **Description**:
  - ✅ Replace the existing boilerplate in `App.tsx` with the content generation feature
  - ✅ Import `useGeneration` hook, `GeneratorForm`, and `ResultsPanel`
  - ✅ Wire hook → state, generate, reset → passed as props to components
  - ✅ Conditional render: idle → show form; loading → show form with disabled inputs; success → show form + ResultsPanel; error → show form + error banner (passed through form)
  - ✅ Removed App.css import and deleted file
- **Files to create/modify**:
  - `src/App.tsx` (modified)
- **Dependencies**: 3.1 (useGeneration hook), 4.1 (GeneratorForm), 4.3 (ResultsPanel)
- **Estimated lines changed**: 15 modified
- **Test strategy**: Manual verification (no App.tsx tests in scope — integration tested via component tests)
- **Acceptance criteria**:
  - ✅ `npm run build` succeeds
  - ✅ App renders without runtime errors
  - ✅ All 4 states (idle, loading, success, error) are reachable

---

### 5.2 Fix `@import "tailwindcss"` in index.css

- **Title**: Move `@import "tailwindcss"` to top of `src/index.css` per CSS spec
- **Description**:
  - ✅ Move `@import "tailwindcss"` from inside the `@media (prefers-color-scheme: dark)` block to the **very top** of `src/index.css`, before all other rules
  - ✅ CSS spec requires `@import` statements before any other declarations
- **Files to create/modify**:
  - `src/index.css` (modified)
- **Dependencies**: None (can be done in parallel with any task)
- **Estimated lines changed**: 2 modified
- **Test strategy**: Visual verification — Tailwind utility classes render correctly after fix
- **Acceptance criteria**:
  - ✅ `@import "tailwindcss"` is the first line in `src/index.css`
  - ✅ `npm run build` succeeds without CSS-related warnings
  - ✅ Tailwind classes apply correctly

---

## Phase 6: Verification

### 6.1 Run all tests and verify build

- **Title**: Run full test suite and production build
- **Description**:
  - ✅ Run `npx vitest run` — 41 tests pass across 7 files
  - ✅ Run `npm run build` — `tsc -b` and `vite build` succeed
  - ✅ Run `npm run lint` — no errors
  - ✅ Remove `src/App.css` — deleted (no longer imported)
  - ✅ Cleaned up unused assets (`react.svg`, `vite.svg`, `hero.png`)
- **Files to create/modify**: None
- **Dependencies**: All tasks 1.1–5.2
- **Estimated lines changed**: 0
- **Test strategy**: Full suite run
- **Acceptance criteria**:
  - ✅ `npx vitest run` exits with code 0 — all tests pass
  - ✅ `npm run build` exits with code 0 — no TypeScript or Vite errors
  - ✅ `npm run lint` exits with code 0 — no new lint violations

---

## Dependency Graph

```
1.1 (deps)
  │
  ▼
1.2 (types + Zod)
  │
  ├──────────────┐
  ▼               ▼
2.1 (prompts)    4.1 (GeneratorForm)
  │               │
  ▼               │
2.2 (LLM svc)     │
  │               │
  └─────┬─────────┘
        ▼
      3.1 (useGeneration hook)
        │
        ├────────────────┐
        ▼                 ▼
      4.2 (ResultCard)   4.3 (ResultsPanel)
        │                 │
        └────────┬────────┘
                 ▼
               5.1 (App.tsx)
                 │
                 ▼
               6.1 (Verification)

5.2 (index.css) — no deps, can be done anytime before 6.1
```

---

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| **Total estimated changed lines** | ~574 (555 new + 19 modified) |
| **Total file count** | 16 (13 new + 3 modified) |
| **Is chained PR recommended?** | **Yes** — exceeds 400-line review budget |
| **Decision needed before apply?** | **Yes** — forecast > 400 lines requires agreement on splitting strategy |

### Lines per phase

| Phase | New files | Modified files | Est. lines |
|-------|-----------|----------------|------------|
| 1. Foundation | 2 | 1 | 52 |
| 2. Core Logic | 4 | 0 | 160 |
| 3. State + Integration | 1 | 0 | 75 |
| 4. UI Components | 6 | 0 | 270 |
| 5. Integration | 0 | 2 | 17 |
| 6. Verification | 0 | 0 | 0 |
| **Total** | **13** | **3** | **~574** |

### Suggested split boundaries (if chained PRs are agreed)

| Chain | Tasks | Est. lines | Focus |
|-------|-------|------------|-------|
| PR 1 | 1.1, 1.2, 2.1, 2.2, 3.1 | ~287 | Foundation + Core Logic + Hook |
| PR 2 | 4.1, 4.2, 4.3, 5.1, 5.2, 6.1 | ~287 | UI + Integration + Verification |
