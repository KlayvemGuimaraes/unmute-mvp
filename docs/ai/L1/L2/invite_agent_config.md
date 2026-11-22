> **When to Read This:** Load this document when you are changing the agent's prompt, voice, VAD behavior, model selection, or wiring a bring-your-own-key (BYOK) provider.

# Invite Agent Config

## Where It Lives

The managed session configuration is built in `app/api/invite-agent/route.ts`; the scenario-specific greeting and instructions live in `lib/interview-prompt.ts`. The route receives `{ requester_id, channel_name, context: { flow, avatar, followUpMedication? } }` from `LandingPage`, constructs an `Agent` from `agora-agents`, and starts a session bound to the requester's RTC channel. Only the confirmed medication label is sent for follow-up. All other profile values, including CPF/RG, remain in browser memory. If a reaction is suspected, AgentKit exposes the deterministic `calculate_naranjo_score` REST tool backed by `/api/naranjo-score`.

## Top-Level Constants

| Constant            | Default                                              | Purpose                                                   |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `buildInterviewPrompt(context, agentName)` | Portuguese pharmacovigilance collection instructions | Builds the system prompt for the selected scenario, medication label, and safety boundaries. |
| `buildInterviewGreeting(context, agentName)` | Scenario-specific Portuguese greeting | Follow-up mentions the confirmed medication label; spontaneous report introduces the interview without asking about a third party. |
| `createNaranjoLlmTool(url, authorizationToken)` | AgentKit tool definition | Restricts arguments to ten `yes`/`no`/`unknown` answers and sends them with an internal server-side Bearer token. |

Agent behavior is configured in code: edit `lib/interview-prompt.ts`. The invite route validates the flow and avatar and accepts an optional medication label only for follow-up.

The agent asks the relevant Naranjo questions before calling the score tool, never infers an answer, and treats the result as an estimate for pharmacist review. In production, `NEXT_PUBLIC_APP_URL` must point to an HTTPS origin reachable by Agora; use a public tunnel for local live-agent testing.

## The Agent Builder Chain

`AgoraClient` is constructed first — it carries the region and credentials for all API calls. `area` belongs here, not on the session.

```ts
const client = new AgoraClient({ area: Area.US, appId, appCertificate });
const voice = AVATARS[context.avatar];
const greeting = buildInterviewGreeting(context, voice.name);
const instructions = buildInterviewPrompt(context, voice.name);

const agent = new Agent({
  name: `conversation-${Date.now()}-${randomHex}`,
  instructions,
  greeting,
  failureMessage: 'Aguarde um momento, por favor.',
  maxHistory: 50,
  turnDetection: {
    config: {
      speech_threshold: 0.5,
      start_of_speech: { /* VAD on-start params */ },
      end_of_speech:   { /* VAD on-end params */ },
    },
  },
  advancedFeatures: { enable_rtm: true, enable_tools: true },
  parameters: {
    data_channel: 'rtm',
    enable_error_message: true,
    enable_metrics: true,
  },
})
  .withStt(new DeepgramSTT({ model: 'nova-3', language: 'pt-BR' }))
  .withLlm(new OpenAI({
    model: 'gpt-4o-mini',
    greetingMessage: greeting,
    failureMessage: 'Aguarde um momento, por favor.',
    maxHistory: 15,
    params: { max_tokens: 1024, temperature: 0.7, top_p: 0.95 },
  }))
  .withTts(new MiniMaxTTS({
    model: 'speech_2_6_turbo',
    voiceId: voice.voiceId,
  }));
```

When `lib/avatar-config.ts` resolves a complete provider configuration, the route uses the `Protoface` adapter from `agora-agents` 2.15+ for Protoface's documented endpoint. Other Agora-compatible providers use `GenericAvatar`; Tavus uses Agora's documented Tavus endpoint through that adapter. The configured avatar UID publishes video into the session channel and must differ from both `DEFAULT_AGENT_UID` and the requesting user UID. No provider key or ID is sent back to the browser.

The route keeps Clara/Miguel's selected Portuguese MiniMax voice in either mode. The managed MiniMax preset does not expose a sample-rate option, so LiveAvatar's required 24 kHz is not guaranteed by this pipeline; LiveAvatar configuration therefore remains audio-only. If another provider fails while starting, the route retries a fresh audio-only voice session and identifies the fallback in its response.

The Naranjo route uses the PAHO point table and categories. Scores >=1 are described as possible/probable/definite and prompt professional contact; scores <=0 are described as unlikely with the supplied information, never as ruling out a reaction. See `lib/naranjo.ts` for the calculation and API response contract.

