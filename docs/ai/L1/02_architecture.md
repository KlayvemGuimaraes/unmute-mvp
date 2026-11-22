# 02 Architecture

> Runtime architecture for browser RTC/RTM, Next.js route handlers, and Agora managed agent session.

## High-Level Shape

- Next.js App Router frontend and API routes in one deployable app.
- Next.js owns the interface; browser joins Agora RTC for audio/video transport and uses RTM for transcript/state/metrics/errors.
- Server-side routes mint token and call Agora Agent Server SDK.
- Agent executes the STT -> LLM -> TTS pipeline in Agora cloud, using managed provider credentials by default; optional `NEXT_OPENAI_API_KEY` routes the LLM through the user's OpenAI account. Optional avatar video comes from a compatible external provider and is published into the same Agora RTC channel.
- Browser subscribes to both possible RTC audio publishers, prefers the avatar UID when it has a track, and falls back to the voice-agent UID if avatar audio is absent. RTM transcript events remain a separate data path; a visible header control lets the user activate or resume audio playback.

## Component Graph

```text
Browser UI (PatientIntakeForm + LandingPage + ConversationComponent + CaseDraftReview)
  -> POST /api/intake-profile (opaque WhatsApp token, when present)
  -> GET /api/generate-agora-token
  -> RTM login + subscribe
  -> RTC join + mic publish
  -> POST /api/invite-agent (flow + avatar + optional follow-up medication label)
  -> subscribe to avatar audio/video, with voice-agent audio fallback
  -> AgoraVoiceAI transcript/state/metrics events over RTM
  -> POST /api/stop-conversation

Next.js API routes
  -> optional server-side WhatsApp profile lookup
  -> agora-token (RtcTokenBuilder.buildTokenWithRtm)
  -> agora-agents (start/stop managed agent)
  -> POST /api/naranjo-score (stateless deterministic score invoked by the agent tool)

Agora Cloud
  -> Agent session (Deepgram STT + OpenAI LLM + MiniMax TTS by default)
  -> HTTPS call to `NEXT_PUBLIC_APP_URL/api/naranjo-score` after a suspected reaction and ten recorded answers
  -> RTM payloads (transcript, state, metrics, error)
  -> optional external avatar provider (video published with its own RTC UID)
```

## Start Sequence

1. Without `intake_token`, the page loads a prefilled profile. With a token, the browser removes it from the address bar and posts it to `/api/intake-profile`; the server resolves the linked profile through the configured endpoint.
2. In step one, the visitor selects Clara or Miguel. Follow-up is the default; a direct report-reaction URL continues to select the patient-initiated flow.
3. In step two, the visitor reviews name, age, masked CPF/RG, edits any incorrect values, explicitly confirms the profile, and accepts the audio notice.
4. UI fetches the RTC+RTM token and channel, then logs into RTM and subscribes to the channel.
5. UI mounts the conversation view; `useJoin` connects RTC after the `isReady` guard and the microphone hook publishes the local mic.
6. Only after mic publication succeeds does `ConversationComponent` invite the voice agent with the selected flow/avatar and, for follow-up only, the confirmed medication label. The server configures a video provider only when its credentials, per-persona provider ID, and unique avatar UID are valid.
7. If avatar setup is missing or fails, the server starts an audio-only agent and returns the unavailable state. If mic or agent startup fails, RTC/RTM are cleaned up and the pre-call profile is restored with an error.
8. The client subscribes to both the avatar and voice-agent audio publishers, prefers `avatar_uid` when its audio track exists, and otherwise plays `DEFAULT_AGENT_UID`. `AgoraAvatarVideo` reports video connected only after decoding its first frame.
9. `AgoraVoiceAI.init()` subscribes transcript/state/metrics streams over RTM.
10. When applicable, the agent calls the deterministic score route; the route accepts ten categorical answers and returns a score/category without persistence.

## End Sequence

1. UI calls `/api/stop-conversation` with `agent_id` if present.
2. UI logs out RTM client.
3. RTC hook ownership handles leave/unpublish cleanup.
4. The client shows an editable pharmacist draft with the source transcript; the draft remains in memory.

## Core State Domains

