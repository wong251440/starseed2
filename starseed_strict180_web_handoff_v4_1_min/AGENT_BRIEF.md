# Starseed 21 — Strict-180 Champion website handoff

Build a polished consumer quiz website from the frozen assets in this folder. You have **no research/model-design task**. Do not redesign the questions, item order, score model, lineage definitions, or confidence formula.

## Frozen production stack

- Questionnaire: **Strict-180 Champion Final 60**
- Formats: **24 Bipolar + 19 Best–Worst + 17 Crossed Priority**
- Core scoring: **Scoring Layer v4**
- Result interpretation: **v4.1** (adds structural stability + Primary-vs-runner boundary diagnostics; it does **not** change the v4 point scores)
- Canonical quiz content: `quiz.zh-Hant.json`
- Canonical result copy: `result_copy.zh-Hant.json`
- Reference scorer: `scorer_v4_1.py`
- Frozen model: `model_v4_1.json` + `model_v4_1_arrays.npz`
- Port/integration fixtures: `golden_tests.json`

## Non-negotiable contract

Do **not**:
- rewrite question wording;
- swap left/right sides or option order;
- randomize item order in v1;
- expose A2/B2/C2 IDs, internal codes, evidence families, Goal/Operation/Scope, pair angles or lineage targets while answering;
- fill missing answers with a neutral/default value;
- describe the 21 scores as probabilities, ancestry percentages, DNA percentages or values that should sum to 100;
- alter scores based on the stability/confidence layer.

The 21 fit scores are frozen. v4.1 only explains how stable the resulting ranking is.

## Answer payload

All 60 answers are required:

```json
{
  "responses": {
    "A2-B04": 5,
    "A2-W08": {"best": "D", "worst": "A"},
    "A2-C07": {"operation": 2, "goal": 3}
  }
}
```

Rules:
- `BIP`: integer `1..7`; 1 = left, 7 = right.
- `BWS`: `best` and `worst` are different letters `A..D`.
- `CROSS`: `operation` and `goal` are integers `1..3` corresponding to Part A and Part B.

## Scorer output

`scorer_v4_1.py` returns:

- `primary`
- `runner_up`
- all 21 `scores`
- `stability.index`
- `stability.label`
- `stability.all_variants_preserve_primary`

The 21 scores are common **structural T-scores** displayed on a 0–100 UI scale. They do **not** sum to 100.

### v4.1 Stability Index

The point score is unchanged from v4.

The stability index is:

`100 × min(central margin structural percentile, model-view top-1 agreement, whole-family-jackknife top-1 agreement)`

It is a **weakest-link structural robustness index**, not a probability or empirical test–retest reliability.

Labels:
- `very_high`
- `high`
- `moderate`
- `low`
- `very_low`
- `sensitive` if at least one model view or whole-family jackknife changes the Primary.

The diagnostic output additionally includes `winner_runner_pair_stability`: respondent-specific Primary-vs-runner margins plus the frozen pair boundary's nominal / family-dropout / 1024-corner geometry. Keep these geometry details internal or in an advanced/debug view; do not show degrees to normal users by default.

## Recommended public result page

Show, in this order:

1. **Primary lineage** + short copy from `result_copy.zh-Hant.json`
2. **Runner-up**
3. **Stability** as a subtle badge/section, clearly labelled structural stability, not probability
4. Top lineage scores, with an option to expand all 21
5. A short explanation that multiple lineages can score high because scores are independent fits on one common scale

Do not turn stability into a second personality score and do not hide a close runner-up.

## Quiz UX

- Mainstream premium personality-quiz presentation; avoid clinical/research-survey styling.
- Show simple user-facing numbers `1–60`, never raw item IDs.
- Preserve answers during Back/Next navigation.
- Make Best–Worst impossible to select the same option as both best and worst.
- Crossed questions must visibly separate Part A from Part B.
- Block final submission until every item is complete.
- Mobile-first, keyboard accessible, readable Traditional Chinese typography.
- Avoid lineage-themed imagery/cues during answering; result visuals may be lineage-themed after scoring.

## Integration recommendation

Preferred implementation: keep the Python scorer server-side and expose a small `/api/score` endpoint.

If porting the scorer to TypeScript/Node or another runtime, reproduce the math exactly. **Every case in `golden_tests.json` must match within its stated absolute tolerance before shipping.** v4.1 point scores must remain exactly backward-compatible with v4.

Reference CLI:

```bash
python scorer_v4_1.py --answers answers.json --diagnostic diagnostic.json
```

## File map

- `AGENT_BRIEF.md` — this implementation contract
- `quiz.zh-Hant.json` — all 60 frozen user-facing questions
- `result_copy.zh-Hant.json` — safe measurement-grounded result copy for all 21 lineages
- `scorer_v4_1.py` — production reference scorer
- `model_v4_1.json` — metadata, lineage mapping, v4.1 pair boundary table
- `model_v4_1_arrays.npz` — frozen numeric matrices
- `golden_tests.json` — 22 deterministic integration tests
- `requirements.txt` — reference runtime dependency

Everything from the research/audit process is intentionally omitted.
