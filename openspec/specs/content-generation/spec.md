# Content Generation Specification

## Purpose

Generate platform-optimized social media content (TikTok script, Instagram post, hashtags) from a user-provided topic and tone via OpenAI GPT-4o-mini, with Zod-validated responses.

## Requirements

### R1: Topic and Tone Input

The system MUST accept a topic string and a tone selection. The topic MUST be 1–200 characters. The tone MUST be one of `'professional' | 'casual' | 'humorous' | 'inspirational'`. Validation MUST run on submit and block API calls on failure.

#### Scenario: Happy path generation

- GIVEN the user enters a valid topic ("Summer skincare routine") and selects tone "casual"
- WHEN they click "Generate"
- THEN the system calls OpenAI with the structured prompt
- AND displays the TikTok script, Instagram post, and hashtags in the success state

#### Scenario: Empty topic submission

- GIVEN the topic input is empty
- WHEN the user clicks "Generate"
- THEN the system shows "Topic is required"
- AND MUST NOT call the OpenAI API

#### Scenario: Topic exceeds 200 characters

- GIVEN the topic is longer than 200 characters
- WHEN the user clicks "Generate"
- THEN the system shows "Topic must be 200 characters or fewer"
- AND MUST NOT call the OpenAI API

### R2: LLM Integration

The system MUST call OpenAI Chat Completions with `gpt-4o-mini` and `response_format: { type: "json_schema" }`. The response MUST be validated against a Zod schema requiring `tiktokScript: string`, `instagramPost: string`, `hashtags: string`.

#### Scenario: Malformed JSON response

- GIVEN the LLM returns a response that fails Zod validation
- WHEN the system attempts to parse it
- THEN the system transitions to the error state
- AND shows "Invalid response format. Please try again."

#### Scenario: Network failure

- GIVEN the API call fails due to a network error or timeout
- WHEN the system receives the error
- THEN the system transitions to the error state
- AND shows "Network error. Check your connection."

#### Scenario: API key not configured

- GIVEN `VITE_OPENAI_API_KEY` is not set
- WHEN the LLM service initializes or a generation is attempted
- THEN the system shows "OpenAI API key not configured."
- AND MUST NOT make API calls

### R3: State Machine

The system MUST manage UI state via a reducer supporting `idle`, `loading`, `success`, and `error`. While in `loading`, the system MUST ignore further submissions.

#### Scenario: Loading state

- GIVEN the user has submitted valid input
- WHEN the API call is in progress
- THEN the submit button is disabled with a loading indicator
- AND the form inputs remain visible

#### Scenario: Double-submit prevention

- GIVEN the system is in the `loading` state
- WHEN the user clicks "Generate" again
- THEN the click is silently ignored
- AND no second API call is made

#### Scenario: Retry after error

- GIVEN the system is in the `error` state
- WHEN the user modifies the topic or tone
- THEN the system resets to `idle`
- AND the user can submit again

### R4: Results Display and Copy

The system MUST display each generated field (TikTok script, Instagram post, hashtags) in a separate card with a copy button.

#### Scenario: Successful clipboard copy

- GIVEN the system is in the `success` state
- WHEN the user clicks a copy button on a result card
- THEN the text is copied to the clipboard
- AND a brief "Copied!" confirmation is shown

#### Scenario: Clipboard API failure

- GIVEN the Clipboard API is unavailable or fails
- WHEN the user clicks a copy button
- THEN the system shows "Could not copy. Select the text manually."
- AND does NOT throw an unhandled error

## Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Loading state MUST render within 200 ms of submission. Requests exceeding 15 s MAY show a timeout indicator. |
| Security | `VITE_OPENAI_API_KEY` MUST be read from environment only. MUST NOT be logged, displayed, or exposed in rendered markup. |
| Accessibility | Loading state MUST use `aria-live="polite"`. Error messages MUST be associated via `aria-describedby`. Copy buttons MUST have `aria-label`. |

## UI States

| State | Visual Description |
|-------|--------------------|
| Idle | Topic input + tone selector + enabled "Generate" button. No results area visible. |
| Loading | Button shows spinner / "Generating…". Inputs remain editable. Optional skeleton placeholders in results area. |
| Success | Three ResultCards (TikTok Script, Instagram Post, Hashtags) each with content text and copy button. Form remains visible for another submission. |
| Error | Error banner or inline message. Form inputs editable and "Generate" button re-enabled. |
