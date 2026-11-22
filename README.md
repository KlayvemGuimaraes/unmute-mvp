# Ouvira — farmacovigilância com conversa por voz

[![Build](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs/actions/workflows/build-check.yml/badge.svg)](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs/actions/workflows/build-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

Ouvira organiza informações sobre suspeitas de reações adversas a medicamentos para revisão farmacêutica. Next.js controla a interface e Agora Conversational AI transporta a sessão de voz/vídeo, a transcrição e as métricas. O vídeo usa um provider de avatar compatível quando estiver configurado.

## Prerequisites

- [Node.js 22+](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation)
- [Agora CLI](https://github.com/AgoraIO-Community/cli)

## Run It

Getting started is quick and easy: install the CLI _(skip if you already have it)_ , scaffold the Next.js quickstart using the Agora CLI, install dependencies, and run.

1. **Install the Agora CLI and sign in**
   _(skip if `agora` is already on your PATH)_:

   macOS and Linux:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh -s -- --add-to-path
   ```

   Windows PowerShell:

   ```powershell
   irm https://dl.agora.io/cli/install.ps1 | iex
   ```

   If the Windows install command fails in PowerShell, try running the macOS/Linux command from [Git Bash](https://git-scm.com/downloads/win), then open a new terminal and run `agora --help` to confirm the CLI is on your PATH.

   Then verify and sign in:

   ```bash
   agora --help
   agora login
   ```

   If `agora --help` is not found after install, close and reopen your terminal, then try again. If it still fails, check that the installer-added Agora CLI location is on your shell `PATH`.

2. **Scaffold and run**
   `agora init` clones the starter, binds an Agora project, and writes `.env.local`. (replace `ouvira-app` with your own project name):

   ```bash
   agora init ouvira-app --template nextjs
   cd ouvira-app
   pnpm install
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) and click **Start conversation**.

If the agent does not join or transcripts do not appear, run **`agora project doctor --deep`** to check credentials, feature enablement, network reachability, and local env binding.

### Working from a clone of this repository

Use this path if you already cloned **this** repo (for example to contribute or fork):

```bash
git clone https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs.git
cd agent-quickstart-nextjs
agora login
agora project use <your-project>
pnpm install
agora project env write .env.local
agora project doctor --deep
pnpm dev
```

### Deploy to Vercel

To populate Vercel env vars from your bound Agora project:

```bash
agora project use <your-project>
agora project env write .env.local
rg "^(NEXT_PUBLIC_AGORA_APP_ID|NEXT_AGORA_APP_CERTIFICATE)=" .env.local
```

Copy those two values into Vercel Project Settings -> Environment Variables.

### Environment variables

Defined in [`env.local.example`](env.local.example).

| Variable                     | Required | Notes                                                            |
| ---------------------------- | :------: | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_AGORA_APP_ID`   |    ✅    | Agora Console → Project → App ID.                                |
| `NEXT_AGORA_APP_CERTIFICATE` |    ✅    | Agora Console → Project → App Certificate. **Server-side only.** |
| `NEXT_PUBLIC_APP_URL` | For scoring in production | Public HTTPS origin that Agora can reach for `/api/naranjo-score`. |
| `NEXT_AGORA_AVATAR_*`        | Optional | External provider settings for live video; see below. **Server-side only.** |
| `NEXT_WHATSAPP_PROFILE_API_URL` / `NEXT_WHATSAPP_PROFILE_API_KEY` | Optional | Server-side profile lookup for WhatsApp invitation tokens. |

For audio-only mode, the agent uses Agora-managed STT, LLM, and TTS, so no extra vendor API keys are required. The pharmacovigilance interview runs in Brazilian Portuguese (`pt-BR`); Miguel and Clara select different Portuguese MiniMax voices for the same collection script.

## Commands

```bash
# Dev
pnpm dev                # start the Next.js dev server

# Quality
pnpm run lint           # eslint
pnpm run typecheck      # tsc --noEmit
pnpm run doctor         # local prereqs + env binding

# CI / pre-ship
pnpm run verify:api     # API contract checks
pnpm run build          # production build
pnpm run verify         # doctor + lint + typecheck + verify:api + build
```

Run `pnpm run verify` before shipping changes — it covers local prerequisites, lint, type safety, the core API route contracts, and the production build.

## Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./system-architecture-dark.svg">
  <img src="./system-architecture.svg" alt="System architecture">
</picture>

The browser fetches a combined RTC + RTM token (`buildTokenWithRtm`) from this app, joins the channel using a single RTC client, and uses RTM as the data channel for transcript, agent state, metrics, and error events. The Conversational AI Engine joins the same channel as the shared agent UID in [`lib/agora.ts`](lib/agora.ts) and runs the STT → LLM → TTS pipeline in Agora Cloud.

## What You Get

- browser voice client built with Next.js App Router
- RTC audio plus RTM transcript and state events
- server routes for token generation, invite, and stop
- [`AgentVisualizer`](https://agoraio-conversational-ai.github.io/agent-uikit/) for agent state and a built-in transcript panel for live turns
- per-stage latency header driven by `AGENT_METRICS`
- Agora-managed default STT, LLM, and TTS configuration
- optional external avatar video stream over Agora RTC

## Ouvira | entrevista farmacovigilante

The app defaults to the follow-up flow. The direct link `/?flow=report-reaction` still opens the patient-initiated suspected-reaction flow, while `/?flow=follow-up` opens follow-up explicitly. Without an invitation token, the page opens with a prefilled profile. WhatsApp links can replace it with the profile returned by the configured server endpoint. The first screen offers Clara or Miguel; the second presents a chat-style profile confirmation and the audio/transcript notice before starting. CPF and RG are masked until correction is requested, and explicit profile confirmation and audio consent are required before starting.

Ouvira uses a white and medical-blue interface with portraits for Miguel and Clara. Those portraits identify the voice choice; they are not live video. During a conversation, real avatar video enters the Agora RTC channel through a configured external provider. CPF, RG and the remaining profile fields stay in browser memory; for follow-up, only the confirmed medication label is included in the agent invite. Audio and transcript pass through Agora to provide the voice service. The app does not save data to a database or submit reports to VigiMed/VigiFlow.

WhatsApp links use `?intake_token=<token>` with a short-lived, single-use opaque token. Never put CPF or RG in a link. When `NEXT_WHATSAPP_PROFILE_API_URL` and `NEXT_WHATSAPP_PROFILE_API_KEY` are configured, `POST /api/intake-profile` sends `{ "token": "..." }` to that server-side endpoint with a Bearer key. The upstream JSON response must contain `patientName` and `patientAge`; it may also contain `patientCpf`, `patientRg`, `patientSex`, `patientHealthPlan`, `patientWeight` and `patientMedications`, either at the root or inside a `profile` object. The browser removes the token from its address bar after handoff. If settings are absent or lookup fails, the user can complete the fields manually.

The agent introduces itself as an Ouvira agent, asks the person to confirm the prefilled profile, then follows the medication follow-up sequence. If a reaction is reported, it asks the applicable Naranjo questions and calls the stateless `/api/naranjo-score` endpoint for deterministic scoring. The scale estimates probability; it does not diagnose or confirm/exclude causality. A score of 1 or higher triggers advice to contact a doctor or health plan for professional evaluation; scores at or below 0 are described as “improvável” with the information available, without ruling out a reaction. A pharmacist reviews the transcript and draft. The session starts only after profile confirmation and explicit audio/transcription consent. No report is sent to an official service.

Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin so the Agora agent service can call the scoring endpoint. For a local real-agent session, use a public HTTPS tunnel and set this variable to that URL; `localhost` is not reachable from the Agora service. The score endpoint requires a server-generated Bearer token derived from the Agora App Certificate, accepts only ten `yes`/`no`/`unknown` answers, stores nothing, and does not receive profile identifiers.

### Agora avatar video configuration

Voice works without an avatar provider. If one is not configured or cannot start, the session returns an explicit audio-only state; the UI does not label a placeholder as live video. Video is considered connected only after the selected remote Agora user's first video frame is decoded.

Set these server-side variables to enable provider video:

| Variable | Purpose |
| --- | --- |
| `NEXT_AGORA_AVATAR_PROVIDER` | `tavus`, `generic`, `liveavatar`, or `auto`. `auto` checks Tavus, LiveAvatar, then Generic. |
| `NEXT_AGORA_AVATAR_API_KEY` | Provider API key shared by the two configured identities; server-side only. |
| `NEXT_AGORA_AVATAR_BASE_URL` | Required for Generic Avatar. Tavus uses the Agora documented Tavus Agora endpoint in the adapter. |
| `NEXT_AGORA_CLARA_AVATAR_ID` / `NEXT_AGORA_MIGUEL_AVATAR_ID` | Valid avatar ID from the selected provider for each persona. |
| `NEXT_AGORA_CLARA_UID` / `NEXT_AGORA_MIGUEL_UID` | Distinct decimal Agora RTC UIDs for the two video publishers. |

Set the selected provider, shared key, and separate Clara/Miguel avatar IDs and UIDs in `.env.local` or the server-side deployment environment. Generic also needs its provider API base URL. Never put a key in `NEXT_PUBLIC_*`. Avatar UIDs must differ from each other, the voice-agent UID `123456`, and the user's RTC UID; token generation rejects configured collisions. `AgentResponse` reports `avatar_uid`, `avatar_enabled`, `avatar_status`, and `state`. A real video session has `avatar_enabled: true`, a distinct `avatar_uid`, and a connected remote Agora video stream in the client.

LiveAvatar requires 24 kHz TTS according to the Agora SDK. The installed managed MiniMax TTS configuration does not expose a sample-rate setting, so selecting LiveAvatar currently falls back to audio-only. Use Tavus or Generic until the voice pipeline can guarantee 24 kHz. To test without provider credentials, leave `NEXT_AGORA_AVATAR_PROVIDER` blank and confirm the message “Vídeo do avatar indisponível. A conversa por voz continua ativa.”

## How It Works

1. After explicit consent, the browser requests an RTC + RTM token from `/api/generate-agora-token`.
2. The backend invites an Agora cloud agent with `/api/invite-agent` and optionally attaches the configured avatar provider.
3. The browser joins the channel, publishes mic audio, subscribes to and plays the voice agent's remote audio track, and subscribes to the selected remote avatar video UID when enabled.
4. The client receives transcript, agent state, and `AGENT_METRICS` (per-stage latency) events over RTM. If browser autoplay is blocked, the conversation view offers an explicit audio activation button.
5. When a reaction is suspected, Agora invokes the same app's `/api/naranjo-score` route using the public URL; that route returns the deterministic score and category to the agent.
6. On end, the client calls `/api/stop-conversation`, logs out RTM, and unmounts the call view so Agora React hooks clean up RTC publish/join and the local microphone track.

## Optional BYOK

The voice-only `.env.local` setup needs only Agora credentials. Avatar credentials are optional and configured above. For a separate BYOK STT/LLM/TTS migration, uncomment the matching snippet in [`app/api/invite-agent/route.ts`](app/api/invite-agent/route.ts) and add its variables to your local environment.

```bash
# Deepgram STT
NEXT_DEEPGRAM_API_KEY=...

# OpenAI-compatible LLM
NEXT_LLM_URL=https://api.openai.com/v1/chat/completions
NEXT_LLM_API_KEY=...

# ElevenLabs TTS
NEXT_ELEVENLABS_API_KEY=...
NEXT_ELEVENLABS_VOICE_ID=...
```

## Repo Map

- `app/api/generate-agora-token/route.ts` — issues RTC + RTM tokens
- `app/api/intake-profile/route.ts` — resolves an opaque WhatsApp invitation token through a server-side profile endpoint
- `app/api/naranjo-score/route.ts` — validates ten categorical answers and returns a stateless Naranjo score
- `app/api/invite-agent/route.ts` — starts the agent session and configures voice and pipeline; the interview script is in `lib/interview-prompt.ts`
- `lib/naranjo.ts` — Naranjo scoring matrix, agent tool contract, and score extraction for the local draft
- `lib/avatar-config.ts` — selects/validates optional server-side avatar provider settings and unique UIDs
- `components/AgoraAvatarVideo.tsx` — renders the selected remote Agora video stream and accessible fallback state
- `app/api/stop-conversation/route.ts` — stops the agent session
- `components/LandingPage.tsx` — entry point: token fetch, RTM login, conversation lifecycle
- `components/PatientIntakeForm.tsx` — agent selection, chat-style profile confirmation, and consent; follow-up is the default
- `components/OuviraIdentity.tsx` — Ouvira logo and local voice-choice portraits
- `components/CaseDraftReview.tsx` — session-only pharmacist draft and source transcript
- `components/ConversationComponent.tsx` — RTC client, transcript state, `AGENT_METRICS`, mic release
- `components/QuickstartConversationLayout.tsx` — in-call header, transcript rail, controls dock
- `components/QuickstartPipelineMetrics.tsx` — per-stage latency chips in the header
- `components/QuickstartTranscriptPanel.tsx` — live transcript rail
- `components/QuickstartPreCallCard.tsx` — pre-call hero card
- `lib/chat-completions.ts` — server-side custom LLM SSE handler used by the chat completions route
- `lib/conversation.ts` — transcript normalization and visualizer state mapping
- `AGENTS.md` — primary agent-facing guide

## Troubleshooting

- **Agent does not join or transcripts are missing:** run `agora project doctor --deep`.
- **`pnpm run doctor` fails:** run `agora project env write .env.local`, then retry.
- **Manual clone / env values:** `agora project use <your-project>` then `agora project env write .env.local`.
- **RTM login fails:** keep [`app/api/generate-agora-token/route.ts`](app/api/generate-agora-token/route.ts) on `RtcTokenBuilder.buildTokenWithRtm` — RTC-only tokens will not satisfy `rtm.login`.
- **Transcript speakers inverted:** check the `uid === "0"` remap in [`components/ConversationComponent.tsx`](components/ConversationComponent.tsx).
- **Agent transcript appears but speech is silent:** check the “Voz do agente” status, allow browser audio playback with the activation button, then confirm the remote agent audio track is being subscribed in `components/ConversationComponent.tsx`.
- **Agent never appears in channel:** ensure the shared agent UID in [`lib/agora.ts`](lib/agora.ts) is used by both the client and invite route.

## More Docs

- [docs/ai/L0_repo_card.md](./docs/ai/L0_repo_card.md)
- [docs/ai/RECIPE.md](./docs/ai/RECIPE.md)
- [AGENTS.md](./AGENTS.md)

## Contributing

Pull requests welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and conventions.

## Security

Please do **not** open public issues for security reports. Email security@agora.io with details and reproduction steps.

## License

Released under the [MIT License](./LICENSE).
