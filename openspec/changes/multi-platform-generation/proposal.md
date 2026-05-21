# Proposal: Multi-Platform Generation (MVP)

## Intent

Solve writer's block for content creators who publish across TikTok and Instagram. One-click generation of platform-optimized content from a topic + tone via OpenAI.

## Scope

### In Scope
- Topic input + tone selector UI (GeneratorForm)
- Prompt template: topic + tone → structured prompt for GPT
- OpenAI Chat Completions with `gpt-4o-mini` + `response_format: "json_schema"`
- Zod-validated response → TikTok script, Instagram post, hashtags
- Results display with copy-to-clipboard (ResultsPanel, ResultCard)
- `useReducer` state machine (idle/loading/success/error)
- Unit tests for services, prompts, and components
- Fix `@import "tailwindcss"` bug in `src/index.css`

### Out of Scope
- Auth, user accounts, persistence, multi-tenant
- Backend proxy (API key in client bundle for MVP)
- Social media publishing (copy + paste only)
- UI polish, animations, responsive beyond basic
- Rate limiting, retry, caching, i18n

## Capabilities

### New Capabilities
- `content-generation`: Accept topic + tone, generate structured multi-platform content via LLM, validate with Zod, display for copy.

### Modified Capabilities
None — first feature, no existing specs.

## Approach

1. **LLM Service** (`src/services/llm.ts`): OpenAI SDK wrapper with `dangerouslyAllowBrowser: true`. Reads `VITE_OPENAI_API_KEY`.
2. **Prompt Template** (`src/prompts/generate.ts`): `buildGeneratePrompt(topic, tone)` returns typed message array. System prompt requests 3 JSON fields.
3. **Types & Validation** (`src/types/generation.ts`): Zod schema for response. Tone as `const` union (`'professional' | 'casual' | 'humorous' | 'inspirational'`).
4. **UI State** (`src/hooks/useGeneration.ts`): `useReducer` with actions `GENERATE`, `SUCCESS`, `ERROR`, `RESET`.
5. **Components**: GeneratorForm (input + select + submit), ResultsPanel (3-result layout), ResultCard (copy button + content).
6. **Bug Fix**: Move `@import "tailwindcss"` outside the media query to top of `src/index.css`.

## Affected Areas

| Area | Impact |
|------|--------|
| `src/index.css` | Modified — move `@import` to top |
| `src/types/generation.ts` | New — Zod schema, tone union, types |
| `src/prompts/generate.ts` | New — prompt builder |
| `src/services/llm.ts` | New — OpenAI SDK wrapper |
| `src/hooks/useGeneration.ts` | New — useReducer state machine |
| `src/components/GeneratorForm.tsx` | New — form UI |
| `src/components/ResultsPanel.tsx` | New — results layout |
| `src/components/ResultCard.tsx` | New — result + copy button |
| `src/test/services/`, `src/test/prompts/`, `src/test/components/` | New — tests |
| `package.json` | Modified — add `openai` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API key exposed in bundle | High | Spend-limit key; backend proxy later |
| LLM returns invalid JSON | Medium | Zod catches; error state shown |
| No existing test patterns | Medium | Keep tests simple (unit, no mocks) |
| OpenAI CORS breaks | Low | Not current issue; defer |

## Rollback Plan

Revert changed/new files via `git checkout` and restore `src/index.css`. No data/migrations to undo.

## Dependencies

- `openai` npm package
- `VITE_OPENAI_API_KEY` env var (spend-limited key)

## Success Criteria

- [ ] `npm run build` succeeds
- [ ] `npx vitest run` passes all new tests
- [ ] LLM returns typed output matching Zod schema
- [ ] UI renders all 4 states: idle, loading, success, error
- [ ] Copy-to-clipboard works for each result
