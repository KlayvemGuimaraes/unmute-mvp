> **When to Read This:** Load this when changing how a conversation session starts, renews, or stops, especially across `LandingPage`, `ConversationComponent`, and `app/api/*` routes.

# Conversation Lifecycle

## Overview

This quickstart orchestrates one user session across four coupled systems:

- Next.js browser UI state.
- Agora RTC media transport.
- Agora RTM data transport.
- Agora managed agent backend lifecycle.

The correctness target is single-init, predictable teardown, and no leaked RTM/RTC resources.

## Detailed Start Sequence

1. User explicitly confirms the prefilled profile, accepts the audio/transcription notice, and submits the intake form.
2. `LandingPage.handleStartConversation` calls `GET /api/generate-agora-token`.
3. The RTM client is created, logs in with the user token, and subscribes to the channel before the agent starts.
4. `LandingPage` mounts `ConversationComponent` with the token, RTM client, and confirmed local context; `useJoin` and `useLocalMicrophoneTrack` remain gated by the `isReady` StrictMode guard.
5. `usePublish` publishes the mic. `ConversationComponent` waits until publication succeeds, then calls `POST /api/invite-agent` with the selected scenario/avatar and, only for follow-up, the confirmed medication label.
6. If avatar startup fails after valid configuration, the route starts a new audio-only agent and returns `avatar_enabled: false`. If mic publication or agent startup fails, RTC is unmounted, RTM is closed, and the pre-call form returns with the profile and selected agent preserved.
7. The client subscribes to both the remote avatar and voice-agent audio UIDs, preferring avatar audio when present and falling back to voice-agent audio. For a configured avatar, playback waits for the first decoded video frame or releases after seven seconds; a visible header control exposes user-activated audio resume through `resumeAudioContext()`.
8. `AgoraAvatarVideo` subscribes to the configured avatar UID and marks video connected only after first-frame decode or a rendered browser frame. It shows an explicit fallback after eight seconds if the stream has not arrived.
9. `AgoraVoiceAI.init()` binds RTC+RTM engines and subscribes messages; UI renders audio/video states, the failing ASR/LLM/TTS module when supplied, visualizer, transcript, and metrics panels.
10. If a reaction is suspected, the agent asks the applicable Naranjo questions and calls `/api/naranjo-score`; the protected stateless route returns score/category for the spoken response and local draft.

## StrictMode Safety Contract

- `isReady` flips `true` only after the fake-unmount cycle finishes.
- First fake mount timer is synchronously cancelled; second real mount timer survives.
- This keeps join and track init single-run in development.

Breaking this guard causes duplicate client/track/toolkit initialization patterns that are hard to recover from.

## Token Renewal Flow

- Renewal callback receives actual joined RTC UID.
- Two renewal calls are made in parallel:
- RTC renewal for current joined UID.
- RTM renewal for original login UID.
- Both target same channel.
- Result returns `rtcToken` + `rtmToken` to caller.

## Teardown Sequence

1. If `agentId` exists, call `POST /api/stop-conversation`.
2. Stop route calls `client.stopAgent(agent_id)` and treats already-stopping states as success.
3. Frontend logs out RTM client and clears RTM state.
4. `showConversation` reset unmounts conversation view.
5. `agora-rtc-react` hook ownership handles leave/unpublish/track cleanup after unmount.
6. Toolkit cleanup path unsubscribes and destroys `AgoraVoiceAI` singleton.

## Failure Modes and Recovery

- Agent invite failure is fatal to the start path because no voice agent exists.
- Avatar configuration/startup failure is non-fatal only when the audio-only retry succeeds.
- RTM bootstrap failure is fatal to the start path because the transcript pipeline depends on it; a partially started agent is stopped.
- Stop failures are logged, but UI teardown still continues.

## Cross-File Dependencies

- `components/LandingPage.tsx`: bootstrap orchestration and renewal callback.
- `components/ConversationComponent.tsx`: join/toolkit/mic runtime behavior.
- `app/api/naranjo-score/route.ts` and `lib/naranjo.ts`: deterministic scoring tool route and calculation.
- `app/api/generate-agora-token/route.ts`: RTM-capable token minting.
- `app/api/invite-agent/route.ts`: agent pipeline config.
- `app/api/stop-conversation/route.ts`: idempotent stop semantics.
