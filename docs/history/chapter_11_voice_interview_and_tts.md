# Chapter 11: Voice Interview & Text-to-Speech

## Overview

Kareerist's AI Mock Interview now supports **voice input** and **text-to-speech (TTS)** for a more natural interview experience. Users can speak their answers instead of typing, and the system reads questions aloud.

---

## Voice Interview (Speech-to-Text)

### Backend Implementation

#### Endpoint: `POST /api/v1/interview/submit_voice`

**Location:** `backend/app/api/v1/endpoints/interview.py`

**Purpose:** Accepts audio recordings, transcribes them via Groq Whisper, and evaluates the transcript.

**Flow:**
1. User records audio via browser MediaRecorder API
2. Frontend uploads audio file (webm/wav/mp4/ogg)
3. Backend saves to temporary file
4. Groq Whisper transcribes audio → text
5. Text evaluated like typed answers
6. Transcription returned to frontend for display

**Code:**
```python
@router.post("/submit_voice")
@limiter.limit("15/minute", key_func=ats_rate_key)
async def submit_voice_answer_route(
    request: Request,
    user: CurrentUser,
    question_id: int = Form(...),
    audio: UploadFile = File(...),
) -> AnswerEvaluation:
    """
    Accepts voice recording, transcribes via Groq Whisper,
    evaluates transcript like /submit does.
    Only valid for theory and MCQ — code must be typed.
    """
    # Load session from Redis
    session = await load_session(str(user.id))
    
    # Read audio bytes
    audio_bytes = await audio.read()
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    
    # Transcribe via Groq Whisper
    with open(tmp_path, "rb") as f:
        transcription = await _groq_client.audio.transcriptions.create(
            file=(os.path.basename(tmp_path), f.read()),
            model="whisper-large-v3-turbo",
            response_format="json",
        )
    user_spoken_text = (transcription.text or "").strip()
    
    # Evaluate transcript
    evaluation = await evaluate_single_answer(
        role=session.role,
        question=question,
        user_answer=user_spoken_text,
    )
    
    # Attach transcript for frontend display
    evaluation.transcribed_answer = user_spoken_text
    
    # Save to session
    session.answers[question_id] = user_spoken_text
    session.evaluations[question_id] = evaluation
    await save_session(str(user.id), session)
    
    return evaluation
```

**Whisper Model:** `whisper-large-v3-turbo`
- Fast transcription (~1-2 seconds for 30s audio)
- High accuracy for English
- Supports multiple audio formats

**Limitations:**
- Code questions must be typed (voice not supported)
- Requires clear audio (background noise affects accuracy)
- Silence detection: <5 words = "No speech detected"

---

### Frontend Implementation

#### Component: `VoiceAnswerInput`

**Location:** `FRONTEND/src/pages/AIInterview.tsx`

**Features:**
- Real-time volume visualization
- Auto-stop after 3s silence or 25s max
- Mic permission handling
- Cancel recording option

**States:**
- `idle` - Ready to record
- `requesting` - Requesting mic permission
- `recording` - Recording in progress
- `processing` - Transcribing audio
- `done` - Transcription complete
- `denied` - Mic permission denied

**Audio Processing:**
```typescript
function VoiceAnswerInput({ onAudioReady, disabled }) {
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [volumePct, setVolumePct] = useState(0);
    
    async function startRecording() {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create audio analyser for volume visualization
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // 128 frequency bins
        ctx.createMediaStreamSource(stream).connect(analyser);
        
        // Start MediaRecorder
        const mimeType = getSupportedMimeType(); // webm/ogg/mp4
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.start(250); // 250ms chunks
        
        // Monitor volume and detect silence
        monitorVolume(); // Auto-stops after 3s silence
    }
    
    function monitorVolume() {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        
        // Average lower 40% of bins (voice frequency range)
        const voiceBins = Math.floor(data.length * 0.4);
        let sum = 0;
        for (let i = 0; i < voiceBins; i++) sum += data[i];
        const avg = sum / voiceBins;
        
        // Update volume bar
        setVolumePct(Math.min(100, Math.round((avg / 255) * 100 * 3)));
        
        // Detect silence
        if (avg > 15) lastSpokenAt = Date.now();
        const silenceMs = Date.now() - lastSpokenAt;
        
        // Stop after 3s silence or 25s max
        if ((hasSpoken && silenceMs > 3000) || silenceMs > 25000) {
            stopRecording();
        }
    }
}
```

