# Starseed 21

Current handoff: `STARSEED_WEB_HANDOFF_MIN 2`. The authoritative `quiz_model.json`
provides 60 seven-point bipolar questions. App version: `4.0.0`.
Scoring: `PRCS-v2.0`; selection: `V4-RPCB-60`.
Official fingerprint: `79dec38680e6f71004b88d0d2c4e8162622251277ae3f9b5a9bfaeb036ab2396`.

## Local development

Node.js 22.13 or later is required for API tests using node:sqlite.

```sh
npm ci
npm test
npm run build
npm run db:local
npx wrangler dev --port 8787
```

Open http://localhost:8787. Vite hot reload (`npm run dev`) proxies the API to
this local Worker. Sample/shared score requests do not save answers.

## Scoring and storage

`worker/prcs.ts` ports the supplied Python scorer without changing questions,
measurement axes, prototype weights, or Primary selection. It precomputes the
model-only codewords and evaluates the complete registered suite, including all
60 + 1,770 + 34,220 one/two/three-item dropout combinations for complete answers.

The Python smoke test is unchanged:
`python3 "STARSEED_WEB_HANDOFF_MIN 2/tests/smoke_test.py"` (requires NumPy).
`tests/fixtures/prcs-reference.json` contains Python outputs for all 21 canonical
codeword profiles and full, partial, midpoint and empty cases. Parity tests compare
every output within floating-point tolerance. Equivalent equal-gain notch witness
items can exchange order due to NumPy BLAS vs JavaScript rounding; the edit count,
competitor and each witness gain must match. Stable ranking/tie rules are retained.

POST /api/score accepts `{answers: {UID: 1..7 | null}}` or the direct UID object,
and returns the full authoritative JSON. Omitted/null means missing; 4 is answered
midpoint. A deployed-client compatibility path accepts complete `{responses}` and
returns the site's existing wrapper. Saved attempts still require all 60 answers.

The result adapter maps model codes to established story keys:
AD → AN, VE → VN, VG → VE, ZG → ZE. In particular Venusian and Vegan are distinct.
Civilization stories, names, categories, routes and celebrity content are unchanged.
Primary copy is selected solely by nominal Primary; no runner-up-specific lore is
generated. Similarity is displayed as (similarity + 1) × 50, not a probability or
T-score. Stability uses the registered suite status, not the previous seven-setting
percentage. Full raw output is retained in diagnostic.raw and persisted in D1.

Existing body limits, origin checks, rate limits, feedback token protection and
idempotency remain. Source hashes in worker/prcs-hashes.json are stored with attempts.
No D1 migration or historical data rewrite is needed.

## Previous versions and release

Draft/attempt keys are `starseed21-prcs-v2-*`; exports use schema 5.
Old browser records remain untouched; old answers cannot be applied to new UIDs.
Historical model sources/scorers remain available but are not used by the current API.

Run tests and build, deploy Worker with `npx wrangler deploy`, then frontend with
`npx vercel --prod --yes`. Wait for READY and verify production /api/health,
an unsaved /api/score, and /sample. Frontend and backend must use the same release.
