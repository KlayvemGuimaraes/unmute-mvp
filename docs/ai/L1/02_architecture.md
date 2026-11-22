# 02 Architecture

> Runtime architecture for browser RTC/RTM, Next.js route handlers, and Agora managed agent session.

## High-Level Shape

- Next.js App Router frontend and API routes in one deployable app.
- Next.js owns the interface; browser joins Agora RTC for audio/video transport and uses RTM for transcript/state/metrics/errors.
- Server-side routes mint token and call Agora Agent Server SDK.
- Agent executes STT -> LLM -> TTS pipeline in Agora cloud. Optional avatar video comes from a compatible external provider and is published into the same Agora RTC channel.

## Component Graph

```text
Browser UI (PatientIntakeForm + LandingPage + ConversationComponent + CaseDraftReview)
  -> GET /api/generate-agora-token
  -> POST /api/invite-agent (flow + avatar only; profile stays in browser)
  -> RTC join/publish mic
  -> RTM subscribe + AgoraVoiceAI events
  -> POST /api/stop-conversation

Next.js API routes
  -> agora-token (RtcTokenBuilder.buildTokenWithRtm)
  -> agora-agents (start/stop managed agent)

Agora Cloud
  -> Agent session (Deepgram STT + OpenAI LLM + MiniMax TTS by default)
  -> RTM payloads (transcript, state, metrics, error)
  -> optional external avatar provider (video published with its own RTC UID)
```

## Start Sequence

1. In step one, the visitor selects Clara or Miguel. Follow-up is the default; a direct report-reaction URL continues to select the patient-initiated flow.
2. In step two, the visitor confirms synthetic profile fields, identifies whether the report is about themself or a third party, and accepts the audio notice.
3. UI fetches RTC+RTM token and channel.
4. UI invites the voice agent with only the selected flow/avatar and initializes RTM in parallel. The server configures a video provider only when its credentials, per-persona provider ID, and unique avatar UID are valid.
5. If avatar setup is missing or fails, the server starts an audio-only agent and returns the unavailable state. A session is not shown if agent startup or RTM setup fails.
6. UI mounts the conversation view; `useJoin` connects RTC once the `isReady` guard passes.
7. `AgoraAvatarVideo` subscribes to the remote avatar UID and only reports video connected after decoding its first frame.
8. `AgoraVoiceAI.init()` subscribes transcript/state/metrics streams.

## End Sequence

1. UI calls `/api/stop-conversation` with `agent_id` if present.
2. UI logs out RTM client.
3. RTC hook ownership handles leave/unpublish cleanup.
4. The client shows an editable pharmacist draft with the source transcript; the draft remains in memory.

## Core State Domains

- Session bootstrap: `LandingPage` (`agoraData`, `rtmClient`, loading/error flags).
- Avatar config: server-only `lib/avatar-config.ts`; the selected provider uses a distinct UID from `DEFAULT_AGENT_UID` and the requesting user. The browser receives the avatar UID and status, never provider credentials.
- Interview setup/profile (name, age, optional sex, health plan and weight) and editable pharmacist draft: client-side state only; no database persistence. The form does not collect a full date of birth.
- RTC transport and mic: `ConversationComponent` + `agora-rtc-react` hooks.
- Transcript + agent state: `AgoraVoiceAI` events mapped through `lib/conversation.ts`.
- Metrics and connection issues: `AGENT_METRICS`, `MESSAGE_ERROR`, `SAL_STATUS`, RTM fallback parsing.

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
- Agent lifecycle control (`start`, `stop`) is server-routed.
- Transcript/state/metrics are data-plane RTM events from agent to browser.
- UI control-plane actions (start/end, renew) originate in `LandingPage`.

## Internal Interfaces Between Components

`LandingPage` -> `ConversationComponent` props:

- `agoraData` (`token`, `uid`, `channel`, optional `agentId`)
- `agoraData` also contains `avatarUid`, `avatarEnabled`, `avatarStatus`, `avatarMessage`, and initial `sessionState`.
- `rtmClient` (already logged-in and subscribed)
- `onTokenWillExpire(uid)` callback for dual-token renewal
- `onEndConversation(draft)` callback for teardown, route stop call, and local draft review
- `context` (scenario, avatar, and in-memory synthetic profile)

When the call ends, `ConversationComponent` passes the source transcript and blank structured case fields to `LandingPage`, which shows `CaseDraftReview`. The profile fields are not sent in the invite request; spoken audio/transcription use Agora's voice pipeline.

`ConversationComponent` -> child UI components:

- normalized transcript items and current in-progress turn
- agent visualizer state derived from transport + semantic state
- connection issue list and derived severity
- recent metric window for stage latency chips
- selected remote Agora avatar video, with a separate accessible video state and audio-only fallback

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
