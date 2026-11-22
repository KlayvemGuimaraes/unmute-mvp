# Agent Development Guide

This guide is for coding agents making changes in `agent-quickstart-nextjs`.

## How to Load

This repository uses progressive disclosure documentation. Docs live under `docs/ai/` in three levels.

1. Read [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md) to identify the repo.
2. Load ALL 8 files in [docs/ai/L1/](docs/ai/L1/). They are small — load all upfront.
3. Follow L2 deep-dive links only when L1 isn't detailed enough. The index is at [docs/ai/L1/L2/_index.md](docs/ai/L1/L2/_index.md).

This repo declares `Recipe Role: base` in L0, so also read [docs/ai/RECIPE.md](docs/ai/RECIPE.md) when evaluating extension points, invariants, or stable contracts.

The sections below (Start Here, Patterns, Anti-Patterns, etc.) remain the canonical contributor handbook for hands-on work; the `docs/ai/` tree is the structured summary used by AI agents.

## Start Here

- Read [README.md](./README.md) for setup, commands, verification, and deployment.
- Use [docs/ai/RECIPE.md](docs/ai/RECIPE.md) for the base quickstart recipe contract.
- Use [docs/ai/L1/L2/from_scratch_bootstrap.md](docs/ai/L1/L2/from_scratch_bootstrap.md) for the baseline implementation map.
- Use [docs/ai/L1/L2/transcript_pipeline.md](docs/ai/L1/L2/transcript_pipeline.md) for transcript and RTM behavior.
- For layout and responsibilities inside `components/`, `app/api/`, and `lib/`, use [docs/ai/L1/03_code_map.md](docs/ai/L1/03_code_map.md) and [docs/ai/L1/02_architecture.md](docs/ai/L1/02_architecture.md).

## Current System Shape

- App shell: Next.js 16 App Router, React 19, and TypeScript
- Client RTC: `agora-rtc-react` hooks over `agora-rtc-sdk-ng`
- Messaging: `agora-rtm` for transcripts, agent state, metrics, and error events
- Toolkit core: `agora-agent-client-toolkit` for `AgoraVoiceAI`, transcript helpers, and turn status
- UI components: `agora-agent-uikit` for visualizer, transcript, and mic controls
- Server SDK: `agora-agents` for managed agent session startup
- API routes: token generation, intake profile, agent invite, chat, and stop routes live in `app/api`
- Agent config: Agora-managed STT, LLM, and TTS by default, optional server-side OpenAI BYOK for the LLM, Brazilian Portuguese pharmacovigilance intake with Miguel/Clara voices, and optional external Agora-compatible avatar provider; Protoface uses the official AgentKit adapter available in `agora-agents` 2.15+
- Visual identity: Ouvira logo, white and medical-blue palette, and local vector portraits for Clara and Miguel; real in-call video comes only from a connected remote Agora avatar stream

## Supported Modes

### Local Development

- Run from the repo root with `pnpm run dev`.
- Next.js serves the app and the route handlers at `http://localhost:3000`.
- Local credentials are read from `.env.local`, usually written by `agora project env write .env.local`.

### Vercel Deployment

- Deploy the repository as a single Next.js app.
- Set `NEXT_PUBLIC_AGORA_APP_ID` and `NEXT_AGORA_APP_CERTIFICATE` in the deployment target.
- Keep `NEXT_AGORA_APP_CERTIFICATE` server-side only.

## Routing / Ownership

- UI and RTC/RTM client lifecycle live in `components`.
- Browser-facing API routes live in `app/api`.
- Shared constants and transcript normalization live in `lib`.
- If a workflow, request contract, or ownership boundary changes, update `README.md`, `AGENTS.md`, and the relevant `docs/ai/` files in the same change.

## Key Files

