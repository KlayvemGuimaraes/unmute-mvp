# 06 Interfaces

> Contracts at repo boundaries: API routes, env vars, runtime events, and shared TypeScript payloads.

## HTTP Route Contracts

### `POST /api/intake-profile`

Request body: `{ "token": "<short-lived opaque invitation token>" }`.

The route forwards the token to `NEXT_WHATSAPP_PROFILE_API_URL` with a server-side Bearer key from `NEXT_WHATSAPP_PROFILE_API_KEY`. The upstream response may contain a `profile` object or put its fields at the root. `patientName` and `patientAge` are required; optional fields are `patientCpf`, `patientRg`, `patientSex`, `patientHealthPlan`, `patientWeight`, and `patientMedications`. The adapter maps the profile to the current user and returns `{ "profile": IntakeProfile }` with `Cache-Control: no-store`.

Failures return a short user-facing error without upstream response details. The upstream token should be short-lived and single-use. Identifiers must never be embedded in the WhatsApp URL.

### `GET /api/generate-agora-token`

Query params:

- `uid` optional; invalid/zero resolves to a random UID that avoids the voice-agent UID and configured avatar UIDs. A requested reserved UID returns `400`.
- `channel` optional; defaults to generated `ai-conversation-<ts>-<rand>`.

Success response:

```json
{ "token": "...", "uid": "1234", "channel": "ai-conversation-..." }
```

Failure response: `{ "error": string, "details"?: string }` with `500`.

### `POST /api/naranjo-score`

Body: the ten Naranjo factors, each exactly `yes`, `no`, or `unknown`. The route rejects missing/extra values and returns `{ score, category, categoryPt, requiresProfessionalReview, interpretation }`. Categories follow the PAHO Naranjo table: `definite` >=9, `probable` 5–8, `possible` 1–4, `unlikely` <=0. The route is stateless and accepts no profile identifiers. It requires an internal Bearer token derived on the server from `NEXT_AGORA_APP_CERTIFICATE`; the Agora AgentKit inline REST tool sends that token after the applicable answers have been collected.

### `POST /api/invite-agent`

Body (`ClientStartRequest`):

```json
{
  "requester_id": "1234",
  "channel_name": "ai-conversation-...",
  "context": {
    "flow": "follow-up",
    "avatar": "miguel",
    "followUpMedication": "Losartana 50 mg"
  }
}
```

`flow` is `follow-up` or `report-reaction`; `avatar` is `miguel` or `clara`. `followUpMedication` is optional, limited to 120 characters, and accepted only for follow-up. The route uses it as the medicine label in the greeting and interview prompt. It does not receive the rest of the patient's profile or CPF/RG. The route selects the avatar's configured voice and builds the scenario-specific instructions.

`requester_id` must be a decimal Agora RTC UID in range and cannot use the voice-agent UID. The route rejects invalid values with `400`; avatar UIDs are also rejected as user UIDs by the token route.

The browser calls this route only after the RTC client has joined and the microphone publish hook reports success. The client subscribes to audio from both the avatar UID and voice-agent UID, preferring the avatar track when present and falling back to the voice-agent track. Video remains isolated on `avatar_uid`.

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
- Raw RTM `message` event parsed as fallback for `message.error` and `message.sal_status` payloads; preserve the error module when it is present so the UI can identify the failing provider stage.
- `AGENT_METRICS` payloads displayed by `QuickstartPipelineMetrics`.

## Environment Contract

