# Starseed 21 — S4 Production website handoff

Build a polished consumer quiz website from the frozen assets in this folder. You have **no research/model-design task**. Do not redesign the questions, item order, score model, lineage definitions, option order, or confidence formula.

## Frozen production stack

- Questionnaire: **S4 Production Champion Final 60**
- Model: **S21-scoring-v4.1-s4-f4521622d070**
- Formats: **28 Bipolar + 16 Best–Worst + 16 Crossed Priority**
- Coordinates: **204 legal-response-whitened contrast coordinates**
- Exact evidence families: **51**
- Core + result interpretation: **Scoring Layer v4.1**
- Canonical quiz content: `quiz.zh-Hant.json`
- Canonical result copy: `result_copy.zh-Hant.json`
- Reference scorer: `scorer_v4_1.py`
- Frozen model: `model_v4_1.json` + `model_v4_1_arrays.npz`
- Port/integration fixtures: `golden_tests.json`

Everything from candidate generation, hard-reject audit and previous champions is intentionally omitted.

## Non-negotiable contract

Do **not**:
- rewrite question wording;
- swap BIP left/right sides;
- reorder BWS options A–D;
- reorder Crossed options 1–3;
- randomize question or option order in v1;
- expose canonical IDs, A3/B3/C3/D3 source names, internal Goal/Operation/Scope codes, evidence families, pair angles or target lineages during answering;
- fill missing answers with neutral/default values;
- describe the 21 scores as probabilities, ancestry percentages, DNA percentages, or values that should sum to 100;
- alter the 21 point scores based on stability/confidence.

The 21 fit scores are frozen. Stability is a separate interpretation layer.

## Canonical display order

`quiz.zh-Hant.json` freezes the public order as:

- questions 1–28: Bipolar
- questions 29–44: Best–Worst
- questions 45–60: Crossed Priority

Always show simple numbers `1–60`, never item IDs.

## Answer payload

All 60 answers are required. Submit a JSON object keyed by the canonical IDs from `quiz.zh-Hant.json`:

```json
{
  "responses": {
    "S4-A3-B06": 5,
    "S4-A3-W32": {"best": "C", "worst": "A"},
    "S4-A3-X49": {"operation": 2, "goal": 3}
  }
}
```

Rules:
- `BIP`: integer `1..7`; 1 = left, 7 = right.
- `BWS`: `best` and `worst` are different letters `A..D`.
- `CROSS`: `operation` and `goal` are integers `1..3`, corresponding to Part A and Part B.
- Missing or unknown IDs are errors. Never impute.

## Reference scorer

Preferred architecture: keep Python scoring server-side and expose a small `POST /api/score` endpoint.

Reference CLI:

```bash
python scorer_v4_1.py --answers answers.json --diagnostic diagnostic.json
```

Public scorer output contains:
- `status`
- `primary`
- `runner_up`
- all 21 `scores`
- `stability.index`
- `stability.label`
- `stability.all_variants_preserve_primary`

The 21 scores are common **structural T-scores**, clamped to 0–100 for display. They are independent fits and do **not** sum to 100.

### v4.1 Stability Index

`100 × min(central-margin structural percentile, model-view top-1 agreement, whole-family-jackknife top-1 agreement)`

It is a weakest-link **structural robustness index**, not a probability and not empirical test–retest reliability.

Labels returned by scorer:
- `very_high`
- `high`
- `moderate`
- `low`
- `very_low`
- `sensitive` if at least one model view or whole-family jackknife changes Primary

Use Traditional-Chinese labels from `result_copy.zh-Hant.json`.

The optional diagnostic file includes model/family bands, Primary-vs-runner pair robustness, margin/evidence percentiles and exact item/format/family contribution decomposition. Treat detailed geometry as internal/debug information; do not show pair angles or evidence-family IDs to normal users by default.

## Recommended public result page

Show in this order:

1. **Primary lineage** + short copy from `result_copy.zh-Hant.json`
2. **Runner-up**
3. **Structural stability** as a subtle section/badge
4. Top lineage scores, with an option to expand all 21
5. A short note that several lineages may score high because these are independent fits on one common scale

Do not hide a close runner-up. Do not turn stability into a second personality score.

## Quiz UX

- Mainstream premium personality-quiz presentation; avoid clinical/research-survey styling.
- Mobile-first and keyboard accessible.
- Preserve answers during Back/Next navigation.
- BWS UI must make it impossible for one option to be both Best and Worst.
- Crossed questions must visibly separate Part A from Part B.
- Block final submission until all 60 items are complete.
- Avoid lineage-themed imagery/cues while the user is answering; result visuals may be lineage-themed after scoring.

## Porting rule

If you port the scorer to TypeScript/Node or another runtime, reproduce the math exactly. **Every case in `golden_tests.json` must pass within the stored tolerance before shipping.** Do not re-fit or simplify the model.

## File map

- `AGENT_BRIEF.md` — this implementation contract
- `quiz.zh-Hant.json` — all 60 frozen user-facing questions + canonical display order
- `result_copy.zh-Hant.json` — measurement-grounded copy for all 21 lineages + stability labels
- `scorer_v4_1.py` — production reference scorer
- `model_v4_1.json` — frozen metadata, lineage mapping and pair-boundary table
- `model_v4_1_arrays.npz` — frozen numerical matrices
- `golden_tests.json` — deterministic scorer integration fixtures
- `requirements.txt` — reference runtime dependency
