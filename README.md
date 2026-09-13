# Starseed 21

RPCS questionnaire `starseed_quiz_min_v1`: 60 questions, comprising 19 bipolar,
20 best–worst, 15 crossed-priority and 6 counterfactual pairs. Application version
is `3.0.0`; the deployment model identifier is `RPCS-starseed-quiz-min-v1`.

## Local development

Use Node.js 22.13 or later (`node:sqlite` is used by API tests).

```sh
npm ci
npm test
npm run build
npm run db:local
npx wrangler dev --port 8787
```

Open `http://localhost:8787`. For frontend hot reload, run `npm run dev`;
Vite proxies `/api` to the local Worker on port 8787. Local attempts never write
to production. The sample report calls `/api/score`, which does not save answers.

## Scoring contract

The supplied `starseed_quiz_min_v1/quiz.json` and `scoring.mjs` remain unchanged.
`worker/rpcs-engine.mjs` ports that scorer with memoization of immutable
prototype/state vectors, avoiding repeated geometry construction in each request.
Parity tests compare every output and all seven scenarios to the supplied scorer.
`worker/rpcs.ts` validates all 60 answers before scoring, maps CP
`{operation, goal}` to `{a, b}`, and maps the new lineage codes to stable site IDs:
AD → AN, VE → VN, VG → VE, ZG → ZE. Civilization names, texts and routes stay unchanged.
CF answers are `{first: 'L' | 'R', second: 'L' | 'R'}`; both are required.

Ranking uses the reference scorer's order unchanged. For display, raw fit
[-1, 1] becomes `(fit + 1) * 50`; this is not the old structural T-score.
Scores do not sum to 100 and are not probabilities. Stability is the percentage
of seven settings that retain the original Primary. Pair-specific margin is a
separate calculation from the global first/second score gap; the UI explains
both. The new model does not supply the old percentiles, family-drop tests,
per-item contributions or 1,024-corner geometry, so none are fabricated in reports.
The full answer review remains available in questionnaire order.

`POST /api/score` accepts `{responses}` and returns `{modelVersion, result}`.
`POST /api/attempts` validates a versioned export and attempt metadata,
recomputes the same result and saves it in D1. Feedback requires the attempt token.
The server applies existing body size, origin and rate-limit checks. Source hashes
in `worker/rpcs-hashes.json` identify the supplied question/scorer files stored
with each attempt. Regenerate those hashes if either frozen source changes.

## Previous versions

Drafts and results use `starseed21-rpcs-v1-*` storage keys and export schema 4.
S4-RPD and earlier browser records remain untouched; their answers and result
links cannot be converted into the new questionnaire. Exported answers are
version checked. The previous scorer, types, model assets and parity tests remain
for historical verification; they are not used by the current API.
Existing D1 tables already support the versioned response object, so this release
requires no new migration and does not rewrite historical attempts.

## Release

1. Run `npm test` and `npm run build`.
2. Deploy the Worker with `npx wrangler deploy`.
3. Deploy Vercel with `npx vercel --prod --yes` using the linked project.
4. Verify `/api/health`, `/api/score` and `/sample` on the production domain.

Both frontend and API must use the same model version. Open old browser tabs
must reload for the new questionnaire. Retain the existing database on rollback.