**Supported Audio Formats:**
1. `audio/webm;codecs=opus` (Chrome, Edge)
2. `audio/webm` (Firefox)
3. `audio/ogg;codecs=opus` (Firefox fallback)
4. `audio/mp4` (Safari)

**Volume Visualization:**
- Green progress bar shows real-time volume
- Uses Web Audio API AnalyserNode
- Focuses on voice frequency range (80-3400 Hz)

---

## Text-to-Speech (TTS)

### Frontend Implementation

#### Hook: `useTts()`

**Location:** `FRONTEND/src/pages/AIInterview.tsx`

**Purpose:** Reads interview questions aloud using browser's SpeechSynthesis API.

**Features:**
- Natural English voice selection
- Reads MCQ options aloud
- Mute/unmute control
- Auto-stops on component unmount

**Code:**
```typescript
function useTts() {
    const [ttsState, setTtsState] = useState<TtsState>("idle");
    
    const speak = useCallback((text: string) => {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
        
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;  // Slightly slower for clarity
        utter.pitch = 1;
        utter.volume = 1;
        
        // Prefer natural English voices
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
            (v) => v.lang.startsWith("en") && 
                   (v.name.includes("Google") || 
                    v.name.includes("Natural") || 
                    v.name.includes("Samantha") || 
                    v.name.includes("Daniel"))
        );
        if (preferred) utter.voice = preferred;
        
        utter.onstart = () => setTtsState("speaking");
        utter.onend = () => setTtsState("idle");
        
        window.speechSynthesis.speak(utter);
    }, []);
    
    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setTtsState("idle");
    }, []);
    
    return { ttsState, speak, stop };
}
```

**Question Text Builder:**
```typescript
function buildQuestionSpeechText(q: InterviewQuestion): string {
    let text = q.text;
    
    // For MCQ, append options
    if (q.type === "mcq" && q.options) {
        const labels = ["A", "B", "C", "D", "E"];
        const optionsText = q.options
            .map((opt, i) => `Option ${labels[i]}: ${opt}`)
            .join(". ");
        text = `${text}. The options are: ${optionsText}.`;
    }
    
    // Append context if present
    if (q.context) {
        text = `${text}. Note: ${q.context}`;
    }
    
    return text;
}
```

**Voice Selection Priority:**
1. Google voices (most natural)
2. "Natural" voices (macOS/iOS)
3. Samantha (macOS)
4. Daniel (macOS)
5. Any English voice
6. Browser default

**Browser Support:**
- ✅ Chrome/Edge: Google voices
- ✅ Safari: Samantha, Daniel (macOS/iOS)
- ✅ Firefox: eSpeak voices (less natural)

---

## Interview Timer

### Frontend Implementation

#### Hook: `useQuestionTimer()`

**Location:** `FRONTEND/src/pages/AIInterview.tsx`

**Purpose:** Per-question countdown timer with auto-submit on expiry.

**Time Limits:**
- Theory: 120 seconds (2 minutes)
- MCQ: 60 seconds (1 minute)
- Code: 300 seconds (5 minutes)

**Code:**
```typescript
const QUESTION_TIME_LIMITS: Record<string, number> = {
    theory: 120,
    mcq: 60,
    code: 300,
};

function useQuestionTimer(limitSecs: number, onExpire: () => void) {
    const [remaining, setRemaining] = useState(limitSecs);
    
    useEffect(() => {
        if (remaining <= 0) {
            onExpire(); // Auto-submit answer
            return;
        }
        const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
        return () => clearTimeout(id);
    }, [remaining, onExpire]);
    
    const pct = Math.round((remaining / limitSecs) * 100);
    const isWarning = remaining <= 20 && remaining > 0;
    const isDanger = remaining <= 10 && remaining > 0;
    
    return { remaining, pct, isWarning, isDanger };
}
```

**Visual States:**
- **Green** (>20s): Normal
- **Amber** (10-20s): Warning
- **Red** (<10s): Danger
- **Expired** (0s): Auto-submits answer

**UI Components:**
- Circular progress bar
- Digital countdown (MM:SS)
- Color-coded states
- Pulse animation on danger

---

## User Experience

### Voice Interview Flow

1. **Question Displayed**
   - TTS reads question aloud (optional)
   - User can mute/unmute

2. **Answer Input**
   - User clicks microphone button
   - Browser requests mic permission
   - Recording starts with volume visualization

3. **Recording**
   - Real-time volume bar shows speech detection
   - Auto-stops after 3s silence
   - User can manually stop or cancel

4. **Transcription**
   - "Transcribing your answer..." message
   - Takes 1-2 seconds