- `app/api/generate-agora-token/route.ts`: issues RTC + RTM tokens for the browser user.
- `app/api/intake-profile/route.ts`: resolves a short-lived opaque WhatsApp invite token through a server-side profile endpoint.
- `app/api/invite-agent/route.ts`: validates interview context and starts the managed agent session; edit `lib/interview-prompt.ts` for interview scripts, and this route for VAD, model, or voice changes.
- `app/api/naranjo-score/route.ts`: validates the ten categorical Naranjo answers and returns a deterministic stateless score to the Agora tool.
- `lib/avatar-config.ts`: server-only avatar provider selection, environment validation, and collision-free UID mapping.
- `app/api/stop-conversation/route.ts`: stops the agent session.
- `app/api/chat/completions/route.ts`: optional OpenAI-compatible SSE proxy for a custom LLM (not wired by default).
- `components/LandingPage.tsx`: token and RTM bootstrap, provider wiring, and conversation lifecycle; it returns the confirmed profile to the form if microphone or agent startup fails.
- `components/ConversationComponent.tsx`: joins RTC and publishes the mic before inviting the agent, subscribes to avatar and voice-agent audio with fallback selection, then manages video, `AgoraVoiceAI`, transcript state, and renewals.
- `components/QuickstartConversationLayout.tsx`: in-call header, transcript rail, and controls dock.
- `components/QuickstartPipelineMetrics.tsx`: per-stage latency chips from `AGENT_METRICS`.
- `components/QuickstartTranscriptPanel.tsx`: live transcript rail.
- `components/AgoraAvatarVideo.tsx`: subscribes and renders the selected remote avatar video stream, confirms a decoded/rendered first frame, and shows receive stats when video stays unavailable.
- `components/PatientIntakeForm.tsx`: agent selection, chat-style prefilled profile confirmation, and audio notice.
- `components/OuviraIdentity.tsx`: Ouvira logo and the local vector portraits used for voice selection.
- `components/CaseDraftReview.tsx`: in-memory pharmacist review draft; no database or official submission.
- `lib/chat-completions.ts`: server-side custom LLM SSE handler factory; the route only exports `POST`.
- `lib/agora.ts`: shared agent UID defaults.
- `lib/naranjo.ts`: score weights, AgentKit REST tool definition, and extraction of the stated result into the local draft.
- `lib/interview-prompt.ts`: Portuguese greetings and scenario-specific pharmacovigilance instructions.
- `lib/interview-flow.ts`: follow-up default and pre-call data/consent validation shared with contract checks.
- `lib/conversation.ts`: transcript normalization and visualizer state mapping.
- `env.local.example`: local environment template.
- Optional `NEXT_AGORA_AVATAR_*` variables enable video; for Protoface, use `NEXT_AGORA_AVATAR_PROVIDER=generic` and the official `Protoface` adapter in `agora-agents` 2.15+. Its endpoint defaults to `https://api.protoface.com/v1/agora`. Set the provider to `disabled` (or leave it blank) to force voice-only sessions. Missing/incomplete configuration also keeps the session audio-only. Provider keys stay server-side and avatar UIDs differ from the voice agent and requesting user.
- Optional `NEXT_OPENAI_API_KEY` switches the LLM from Agora-managed OpenAI to the user's OpenAI account; keep it server-side and document the separate provider billing.
- `scripts/verify-api-contracts.ts`: route contract verification.

## Patterns

### StrictMode Guard (`isReady`)

Both `useJoin` and `useLocalMicrophoneTrack` are gated by `isReady` to prevent double initialization in React StrictMode dev mode. The cleanup fires synchronously before any `setTimeout`, so only the real second mount's timer fires.

```tsx
const [isReady, setIsReady] = useState(false);
useEffect(() => {
  let cancelled = false;
  const id = setTimeout(() => {
    if (!cancelled) setIsReady(true);
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(id);
    setIsReady(false);
  };
}, []);
const { isConnected: joinSuccess } = useJoin(config, isReady);
const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady);
```

### Hook Ownership

- `useJoin` owns `client.leave()`; never call it manually.
- `useLocalMicrophoneTrack` owns track lifecycle; do not manually call `.close()`.
- `usePublish` owns publish state; mute with `track.setEnabled()` and do not manually unpublish.

### AgoraVoiceAI Init

Initialize `AgoraVoiceAI` from `agora-agent-client-toolkit` inside `ConversationComponent`, gated on `isReady && joinSuccess`.

```tsx
useEffect(() => {
  if (!isReady || !joinSuccess) return;
  // AgoraVoiceAI.init() is called here exactly once.
}, [isReady, joinSuccess]);
```

`isReady` becomes true only after the StrictMode fake-unmount cycle completes. Once `isReady` is true, React does not double invoke the effect for later dependency changes such as `joinSuccess` becoming true.

### Transcript and UI Mapping

- Manage `transcript` and `agentState` through `useState` plus `ai.on(TRANSCRIPT_UPDATED, ...)` and `ai.on(AGENT_STATE_CHANGED, ...)`.
- The toolkit uses `uid="0"` as a sentinel for the local user's speech. Remap that value to `client.uid` before passing messages into `QuickstartTranscriptPanel`, or user speech renders on the agent side.
- Include `INTERRUPTED` turns in `messageList`; filter only `IN_PROGRESS`. If the agent's first turn is interrupted and omitted, `messageList` stays empty and the transcript panel never shows that first turn.

### Tokens and Styling

