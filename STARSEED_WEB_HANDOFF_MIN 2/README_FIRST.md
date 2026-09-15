# Starseed Website Update — Minimal Production Handoff

這個資料夾就是更新現有網站所需的最小 authoritative package。

## 你必須做的事
1. 用 `quiz_model.json` 取代網站目前的正式題庫。它是**唯一 single source of truth**：前端題目文字、UID、左右 measurement key、context domain、lineage prototypes 都在同一檔。
2. 題型固定為 60 題 7-point Bipolar：`1=左邊更像我`, `4=兩邊同樣自然／沒有明顯偏向`, `7=右邊更像我`。**4 不是 missing**。
3. Answer payload 必須以 `uid` 為 key；不要以題號/index 計分。省略或 `null` 才是 missing。
4. 後端計分必須與 `backend/prcs_scoring.py` 等價。Primary 唯一由 projective/cosine codeword decoder 決定。不要加入額外 lineage bonus、evidence weight、status prior、百分比機率或 local override。
5. Result page 的主要 Starseed 文案：**沿用現有網站**，只用 scorer 回傳的 `primary` code 去選既有 copy。不要為 runner-up、stability 或 pairwise boundary 另外生成 lineage-specific lore 文案。
6. 其他資料若要顯示，只用 `result_ui_contract.json` 的通用文字，例如 closest alternative、stability、generic explanation。可以完全不顯示；後端仍應保留完整 result JSON。
7. 不要改寫題目文字、左右順序、UID、measurement key 或 context domain。任何這些變更都視為 model revision，需重新 audit。

## API contract
建議：`POST /api/score`

Request body（也可直接把 answers object 當 body）：
```json
{
  "answers": {
    "A-05": 2,
    "D-08": 6,
    "A-21": 4,
    "B-Q16": null
  }
}
```
值只能是 `1..7` 或 `null`。未出現的 UID 也視為 missing。

Response：直接回傳 `PRCSScorer.score()` 的 JSON。schema 見 `schemas/result.schema.json`。

## Result page 最小邏輯
```text
scoreResult.primary -> existingPrimaryCopy[primary]
scoreResult.runner_up -> 只顯示名稱（optional）
scoreResult.status -> 通用 stability 說明（optional）
其他 diagnostics -> advanced/debug UI（optional）
```

**不要顯示** `82% Pleiadian` 之類數字；similarity / margin / stability 不是 probability。

## Files
- `quiz_model.json` — 60 題 + measurement keys + prototypes + context taxonomy + registered robustness suite
- `backend/prcs_scoring.py` — authoritative framework-agnostic reference scorer
- `result_ui_contract.json` — 21 lineage 顯示名、沿用既有 Primary copy 的 contract、通用 UI 說明
- `schemas/answers.schema.json` / `schemas/result.schema.json` — API validation
- `tests/smoke_test.py` — parity/sanity test
- `AI_IMPLEMENTATION_PROMPT.md` — 可直接貼給負責修改網站的 AI

## Version
- Selection: `V4-RPCB-60`
- Scoring: `PRCS-v2.0`
- Official model fingerprint: `79dec38680e6f71004b88d0d2c4e8162622251277ae3f9b5a9bfaeb036ab2396`