## Session Options

`createSession` takes the `AgoraClient` as its first argument, then the session options object. `session.start()` is called separately and returns the `agentId`.

```ts
const session = agent.createSession(client, {
  channel: channel_name,
  agentUid,
  remoteUids: [requester_id],
  idleTimeout: 30,
  expiresIn: ExpiresIn.hours(1),
  debug: false,
});
const agentId = await session.start();
```

| Option        | Effect                                                                               |
| ------------- | ------------------------------------------------------------------------------------ |
| `channel`     | The RTC channel name the agent joins.                                                |
| `agentUid`    | The UID the agent occupies in the channel, shared through `lib/agora.ts`.             |
| `remoteUids`  | Restricts the agent to the requester's UID — protects against cross-channel sniping. |
| `idleTimeout` | Seconds of silence before the session ends.                                          |
| `expiresIn`   | Hard ceiling on session length, mirrors the 1-hour RTC token.                        |
| `debug`       | Logs Agora REST API calls to the console when `true`.                                |

## Editing Each Surface

### Change the prompt

Edit `buildInterviewPrompt` in `lib/interview-prompt.ts`. Keep it under the LLM's context window — `gpt-4o-mini` handles thousands of tokens but very long prompts amplify latency.

### Change the greeting

Edit `buildInterviewGreeting` in `lib/interview-prompt.ts`.

### Change VAD behavior

Edit `turnDetection.config.start_of_speech` and `turnDetection.config.end_of_speech`. Both blocks accept the new VAD param shape — do **not** revert to the deprecated `turnDetection.type: 'agora_vad'`.

### Swap the STT model

Replace the `DeepgramSTT` constructor. To use Deepgram with a BYOK key, set `NEXT_DEEPGRAM_API_KEY` and pass `apiKey: process.env.NEXT_DEEPGRAM_API_KEY` to the constructor.

### Swap the LLM

Replace `OpenAI` with another LLM class from `agora-agents`. For a custom URL, point the constructor at `process.env.NEXT_LLM_URL` and pass `apiKey: process.env.NEXT_LLM_API_KEY`. Wiring through `app/api/chat/completions/route.ts` is documented in `docs/ai/L1/05_workflows.md`.

### Swap the TTS

Replace `MiniMaxTTS`. ElevenLabs is the common BYOK choice — use `NEXT_ELEVENLABS_API_KEY` and `NEXT_ELEVENLABS_VOICE_ID`. The commented BYOK example in the route shows the constructor shape.

## Response Contract

On success the route returns `AgentResponse`:

```json
{
  "agent_id": "string",
  "avatar_uid": "56001",
  "avatar_enabled": true,
  "avatar_status": "configured",
  "avatar_message": "optional fallback detail",
  "create_ts": 1700000000,
  "state": "RUNNING"
}
```

On audio-only fallback, `avatar_uid` is `null`, `avatar_enabled` is `false`, `avatar_status` is `unavailable`, and `avatar_message` states that voice continues without video.

`agent_id` is what `LandingPage` later passes to `/api/stop-conversation`.

## Verification

`scripts/verify-api-contracts.ts` mocks `Agent.prototype.createSession` and asserts:

- Missing `channel_name` or `requester_id`, or an invalid flow/avatar → `400`.
- Mocked success → `200` with `agent_id`, `create_ts`, `state`.
- Configured Clara/Miguel selection → own provider ID and unique avatar UID.
- Missing provider/ID or conflicting UID → explicit unavailable config.
- Configured avatar invite → response includes `avatar_uid`; no API key leaks.
- Audio-only fallback → `avatar_enabled: false` and a readable reason.

After editing this file, run:

```bash
pnpm run verify:api
pnpm run typecheck
```

## Failure Modes

| Symptom                                                | Cause                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `400 channel_name and requester_id are required`       | Browser sent an empty body or wrong field names.               |
| `500 Agora credentials are not set`                    | `NEXT_AGORA_APP_CERTIFICATE` missing in env.                   |
| Agent joins but never speaks                           | TTS misconfigured (wrong `voiceId` or missing BYOK key).       |
| Agent state stuck on `IDLE`                            | `enable_rtm: true` missing or RTM client not subscribed yet.   |
| `verify:api` fails on the route                        | New required field added without updating the harness.         |

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Interfaces](../06_interfaces.md)
- [Token Model](token_model.md)