- RTM token access must come from `RtcTokenBuilder.buildTokenWithRtm`; a standard RTC-only token does not grant RTM access.
- Tailwind must scan uikit classes with `./node_modules/agora-agent-uikit/dist/**/*.{js,mjs}` in `tailwind.config.ts`.

## Working Rules

- Prefer the smallest change that keeps the quickstart copyable and production-style.
- Keep RTC client creation StrictMode-safe with `useRef`, not `useMemo`.
- Keep token generation on `RtcTokenBuilder.buildTokenWithRtm`.
- Do not claim the avatar is live until the selected remote Agora video stream renders its first frame; keep the explicit audio-only fallback state.
- Keep transcript UID remapping aligned with the toolkit sentinel behavior.
- For Agora sessions with a configured avatar provider, prefer audio from `avatar_uid` when it publishes a track and fall back to `DEFAULT_AGENT_UID` if avatar audio is absent. Start the agent only after the browser has joined RTC and published its microphone.
- Keep remote voice audio subscribed independently from RTM; transcript output is not audio playback. Keep the header audio activation control and module labels on runtime error cards.
- Treat Naranjo scores as probability estimates for pharmacist review, not diagnoses or proof/exclusion of causality.
- Keep the voice-only flow free of third-party vendor keys; the optional avatar API key is required only when enabling external provider video.
- Keep README, AGENTS, and `docs/ai/` aligned with implementation changes.

## Commands

From the repo root:

```bash
pnpm install
pnpm run doctor
pnpm run dev
pnpm run verify
```

Useful narrower checks:

```bash
pnpm run lint
pnpm run typecheck
pnpm run verify:api
pnpm run build
```

## Verification Safety

- Safe without live Agora credentials:
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run verify:api`
  - `pnpm run build`
- Requires local env setup but not a live Agora session:
  - `pnpm run doctor`
  - `pnpm run verify`
- Often blocked inside restricted sandboxes because of port binding or process spawning:
  - `pnpm run dev`

## Anti-Patterns / What NOT To Do

- Do not call `client.leave()` manually; it breaks `useJoin` cleanup.
- Do not call `localMicrophoneTrack.close()` manually; it breaks hook ownership.
- Do not remove the `isReady` guard.
- Do not set `reactStrictMode: false` as a workaround.
- Do not use the deprecated `turnDetection.type: 'agora_vad'` flat API; use `turnDetection.config.start_of_speech` and `turnDetection.config.end_of_speech`.
- Do not replace `RtcTokenBuilder.buildTokenWithRtm` with an RTC-only token builder.
- Do not hide SDK requirements only in `CLAUDE.md`; all agent-facing guidance belongs in `AGENTS.md`.

## Done Criteria

Before finishing a change:

1. Run the narrowest relevant verification command.
2. For shipped app/runtime changes, ensure `pnpm run verify` passes.
3. If you changed files in `components/` or `app/api/`, verify that `README.md`, this file, and the relevant `docs/ai/` files still match the implementation.
4. Update root README and affected docs when workflow, request contracts, architecture, or environment guidance changes.
5. If the change touches workflows, interfaces, gotchas, or security details, update the matching file under [docs/ai/L1/](docs/ai/L1/) and bump `Last Reviewed` in [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md).

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance, version bumps), `test:` (test additions/changes), `docs:` (documentation)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `feat(api): add stop-conversation status flag`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"
- **PR number appended** — `feat: add feature (#123)`

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- **Examples:** `feat/agent-metrics`, `fix/transcript-uid`, `docs/progressive-disclosure`

### General rules

- **No AI tool names** — never mention claude, cursor, copilot, cody, aider, gemini, codex, chatgpt, or gpt-3/4 in commit messages or PR descriptions.
- **No Co-Authored-By trailers** — omit AI attribution lines.
- **No `--no-verify`** — let git hooks run normally.
- **No git config changes** — do not modify `user.name` or `user.email`.

## Doc Commands

| Command         | When to use                                                  |
| --------------- | ------------------------------------------------------------ |
| generate docs   | No `docs/ai/` directory exists yet                           |
| update docs     | Code changed since the `Last Reviewed` date in L0            |
| test docs       | Verify docs give agents the right context (writes `docs/ai/test-results.md`) |
| fix docs        | Close findings from a docs review or test run                |

The generator and tester live in the [AgoraIO-Community/ai-devkit](https://github.com/AgoraIO-Community/ai-devkit) skill set. See the [progressive disclosure standard](https://github.com/AgoraIO-Community/ai-devkit/blob/main/docs/progressive-disclosure-standard.md) for the full specification.
