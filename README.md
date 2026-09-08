# Starseed 21

S4 Production Champion Final 60: 28 bipolar, 16 best-worst, and 16 crossed-priority
questions. Scoring Layer v4 with v4.1 interpretation is frozen in
`starseed_s4_web_handoff_v4_1_min/`. The model version is
`S21-scoring-v4.1-s4-f4521622d070`; application version is `2.1.0`.

## Local Development

Use Node.js 22.13 or later (the API tests use `node:sqlite`).

```sh
npm ci
npm test
npm run build
npm run db:local
npx wrangler dev --port 8787
```

Open `http://localhost:8787` for the built application and local database.
For frontend hot reload, run `npm run dev` in a second terminal; Vite proxies
`/api` to the local Worker on port 8787. Local attempts never write to production.

## Scoring And Data

`POST /api/score` accepts `{ "responses": { ... } }` and returns
`{ modelVersion, result: { public, diagnostic } }` without saving a record.
`POST /api/attempts` validates versioned exports plus attempt metadata, recomputes
the same result, and saves it to D1. Feedback still requires the attempt token.
The browser uses server results; it does not download the numerical model.

All 22 golden fixtures must pass within their absolute tolerance of `2e-6`.
The 21 independent structural T-scores do not sum to 100. Stability explains
structural robustness and never changes the point scores or ranking.

`scripts/prepare_strict180_model.py` packages the supplied S4 NumPy arrays into the
checked-in binary asset and Worker metadata, retaining native precision. Normal
builds need no Python. To regenerate from the frozen source, install its NumPy
requirement and run that script, then rerun the tests.

New local drafts/results use `starseed21-v4-*` keys. Old `starseed2-*` answer data
remains available for archive export; it cannot be converted into new answers.
Old v4.4 scoring code/data remain for historical verification, outside the new
runtime path. Existing civilization asset/route IDs remain stable; 21 and 22 are
removed from the current atlas, while Gaian retains asset/route ID 23.

## Production Release

Production uses Vercel for the frontend and Cloudflare Workers/D1 for the API.
Release requires both deployments, plus the schema migration. After review:

1. Run `npm test` and `npm run build`.
2. Apply `npm run db:remote`. Migration `0002_strict180.sql` preserves historical
   attempts and feedback while allowing the new response format.
3. Deploy the Worker with `npx wrangler deploy`, including `dist/model/`.
4. Deploy the frontend with `npx vercel --prod` using the existing linked project.
5. Verify `/api/health` reports the new model and test the sample report.

Old open browser tabs must reload to use the new questionnaire/API contract.
Do not revert the database migration when rolling back application code: the
expanded table retains the old format and all saved data.