Required for audio:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`

Optional LLM provider override:

- `NEXT_OPENAI_API_KEY`: when set, the server uses the OpenAI Chat Completions endpoint with this server-only key instead of Agora-managed OpenAI. OpenAI usage is billed to the key's account. When unset, the app uses Agora-managed `gpt-4o-mini`.

Required for Naranjo tool calls from Agora:

- `NEXT_PUBLIC_APP_URL` in production so the Agora service can reach the scoring route. Use the trusted public HTTPS origin; local live-agent tests need an HTTPS tunnel.

Optional avatar video:

- `NEXT_AGORA_AVATAR_PROVIDER`: `disabled`, `tavus`, `liveavatar`, `generic`, or `auto` (priority: Tavus, LiveAvatar, Generic). `disabled` or an empty value skips provider calls and keeps voice only. For Protoface, set `generic`.
- `NEXT_AGORA_AVATAR_API_KEY`: server-side shared provider secret; for Protoface, use the Protoface API key. Protoface uses Agora's official `Protoface` adapter in `agora-agents` 2.15+.
- `NEXT_AGORA_AVATAR_BASE_URL`: required for custom Generic Avatar endpoints. Protoface defaults to `https://api.protoface.com/v1/agora`; Tavus uses the Agora documented Tavus endpoint.
- `NEXT_AGORA_CLARA_AVATAR_ID`, `NEXT_AGORA_MIGUEL_AVATAR_ID`: provider-specific IDs.
- `NEXT_AGORA_CLARA_UID`, `NEXT_AGORA_MIGUEL_UID`: separate decimal RTC UIDs, distinct from each other, `DEFAULT_AGENT_UID`, and the requesting user UID.

Optional WhatsApp profile handoff:

- `NEXT_WHATSAPP_PROFILE_API_URL`: HTTPS endpoint accepting the JSON token lookup contract above.
- `NEXT_WHATSAPP_PROFILE_API_KEY`: server-side Bearer credential; never expose it to the browser.

The avatar API key remains server-only. A blank or `disabled` provider setting, or incomplete configuration, starts voice only and reports `avatar_enabled: false`. In that state the in-call screen shows a local illustrated portrait clearly labeled as an illustration. The installed MiniMax preset does not expose the 24 kHz sample rate required by LiveAvatar, so that provider currently falls back to voice only. Do not interpret the portrait or configured provider as an active video session. The local Protoface setup uses stock avatar IDs `av_stock_145` for Clara and `av_stock_140` for Miguel, with separate RTC UIDs `56000001` and `56000002`; replace IDs only with ready values from the account's avatar list.

## Test Coverage for Interfaces

- `scripts/verify-api-contracts.ts` asserts token generation and UID reservation, valid requester UID, Clara/Miguel mapping, interview scripts, prefilled profile, absent/missing/duplicate avatar config, avatar invite response, avatar-start fallback, agent error handling, profile confirmation and consent guards, flow default/direct link, stop behavior, and SSE framing.

## Shared Client-Side Interfaces

From `types/conversation.ts` (high-use):

- `AgoraTokenData`: token, channel, and the initial connecting state consumed by `LandingPage`; `AgentResponse` fills in the agent/avatar fields after the RTC client publishes its microphone.
- `InterviewConfig`: scenario and avatar.
- `AgentInviteContext`: scenario/avatar plus optional `followUpMedication`; this label is sent only in the follow-up flow and used in the agent greeting and script. Other profile fields, including CPF/RG, are not sent to the invite route.
- `AgentContext`: scenario/avatar plus local profile (reporter/patient name and age, CPF/RG, optional sex/health plan/weight, and medications) held in the browser. Only a follow-up medication label may be sent in `ClientStartRequest.context`.
- `CaseDraft`: in-memory pharmacist review form with transcript and pending fields.
- `NaranjoResult`: deterministic score/category stated by the agent and retained in the in-memory pharmacist draft when its exact sentence is present in the transcript.
- `AgoraRenewalTokens`: renewal callback result (`rtcToken`, `rtmToken`).
- `ConversationComponentProps`: runtime dependencies for in-call component.

## Interface Invariants

- Token payload must always include `token`, `uid`, `channel`.
- Invite route requires `requester_id`, `channel_name`, and a valid scenario/avatar context.
- Stop route requires `agent_id`; missing should never be tolerated silently.
- Token route should always return UID as string for downstream compatibility.
- Agent voice UID, avatar publisher UID, and user UID must remain different.
- Naranjo tool body is limited to the ten categorical answers; no profile details are sent to `/api/naranjo-score` or persisted there.
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
