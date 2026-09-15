# 給網站開發 AI 的實作指令

請直接使用此資料夾更新現有 Starseed quiz。不要重新設計 taxonomy、題庫或 scoring。

## Authoritative inputs
- `quiz_model.json`：唯一正式題庫/model config。
- `backend/prcs_scoring.py`：正式 scoring reference implementation。
- `result_ui_contract.json`：結果頁整合規則。
- `schemas/*.json`：request/result contract。

## 實作要求
1. 將現有 quiz 替換為 `quiz_model.json.items` 的 60 題。前端從 JSON 渲染 prompt、left_text、right_text 與 1–7 scale。
2. 答案永遠以 item `uid` 儲存；不要依畫面 index 計分。可以改 display order，但 scoring 不得因此改變。
3. `4` 是真 midpoint；`null`/omitted 才是 missing。
4. 將 `PRCSScorer.score()` 移植到現有 backend stack，或直接以 Python service 使用。若移植到 JS/TS，必須維持公式與 tie/order 行為一致，並跑 smoke test / parity test。
5. Primary 只由 cosine/projective decoder 決定。禁止加入額外 class weights、source weights、evidence weights、status prior、runner-up override、概率校正。
6. 結果頁目前主要顯示 Primary Starseed 文案：保留現有 21 類文案資料，以 scorer 的 `primary` code 取用。**不要覆寫既有文案。**
7. Runner-up / stability / coverage / evidence consistency 請更新和使用通用 UI 元件或 `result_ui_contract.json` 的 generic copy；不需建立新的 runner-up-specific Starseed lore。
8. `ROBUST_TO_REGISTERED_SUITE` 只表示通過註冊 stress suite，不代表「高機率正確」或心理效度。
10. 保留完整 score result 在 backend/analytics/debug layer，即使前台只顯示 Primary。

## 驗收
- 正式題數 = 60，UID exactly match `quiz_model.json`。
- answer request 只接受 1..7/null。
- 全答 4 -> `INSUFFICIENT_SIGNAL`。
- 用 package smoke test 必須通過。
- API result 中 `model_version=PRCS-v2.0`, `selection_version=V4-RPCB-60`, fingerprint 必須等於 model config。
- 現有 Primary result copy 仍由同一 lineage code key 取得。

不要自行「改善」題目文字或 scoring；若發現現有網站架構不相容，調整 integration code，不調整 model。
