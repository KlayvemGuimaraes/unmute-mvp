# 06 Interfaces

> Contracts at repo boundaries: API routes, env vars, runtime events, and shared TypeScript payloads.

## HTTP Route Contracts

### `GET /api/generate-agora-token`

Query params:

- `uid` optional; invalid/zero resolves to a random UID that avoids the voice-agent UID and configured avatar UIDs. A requested reserved UID returns `400`.
- `channel` optional; defaults to generated `ai-conversation-<ts>-<rand>`.

Success response:

```json
{ "token": "...", "uid": "1234", "channel": "ai-conversation-..." }
```

Failure response: `{ "error": string, "details"?: string }` with `500`.

### `POST /api/invite-agent`

Body (`ClientStartRequest`):

```json
{
  "requester_id": "1234",
  "channel_name": "ai-conversation-...",
  "context": {
    "flow": "follow-up",
    "avatar": "miguel"
  }
}
```

`flow` is `follow-up` or `report-reaction`; `avatar` is `miguel` or `clara`. The route selects the avatar's Portuguese voice and builds the scenario-specific interview instructions. The patient's profile remains in browser memory and is not included in this request. Use only synthetic profile data in this MVP.

`requester_id` must be a decimal Agora RTC UID in range and cannot use the voice-agent UID. The route rejects invalid values with `400`; avatar UIDs are also rejected as user UIDs by the token route.

Success (`AgentResponse`):

```json
{
  "agent_id": "...",
  "avatar_uid": "56001",
  "avatar_enabled": true,
  "avatar_status": "configured",
  "create_ts": 1710000000,
  "state": "RUNNING"
}
```

When provider credentials/IDs are missing or avatar startup fails, `avatar_uid` is `null`, `avatar_enabled` is `false`, `avatar_status` is `unavailable`, and `avatar_message` explains the audio-only fallback. Session `state` is returned as the AgentKit state. Provider secrets are never part of either response.

Validation failures return `400`; server failures return `500`.

### `POST /api/stop-conversation`

Body (`StopConversationRequest`): `{ "agent_id": "..." }`.

Responses:

- `{ "success": true }`
- `{ "success": true, "state": "already-stopping" }` for idempotent stop state
- `{ "error": string }` on failure

### `POST /api/chat/completions`

Optional SSE proxy path (not default runtime path). Requires `NEXT_LLM_API_KEY` and `NEXT_LLM_URL` when used.

## Event/Data Interfaces

- RTM transcript/state/metrics/errors consumed through `AgoraVoiceAI` event emitter.
- Raw RTM `message` event parsed as fallback for `message.error` and `message.sal_status` payloads.
- `AGENT_METRICS` payloads displayed by `QuickstartPipelineMetrics`.

## Environment Contract

Required for audio:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`

Optional avatar video:

- `NEXT_AGORA_AVATAR_PROVIDER`: `tavus`, `liveavatar`, `generic`, or `auto` (priority: Tavus, LiveAvatar, Generic).
- `NEXT_AGORA_AVATAR_API_KEY`: server-side shared provider secret.
- `NEXT_AGORA_AVATAR_BASE_URL`: required for Generic Avatar; Tavus uses the Agora documented Tavus endpoint.
- `NEXT_AGORA_CLARA_AVATAR_ID`, `NEXT_AGORA_MIGUEL_AVATAR_ID`: provider-specific IDs.
- `NEXT_AGORA_CLARA_UID`, `NEXT_AGORA_MIGUEL_UID`: separate decimal RTC UIDs, distinct from each other, `DEFAULT_AGENT_UID`, and the requesting user UID.

The avatar API key remains server-only. A blank provider setting or incomplete configuration starts voice only and reports `avatar_enabled: false`. The installed MiniMax preset does not expose the 24 kHz sample rate required by LiveAvatar, so that provider currently falls back to voice only. Do not interpret that as an active video session.

## Test Coverage for Interfaces

- `scripts/verify-api-contracts.ts` asserts token generation and UID reservation, valid requester UID, Clara/Miguel mapping, absent/missing/duplicate avatar config, avatar invite response, avatar-start fallback, agent error handling, consent guard, flow default/direct link, stop behavior, and SSE framing.

## Shared Client-Side Interfaces

From `types/conversation.ts` (high-use):

- `AgoraTokenData`: token plus agent/avatar status bootstrap payload consumed by `LandingPage`.
- `InterviewConfig`: scenario and avatar sent to `/api/invite-agent`.
- `AgentContext`: scenario/avatar plus local synthetic profile (reporter/patient name and age, subject relationship, optional sex/health plan/weight, and demo medication label) held in the browser. It is not included in the invite request.
- `CaseDraft`: in-memory pharmacist review form with transcript and pending fields.
- `AgoraRenewalTokens`: renewal callback result (`rtcToken`, `rtmToken`).
- `ConversationComponentProps`: runtime dependencies for in-call component.

## Interface Invariants

- Token payload must always include `token`, `uid`, `channel`.
- Invite route requires `requester_id`, `channel_name`, and a valid scenario/avatar context.
- Stop route requires `agent_id`; missing should never be tolerated silently.
- Token route should always return UID as string for downstream compatibility.
- Agent voice UID, avatar publisher UID, and user UID must remain different.
- Client may mark avatar video connected only when the matching remote stream is present and rendering a decoded frame.

## Event Interface Notes

- Metrics stream entries are append-only in component state, capped to recent window.
- Connection issue records carry `source`, `agentUserId`, code/message, timestamp.
- SAL and signaling fallback payloads are parsed defensively because message schema can vary.

## Backward Compatibility Guidance

- If route response shape changes, update both client consumers and contract tests in same change.
- If adding fields, keep existing fields stable to avoid quickstart consumer breakage.
- Reflect interface changes in README and L1 docs to keep sample copyable.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — How route contracts are used in sequence.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Event-level contract mapping.