- Session bootstrap: `LandingPage` (`agoraData`, `rtmClient`, loading/error flags).
- Avatar config: server-only `lib/avatar-config.ts`; Protoface uses Agora's official `Protoface` adapter from `agora-agents` 2.15+, and other compatible providers use `GenericAvatar`. Each selected persona has a distinct UID from `DEFAULT_AGENT_UID` and the requesting user. `NEXT_AGORA_AVATAR_PROVIDER=disabled` skips provider startup; the browser receives the avatar UID and status, never provider credentials. The local portrait is an illustration fallback, not a live video stream. When an avatar is configured, browser audio playback waits up to seven seconds for the first decoded avatar frame, then releases audio if video remains unavailable.
- Interview setup/profile (name, age, masked identifiers, optional sex, health plan, weight and medications) and editable pharmacist draft: client-side state only; no database persistence. The follow-up medication label alone may be sent to the Agora agent; identifiers and other profile fields remain in the browser.
- RTC transport, mic, remote audio selection/fallback, and explicit audio activation: `ConversationComponent` + `agora-rtc-react` hooks.
- Transcript + agent state: `AgoraVoiceAI` events mapped through `lib/conversation.ts`.
- Metrics and connection issues: `AGENT_METRICS`, `MESSAGE_ERROR`, `SAL_STATUS`, RTM fallback parsing.
- Naranjo score: `lib/naranjo.ts` and `/api/naranjo-score`; result is an estimate for professional review, never a diagnosis or causal conclusion.

## External Dependencies

- `agora-rtc-react` / `agora-rtc-sdk-ng` for media transport.
- `agora-rtm` for data channel.
- `agora-agent-client-toolkit` and `agora-agent-uikit` for conversation logic/UI.
- `agora-agents` for managed agent lifecycle.
- A compatible external avatar provider for optional video. Agora supplies RTC session transport; the provider produces the avatar stream.

## Deployment Modes

- Local development via `pnpm run dev`.
- Vercel deployment as single Next.js app with server env vars.

## Data and Control Boundaries

- Browser never sees the app certificate; only receives signed short-lived tokens.
- Browser never receives avatar API keys or provider setup credentials.
- Profile lookup credentials remain server-side; the client receives only the resolved profile after sending an opaque invitation token.
- Agent lifecycle control (`start`, `stop`) is server-routed.
- Transcript/state/metrics are data-plane RTM events from agent to browser.
- Naranjo tool calls carry only `yes`/`no`/`unknown` answers to the configured app origin; the scoring route stores nothing and receives no profile identifiers.
- UI control-plane actions (start/end, renew) originate in `LandingPage`.

## Internal Interfaces Between Components

`LandingPage` -> `ConversationComponent` props:

- `agoraData` (`token`, `uid`, `channel`, optional `agentId`)
- `agoraData` also contains `avatarUid`, `avatarEnabled`, `avatarStatus`, `avatarMessage`, and initial `sessionState`.
- `rtmClient` (already logged-in and subscribed)
- `onTokenWillExpire(uid)` callback for dual-token renewal
- `onEndConversation(draft)` callback for teardown, route stop call, and local draft review
- `context` (scenario, avatar, and in-memory profile)

When the call ends, `ConversationComponent` passes the source transcript, pending structured case fields, and a score parsed from the agent's exact score sentence to `LandingPage`, which shows `CaseDraftReview`. CPF, RG and other profile fields are not sent in the invite request. Follow-up includes only the confirmed medication label; spoken audio/transcription use Agora's voice pipeline.

`ConversationComponent` -> child UI components:

- normalized transcript items and current in-progress turn
- agent visualizer state derived from transport + semantic state
- connection issue list and derived severity
- recent metric window for stage latency chips
- selected remote Agora avatar video, with a separate accessible video state and audio-only fallback
- remote voice-agent audio playback state and autoplay recovery control

## Why the App Router Structure Matters

- API handlers under `app/api` co-deploy with UI and share env management.
- Client components isolate browser-only SDK usage via dynamic import and `ssr: false`.
- This avoids SSR-side access to WebRTC-dependent modules.

## Change Impact Hints

- Changes to token or invite routes affect both startup and renewal paths.
- Changes to transcript mapping can break both transcript panel and visualizer semantics.
- Changes to RTM setup in `LandingPage` affect toolkit subscription readiness.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Detailed bootstrapping and teardown timeline.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Event mapping, UID remap, in-progress/completed segmentation.
