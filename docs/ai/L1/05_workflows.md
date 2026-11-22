# 05 Workflows

> Repeatable task recipes for common quickstart changes and validation loops.

## Run Locally

1. `pnpm install`
2. `agora login`
3. `agora project use <your-project>`
4. `agora project env write .env.local`
5. `pnpm run doctor`
6. `pnpm run dev`

If start fails, run `agora project doctor --deep`.

## Change Agent Behavior

Prompt file: `lib/interview-prompt.ts`. Session configuration: `app/api/invite-agent/route.ts`.

Typical edits:

- Pharmacovigilance interview prompt and greeting in `lib/interview-prompt.ts`.
- Deterministic Naranjo scoring contract in `lib/naranjo.ts` and `app/api/naranjo-score/route.ts`.
- Portuguese voice mapping for Miguel and Clara in the same route.
- Shared agent UID (`DEFAULT_AGENT_UID` in `lib/agora.ts`).
- VAD (`turnDetection.config.*`).
- STT/LLM/TTS model/provider blocks.
- External avatar provider selection and UID validation in `lib/avatar-config.ts`.

Validation path:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run verify:api`
4. `pnpm run build`

## Change Token or Session Bootstrap

Token behavior:

- Edit `app/api/generate-agora-token/route.ts`.
- Preserve RTM-capable token generation.

Bootstrap behavior:

- Edit `components/LandingPage.tsx`.
- Keep invite + RTM setup parallelized before conversation mount.
- Keep the session blocked until explicit audio/transcript consent; a voice-agent invite failure must leave the pre-call form mounted with a clear error.

Avatar video behavior:

- Add provider environment names and IDs in `env.local.example`; keep secrets server-only.
- Edit `lib/avatar-config.ts` for provider selection, required IDs/base URL, and UID conflict checks.
- Edit `components/AgoraAvatarVideo.tsx` for remote RTC subscribe/render lifecycle.
- Preserve audio-only fallback. The client reports video connected only after first-frame decode for the configured remote UID.
- Keep remote voice-agent audio subscribed and played through `useRemoteAudioTracks`/`useAutoPlayAudioTrack`; if autoplay is blocked, preserve the explicit activation button and status.

Naranjo scoring behavior:

- The agent asks the ten applicable questions one at a time and uses `unknown` when the patient does not know or a factor does not apply.
- `calculate_naranjo_score` sends only the categorical answers to `/api/naranjo-score`; that route performs the fixed point calculation and stores no data.
- In production, set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin so Agora can reach the scoring route. A local route requires a public tunnel during live-agent testing.
- Treat the result as probability for pharmacist review, not diagnosis or proof of causality. The patient-facing branch currently uses score `>=1` for a recommendation to contact a doctor/health plan; score `<=0` is worded as unlikely with the available facts, not as exclusion.

## Change Transcript Rendering

1. Update transforms in `lib/conversation.ts`.
2. Update wiring in `components/ConversationComponent.tsx`.
3. Ensure `IN_PROGRESS` is separated from history, `INTERRUPTED` retained in history.
4. Re-check [transcript_pipeline.md](L2/transcript_pipeline.md) for consistency.

## Ship-Readiness Workflow

1. Run `pnpm run verify`.
2. Confirm docs alignment (`README`, guides, `AGENTS`, `docs/ai`).
3. Use conventional commit and branch naming.

## Progressive Disclosure Doc Workflow

- `generate docs`: create `docs/ai/` tree when absent.
- `update docs`: refresh after workflow/interface/security changes.
- `test docs`: execute question-based validation and write `docs/ai/test-results.md`.
- `fix docs`: close findings from `docs/ai/test-results.md` or a docs review.

## Workflow: Implement a Baseline Recipe Repo

1. Treat this repo as the official Agora Next.js quickstart baseline.
2. Do not recreate Agora ConvoAI integration from memory.
3. Follow [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) for the implementation map and checklist.
4. Preserve the recipe invariants in `docs/ai/RECIPE.md`.
5. Run the verification commands before publishing a derivative.

## Workflow: Add a New API Route

1. Add route under `app/api/<route-name>/route.ts`.
2. Define payload types in `types/conversation.ts` if shared with client.
3. Add/update contract verification in `scripts/verify-api-contracts.ts`.
4. Run `pnpm run verify:api` and `pnpm run typecheck`.
5. Update `README.md` and `docs/ai/L1/06_interfaces.md`.

## Workflow: Modify Transcript UX

1. Update transforms in `lib/conversation.ts`.
2. Update render usage in transcript/layout components.
3. Validate edge states (`IN_PROGRESS`, `INTERRUPTED`, empty history).
4. Reconcile guidance in [transcript_pipeline.md](L2/transcript_pipeline.md).
5. Run `pnpm run lint` and `pnpm run build`.

## Workflow: Enable BYOK Provider Path

1. Uncomment relevant provider block in invite route.
2. Add the provider variables shown in the lower README BYOK section to your local environment.
3. Keep default no-key path intact for baseline quickstart behavior.
4. Keep optional BYOK STT/LLM/TTS variables out of `env.local.example`; avatar-provider variables are documented there because they are an app feature.
5. Re-run `pnpm run verify` before shipping.

## Workflow: Docs Refresh After Runtime Changes

1. Update L1 files matching changed subsystem.
2. Update or add L2 deep dives if L1 explanation exceeds concise bounds.
3. Bump `Last Reviewed` in `L0_repo_card.md`.
4. Re-run docs test and append retest notes for any fixes.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Full runtime sequence for bootstrap and teardown tasks.
- [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) — Baseline implementation checklist for recipe consumers.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Required checks when editing transcript flow.
