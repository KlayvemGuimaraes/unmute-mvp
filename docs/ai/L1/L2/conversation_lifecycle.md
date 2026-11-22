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
3. In parallel:
- `POST /api/invite-agent` starts the managed agent session with the selected scenario/avatar and, only for follow-up, the confirmed medication label.
- RTM client is created, logs in with token, subscribes to channel.
4. If avatar startup fails after valid configuration, the route starts a new audio-only agent and returns `avatar_enabled: false`; if the voice agent fails, the pre-call UI remains visible with an error.
5. RTM/bootstrap failure stops a partially started agent and closes RTM; only when both succeed are `agoraData` + `rtmClient` stored and `ConversationComponent` mounted.
6. `useJoin` and `useLocalMicrophoneTrack` remain gated by the `isReady` StrictMode guard.
7. `ConversationComponent` subscribes to and plays the remote voice-agent audio track; a blocked autoplay state exposes a user-activated resume button.
8. `AgoraAvatarVideo` subscribes to the configured avatar UID and marks video connected only after first-frame decode.
9. After join success, `AgoraVoiceAI.init()` binds RTC+RTM engines and subscribes messages; UI renders audio/video states, visualizer, transcript, and metrics panels.
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