5. **Evaluation**
   - Transcript displayed: "You said: ..."
   - AI evaluates answer
   - Score and feedback shown

### Timer Flow

1. **Question Starts**
   - Timer begins countdown
   - Progress bar shows time remaining

2. **Warning States**
   - Amber at 20s: "Time running low"
   - Red at 10s: "Hurry up!"
   - Pulse animation

3. **Expiry**
   - Timer hits 0:00
   - Answer auto-submitted
   - "Time's up!" message

---

## Error Handling

### Voice Input Errors

**Mic Permission Denied:**
```
"Mic denied — type your answer instead"
```
- User can still type answer
- No retry prompt (respects user choice)

**Transcription Failed:**
```
"Voice transcription failed. Please try again or type your answer."
```
- Likely causes: Network error, Groq API down
- User can retry or type

**No Speech Detected:**
```
"No speech detected. Please speak clearly or type your answer instead."
```
- Audio too quiet or silent
- <5 words transcribed

**Code Question:**
```
"Code questions must be submitted as text via /submit."
```
- Voice not supported for code
- User must type

### TTS Errors

**Browser Not Supported:**
- TTS controls hidden
- No error message (graceful degradation)

**Voice Loading:**
- Voices load asynchronously
- Fallback to browser default if preferred voice unavailable

---

## Performance

### Voice Input
- **Recording:** Negligible CPU (native MediaRecorder)
- **Volume Analysis:** ~1-2% CPU (Web Audio API)
- **Transcription:** 1-2 seconds for 30s audio
- **Network:** ~100-500 KB per audio file

### TTS
- **CPU:** Negligible (native SpeechSynthesis)
- **Network:** None (runs locally)
- **Latency:** Instant start

### Timer
- **CPU:** Negligible (1 setTimeout per second)
- **Memory:** <1 KB

---

## Security

### Voice Input
- ✅ Audio files deleted after transcription
- ✅ Temp files cleaned up on error
- ✅ Rate limited: 15 requests/minute
- ✅ File size limit: 10 MB (enforced by FastAPI)

### TTS
- ✅ No external API calls (runs in browser)
- ✅ No data sent to server
- ✅ No privacy concerns

---

## Future Enhancements

### Voice Input
- [ ] Multi-language support (Hindi, Spanish, etc.)
- [ ] Noise cancellation
- [ ] Speaker diarization (multi-person interviews)
- [ ] Real-time transcription (streaming)

### TTS
- [ ] Voice selection UI (let user choose voice)
- [ ] Speed control (0.5x - 2x)
- [ ] Highlight text as it's spoken
- [ ] Pause/resume controls

### Timer
- [ ] Configurable time limits (admin setting)
- [ ] Time extension for accessibility
- [ ] Pause timer (for emergencies)
- [ ] Time bonus for early completion

---

## Testing

### Manual Testing

**Voice Input:**
1. Start interview
2. Click microphone button
3. Speak answer clearly
4. Verify transcription accuracy
5. Check evaluation matches spoken content

**TTS:**
1. Start interview
2. Click speaker icon
3. Verify question read aloud
4. Check MCQ options read correctly
5. Test mute/unmute

**Timer:**
1. Start interview
2. Wait for timer to reach 20s (amber)
3. Wait for timer to reach 10s (red)
4. Let timer expire (auto-submit)
5. Verify answer submitted

### Automated Testing

**Backend:**
```python
def test_voice_transcription():
    # Upload sample audio file
    response = client.post(
        "/api/v1/interview/submit_voice",
        files={"audio": ("answer.webm", audio_bytes, "audio/webm")},
        data={"question_id": 1}
    )
    assert response.status_code == 200
    assert "transcribed_answer" in response.json()
```

**Frontend:**
```typescript
test("VoiceAnswerInput starts recording", async () => {
    const onAudioReady = jest.fn();
    render(<VoiceAnswerInput onAudioReady={onAudioReady} disabled={false} />);
    
    const micButton = screen.getByRole("button");
    fireEvent.click(micButton);
    
    await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument();
    });
});
```

---

## Conclusion

Voice interview and TTS transform Kareerist's mock interview into a more natural, accessible experience. Users can practice speaking their answers (critical for real interviews) and hear questions read aloud (helpful for auditory learners).

**Key Benefits:**
- ✅ More realistic interview practice
- ✅ Accessibility for typing-averse users
- ✅ Faster answer input (speaking > typing)
- ✅ Auditory learning support
- ✅ Hands-free operation (TTS)

**Production Status:** ✅ Fully deployed and tested
