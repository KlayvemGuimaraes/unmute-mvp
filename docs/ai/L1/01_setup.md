# 01 Setup

> Environment setup, commands, and safe verification flow for this quickstart.

## Runtime Requirements

- Node.js `>=22` (`package.json` engines field).
- `pnpm` package manager.
- Agora CLI (`agora`) for project binding and environment bootstrap.
- Agora project with Conversational AI enabled.

Install the Agora CLI from the root `README.md` instructions. On Windows, use the PowerShell installer first; if it fails, run the shell installer from Git Bash and then verify with `agora --help`.

## Install and Bootstrap

1. Install dependencies.
2. Bind an Agora project.
3. Write `.env.local`.
4. Verify setup before running.

```bash
pnpm install
agora login
agora project use <your-project>
agora project env write .env.local
agora project doctor --deep
```

## Required Environment Variables

- `NEXT_PUBLIC_AGORA_APP_ID`: Agora project App ID.
- `NEXT_AGORA_APP_CERTIFICATE`: Agora App Certificate (server only).

Voice-only mode needs only these Agora credentials. Optional video requires a provider key, one provider avatar ID and one distinct Agora UID per selected persona; Generic Avatar also needs its API base URL. See the avatar setup table in the root README and the blank values in `env.local.example`. Provider keys are server-only. Without complete video settings, the app starts an explicitly audio-only session.

## Primary Commands

```bash
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run verify:api
pnpm run build
pnpm run verify
```

## Verification Safety

Safe without live session:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run verify:api`
- `pnpm run build`

Requires env/project binding:

- `pnpm run doctor`
- `pnpm run verify`

## Local Run Notes

- App + API routes run at `http://localhost:3000`.
- Session starts from `QuickstartPreCallCard` (`Try it now`) and bootstraps token + RTM + invite flow.
- If transcript or agent join fails, first run `agora project doctor --deep`.

## CI Expectations

- Build workflow badge exists in root `README.md`.
- Pre-ship expectation: `pnpm run verify` passes.
- Route contract tests are executed by `scripts/verify-api-contracts.ts`.

## Troubleshooting Matrix

| Symptom | Probable Cause | First Check | Fix Path |
| --- | --- | --- | --- |
| Agent never joins | Invite route or env mismatch | `pnpm run doctor` and invite route logs | Verify the shared agent UID and invite payload |
| Transcript missing | RTM token capability missing | Token route implementation | Ensure `buildTokenWithRtm` remains unchanged |
| `verify` fails at doctor | Project not bound | `agora project use` output | Re-bind project and rewrite `.env.local` |
| Voice agent does not start | Invite request or Agora credentials failed | Startup error on pre-call screen | Check `pnpm run doctor`, server logs, and `/api/invite-agent` status |
| Voice works but no avatar video | Provider missing/failed or avatar UID did not publish | Separate video status in call view | Check `avatar_enabled`, `avatar_uid`, provider IDs and unique Agora UIDs |

## Local-Only vs Deploy-Specific

Local:

- Uses `.env.local` created by `agora project env write`.
- Uses the default Next.js Turbopack development server via `next dev`.
- Best for flow debugging and transcript behavior checks.

Vercel:

- Requires environment vars configured per environment scope.
- Keep `NEXT_AGORA_APP_CERTIFICATE` private server variable.
- Keep all `NEXT_AGORA_AVATAR_*` secrets in server-side environment variables.
- Use `pnpm run build` locally before pushing deployment changes.

## Setup Change Checklist

When setup docs/config change:

1. Update `README.md` environment/commands sections.
2. Update `env.local.example` if variable set changes.
3. Update `docs/ai/L1/01_setup.md` and `L0_repo_card.md` `Last Reviewed`.
4. Run at least `pnpm run typecheck` and `pnpm run verify:api`.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Full start/join/teardown sequence.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — RTM transcript/event pipeline internals.
