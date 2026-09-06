# AIInterview.tsx

**Location:** `prsnl/FRONTEND/src/pages/AIInterview.tsx`  
**Type:** Authenticated Page

## What This File Does

Implements a three-step AI mock interview flow: setup (configure interview parameters), interview (answer questions with real-time AI evaluation via text OR voice input with Whisper STT transcription), and report (view overall performance breakdown). Supports roast mode toggle, Hinglish language conversion, voice recording with volume visualization, text-to-speech question reading, and per-question time limits with visual countdown. Includes session recovery on page refresh.

## How It Fits Into The System

- **Triggers:** Rendered at `/interview` route; requires authentication
- **Dependencies:** `api.ts` (startInterview, submitAnswer, submit VoiceAnswer, endInterview, getActiveSession, abandonInterview, listResumes, uploadResume), `CreditContext`, `HinglishToggle`, browser APIs (MediaRecorder, SpeechSynthesis, AudioContext)
- **Dependents:** None — leaf page component

## Code Breakdown

### Three-Step Flow

The page uses a `step` state variable to control which phase is displayed:

#### Step 1: SetupStep

- **Resume Selection:** Dropdown of user's uploaded resumes (fetched from API)
- **Role Input:** Text field for target job role (e.g., "Senior Frontend Engineer")
- **Experience Level:** Select dropdown (Junior, Mid, Senior, Lead)
- **Start Button:** Checks credits, calls `apiStartInterview`, transitions to Step 2

#### Step 2: InterviewStep

**Added May 22, 2026: Voice input, TTS, and timer features**

- **Question Display:** Shows current question text with question number, total, type badge (Theory/MCQ/Code), and time remaining
- **Text-to-Speech:** Automatically reads questions aloud on display; controls to play/stop/replay
- **Answer Input Options:**
  - **Text:** Large textarea for typing the answer
  - **Voice (Theory & MCQ only):** Tap-to-record with volume visualization, auto-stop on 3s silence, Whisper STT transcription, displays what was heard
- **Question Timer:** Per-question countdown (Theory: 2min, MCQ: 1min, Code: 5min) with visual progress ring, color-coded warnings (yellow <20s, red <10s)
- **Submit Answer:** Calls `apiSubmitAnswer` (text) or `apiSubmitVoiceAnswer` (audio blob), receives AI evaluation
- **Evaluation Display:** Shows score, feedback, ideal answer, and transcribed text (for voice answers) with Hinglish toggle
- **Progress:** Visual indicator of questions answered vs total
- **Next/Finish:** Advances to next question or transitions to Step 3

**Voice Answer Flow:**
1. User taps mic button → requests microphone permission
2. Recording starts → volume bar animates based on speech detection
3. Auto-stops after 3s silence OR user taps to stop manually
4. Audio blob sent to `/submit_voice` → Whisper transcribes → LLM evaluates
5. Evaluation returned with `transcribed_answer` field showing what was heard
6. Code questions blocked from voice — must use text input

#### Step 3: ReportStep

- **Overall Score:** Large score display with grade
- **Breakdown:** Per-question scores in a list/grid
- **Qualitative Assessment:** AI-generated summary of strengths and areas for improvement
- **Actions:** "New Interview" (reset to Step 1), "View History" (navigate to history page)

### Active Session Recovery

On mount, calls `apiGetActiveInterviewSession()` to check if there's an unfinished interview. If found, offers to resume from where the user left off (jumps to Step 2 with existing progress) or abandon the session to start fresh. Prevents losing progress on page refresh. Returns 409 Conflict if user tries to start a new interview while an active session exists.

### Custom Hooks

**`useTts()` — Text-to-Speech**
- Manages browser SpeechSynthesis API for reading questions aloud
- Builds full speech text including MCQ options and context
- Selects natural English voices when available
- States: idle, speaking, paused
- Auto-cancels on component unmount

**`useQuestionTimer(limitSecs, onExpire)` — Per-Question Countdown**
- Counts down from question type's time limit (theory: 120s, mcq: 60s, code: 300s)
- Calculates percentage remaining for visual progress ring
- Color-codes: normal (green), warning (<20s, yellow), danger (<10s, red), expired (0s)
- Calls `onExpire` callback when timer hits zero
- Resets when question changes (limitSecs changes)
- Formats time as "M:SS"

**`VoiceAnswerInput` component — Voice Recording**
- Manages MediaRecorder API for audio capture
- Requests microphone permission on first tap
- Displays real-time volume visualization using AudioContext + AnalyserNode
- Auto-detects speech vs silence using frequency analysis (focuses on voice range 80-3400 Hz)
- Auto-stops after 3s silence post-speech OR 25s if never spoke
- Picks best supported MIME type (webm/opus preferred, falls back to ogg/mp4)
- Creates temporary blob with proper MIME type for Whisper API
- States: idle, requesting, recording, processing, done, denied

### Roast Mode

Toggle that changes the AI's feedback tone to brutally honest and humorous. Set at session start and cannot be changed mid-interview. Affects both question generation and answer evaluation. Sends `roast_mode: true` flag to `/start` endpoint. Currently enabled in UI with flame emoji and red styling.

### Hinglish Toggle

`HinglishToggle` component on feedback and ideal answer text. Converts English to Hinglish (Hindi-English mix) via backend `/utils/hinglish` API call. Useful for Indian users who prefer mixed-language feedback. Each evaluation has two separate toggles (one for feedback, one for ideal answer) with independent conversion state.

### Credit Handling

- Credits are checked before starting a new interview (Step 1 → Step 2 transition)
- Uses `canUse('interview')` and `deductLocal('interview')`
- Individual question submissions don't cost additional credits — the whole session is one charge

## Things To Know Before Editing

- **The active session check on mount is critical** — without it, refreshing the page loses all progress. The backend Redis session has a 45min TTL.
- **Roast mode and language are set at session start** — cannot be changed mid-interview. They're encoded in the session on the backend.
- **The interview session is stateful on the backend** — question order and progress are server-managed in Redis.
- **If the user closes the tab mid-interview**, the session remains active in Redis and can be resumed. Offer abandon option on resume.
- **Credit deduction happens at session start (25 credits)**, not at report generation or per-answer.
- **Voice recording is browser-dependent** — WebM/Opus works in Chrome/Edge, OGG/Opus in Firefox, MP4 in Safari. Auto-detection via `MediaRecorder.isTypeSupported()`.
- **Volume visualization uses AudioContext** — analyzes frequency data in the 0-40% bin range (voice frequencies). Higher bins are ignored (noise).
- **TTS voice selection is best-effort** — prefers Google/Natural/Samantha/Daniel voices but falls back to system default if unavailable.
- **Timer expiration doesn't auto-submit** — it just calls `onExpire` which can be wired to auto-skip or show a warning. Currently just a visual indicator.
- **Code questions cannot use voice** — the backend rejects voice submissions for type="code" with 400 error.
- **MCQ options are read aloud by TTS** — they're appended to the question text as "Option A: ..., Option B: ..." for accessibility.
- **The step transitions are one-way during an active session** (can't go back to setup mid-interview) — but can abandon and restart.
- **Whisper transcription creates temp files** — they're cleaned up in a `finally` block on the backend to prevent orphaned files.
- **Silence detection threshold is 15 (out of 255)** — tuned for typical microphone sensitivity. Too low causes false positives, too high misses quiet speakers.
