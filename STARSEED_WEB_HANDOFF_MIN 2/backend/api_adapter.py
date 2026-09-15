from pathlib import Path
from .prcs_scoring import PRCSScorer

MODEL_PATH = Path(__file__).resolve().parents[1] / "quiz_model.json"
SCORER = PRCSScorer(str(MODEL_PATH))

def score_request(payload: dict) -> dict:
    """Call this from your web framework route. Payload may be {"answers": {...}} or the answers dict itself."""
    answers = payload.get("answers", payload)
    if not isinstance(answers, dict):
        raise ValueError("answers must be an object keyed by item uid")
    return SCORER.score(answers, exact_dropout=True)
