# 03 Code Map

> Directory-level ownership map and where to change behavior safely.

## Top-Level Layout

```text
app/                 Next.js routes + API handlers
components/          Client UI and RTC/RTM lifecycle
lib/                 Shared helpers and server-side chat completions handler
scripts/             Verification and doctor helpers
docs/                Human-oriented guides
docs/ai/             Progressive disclosure docs (this system)
public/              Static assets and branding
types/               Shared TypeScript route/component contracts
```

## API Route Ownership (`app/api`)

- `intake-profile/route.ts`: exchanges an opaque WhatsApp invitation token for a client profile through a server-side endpoint.
- `generate-agora-token/route.ts`: builds RTC+RTM token via `buildTokenWithRtm`.
- `invite-agent/route.ts`: validates input/env, configures and starts the agent session, attaches a server-configured avatar adapter when available, and otherwise starts explicit audio-only fallback.
- `naranjo-score/route.ts`: validates ten categorical Naranjo answers and returns a deterministic, stateless score result to the Agora tool call.
- `stop-conversation/route.ts`: stops agent and handles idempotent already-stopping cases.
- `chat/completions/route.ts`: optional OpenAI-compatible SSE proxy for custom LLM path.

## Client Ownership (`components`)

- `LandingPage.tsx`: reads the scenario link, owns token/invite/RTM bootstrap, conversation lifecycle, and in-memory draft display.
- `ConversationComponent.tsx`: RTC join, mic publish, remote voice-agent audio subscribe/playback, toolkit init, transcript/metrics/issues state.
- `QuickstartConversationLayout.tsx`: in-call framing and slots.
- `QuickstartTranscriptPanel.tsx`: live transcript panel.
- `QuickstartPipelineMetrics.tsx`: latency chips from metrics stream.
- `ConnectionStatusPanel.tsx` + `ConversationErrorCard.tsx`: issue rendering/severity.
- `AgoraAvatarVideo.tsx`: subscribes to the remote user identified by `avatarUid`, renders its Agora video track, and reports connecting/connected/unavailable state.

## Shared Logic (`lib`)

- `chat-completions.ts`: server-side custom LLM SSE handler factory, shared by the route and contract tests.
- `agora.ts`: default constants (`DEFAULT_AGENT_UID`).
- `conversation.ts`: transcript normalization, spacing cleanup, timestamp normalization, visualizer state mapping.
- `patient-profile.ts`: empty and prefilled intake profile factories; an invitation profile may replace the default through `PatientIntakeForm.initialProfile`.
- `interview-prompt.ts`: scenario-specific greetings and Portuguese pharmacovigilance interview instructions.
- `avatar-config.ts`: server-only provider resolution, environment validation, and UID collision checks.
- `interview-flow.ts`: default/direct-link flow selection and pre-call profile/consent validation.
- `naranjo.ts`: the Naranjo point table, AgentKit REST tool definition, and extraction of the spoken score into the review draft.

## Validation and Tooling

- `scripts/verify-api-contracts.ts`: imports route handlers and validates contract behavior.
- `scripts/doctor.mjs`: local setup checks consumed by `pnpm run doctor`.
- `tailwind.config.ts`: includes `agora-agent-uikit` dist classes in content scan.

## Fast File Lookup

- Change agent prompt/greeting -> `lib/interview-prompt.ts`; model/VAD/voice -> `app/api/invite-agent/route.ts`.
- Change token policy/channel naming -> `app/api/generate-agora-token/route.ts`.
- Change transcript mapping behavior -> `lib/conversation.ts` + `components/ConversationComponent.tsx`.
- Change session bootstrap UX -> `components/LandingPage.tsx`.
- Change provider variables/identity mapping -> `lib/avatar-config.ts` and `.env.local.example`.
- Change remote avatar video lifecycle -> `components/AgoraAvatarVideo.tsx`.
- Change remote voice-agent audio playback and autoplay recovery -> `components/ConversationComponent.tsx`.
- Change Naranjo scoring weights/route contract -> `lib/naranjo.ts`, `app/api/naranjo-score/route.ts`, and `scripts/verify-api-contracts.ts`.

## Additional Component Roles

- `QuickstartPreCallCard.tsx`: start CTA and pre-call messaging.
- `PatientIntakeForm.tsx`: agent selection, chat-style profile confirmation, and consent before session start; follow-up is the default.
- `OuviraIdentity.tsx`: Ouvira logo and local vector portraits for the Clara/Miguel voice options.
- `CaseDraftReview.tsx`: editable, memory-only pharmacist draft with the original transcript and pending fields.
- `QuickstartConversationLayout.tsx`: shared in-call composition shell.
- `MicrophoneSelector.tsx`: input-device selection UI.
- `ConnectionStatusPanel.tsx`: summary + detailed connection issue panel.
- `ErrorBoundary.tsx`: runtime guardrail for conversation subtree.

## Type Contract Locations

- `types/conversation.ts`: request/response payloads and component prop types.
- `AgentResponse` adds `avatar_uid`, `avatar_enabled`, `avatar_status`, and optional `avatar_message`; the browser contract contains no provider secrets.
- `types/env.d.ts`: typed environment variable expectations.
- `types/jsx.d.ts` and `react-jsx.d.ts`: JSX typing support details.

## Static and Styling Assets

- `public/*`: app and Agora icons/logos plus heading SVG assets used in pre-call/in-call experience.
- `app/globals.css` and `styles/globals.css`: baseline theme/layout styles.
- `tailwind.config.ts`: utility class scan and theme extension.

## Verification Path Mapping

- API contract behavior test: `scripts/verify-api-contracts.ts`.
- Environment and prerequisites check: `scripts/doctor.mjs`.
- Aggregate check chain: `pnpm run verify` script in `package.json`.

## Ownership Boundaries

- `components/` owns client runtime lifecycle and UI state.
- `app/api/` owns privileged operations needing app certificate.
- `lib/` owns reusable helpers; `chat-completions.ts` is server-side only.
- `docs/` owns human-facing implementation narrative and runbooks.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Cross-file call path during start/stop.
- [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) — Official baseline map for recreating the quickstart recipe.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Mapping and rendering flow from toolkit events.
