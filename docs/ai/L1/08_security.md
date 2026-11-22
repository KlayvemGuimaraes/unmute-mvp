# 08 Security

> Security model, trust boundaries, secret handling, and safety controls for this quickstart.

## Trust Boundaries

- Browser is untrusted and never receives `NEXT_AGORA_APP_CERTIFICATE`.
- Browser never receives `NEXT_AGORA_AVATAR_API_KEY` or provider configuration secrets.
- Next.js server routes hold credentials and mint scoped, expiring tokens.
- Agora cloud executes the managed agent pipeline using server-issued credentials; a configured external avatar provider supplies video for the RTC session.

## Secret Handling Rules

- Keep `NEXT_AGORA_APP_CERTIFICATE` server-side only.
- Do not expose BYOK provider API keys to client bundles.
- Keep `NEXT_AGORA_AVATAR_API_KEY` server-side; avatar configuration is read only by server route handlers.
- Store secrets in `.env.local` for dev and deployment secret store in Vercel.
- `env.local.example` documents expected keys without real values.

## Token Security Model

- Tokens expire (default 1 hour).
- Token endpoint allows caller-provided UID/channel but still uses server secret signing.
- Renewal flow requests new RTC/RTM tokens near expiry.
- RTM capability is required and intentionally embedded by `buildTokenWithRtm`.

## Input Validation and Failure Handling

- Route handlers validate required fields and env availability.
- Avatar config validates provider name, selected persona ID, numeric UID, and conflicts with other reserved Agora users.
- Avatar failure is returned as unavailable audio-only state; the client does not infer video activity from a configured provider alone.
- Errors return structured JSON with bounded detail.
- Stop route treats already-stopping/not-found agent as idempotent success.

## Agent Behavior Safety

- Agent collects facts only, does not diagnose or recommend medication changes, and sends people with immediate danger signs to urgent local care.
- Naranjo-related answers remain unscored for pharmacist review.
- The two-step pre-call form discloses that audio/transcription pass through Agora; the app keeps the synthetic profile and draft in browser memory only and does not collect a full date of birth.
- Only scenario and avatar are sent in the invite request. Use synthetic profile details in this MVP.
- The external provider receives the configured avatar ID and session details needed to publish video. Only configure provider credentials/IDs for synthetic or approved avatar identities.

## Operational Security Practices

- Run `pnpm run verify` before release changes.
- Avoid logging secrets; current logs are operational and should remain non-secret.
- Use least-privilege project bindings when managing Agora environments.

## Known Limits

- This quickstart is a sample app; it does not implement user auth/tenant isolation.
- Transcript and draft live in client memory only; a browser refresh loses them. Agora processes the audio/transcript to provide voice service.
- The MVP does not submit to VigiMed/VigiFlow or connect to a patient-record system.
- If productionizing, add authenticated route access and per-user authorization checks.

## Security Review Checklist

1. Confirm `NEXT_AGORA_APP_CERTIFICATE` is never referenced in client files.
2. Confirm token minting still uses server route only.
3. Confirm route error payloads do not leak secrets.
4. Confirm BYOK keys are optional and remain server-side.
5. Confirm docs do not instruct users to expose secrets in public config.

## Threat Notes for This Sample

- Token misuse risk is bounded by token expiry but still requires secure key custody.
- Public start/stop endpoints are unauthenticated in sample form; production needs auth.
- RTM message payloads are parsed defensively but should be treated as untrusted input.

## Hardening Steps for Productionization

- Add authenticated identity and authorization to all mutation routes.
- Scope agent start permissions per user/session ownership.
- Add rate limiting for token and invite endpoints.
- Add request tracing IDs for security incident investigation.
- Add environment-specific secret rotation policy and monitoring.

## Deployment Secret Checklist (Vercel)

- `NEXT_PUBLIC_AGORA_APP_ID` set for all required environments.
- `NEXT_AGORA_APP_CERTIFICATE` set as server-side secret only.
- Optional `NEXT_AGORA_AVATAR_API_KEY` set as server-side secret only when enabling an external avatar provider.
- Optional BYOK keys set only when related provider block is enabled.
- Preview environments use non-production credentials.

## Security-Relevant Files

- `app/api/generate-agora-token/route.ts`
- `app/api/invite-agent/route.ts`
- `app/api/stop-conversation/route.ts`
- `env.local.example`
- `README.md` environment section

## Audit Trigger Events

Re-audit security docs when any of these change:

- token issuance logic
- agent start/stop route authorization assumptions
- environment variable set or naming
- provider integration path (default vs BYOK)

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Token issuance and renewal sequence details.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — RTM event surfaces and error propagation boundaries.
