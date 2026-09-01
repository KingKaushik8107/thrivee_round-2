import os
import joblib
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.ml.model import PhishingClassifier
from backend.ml.preprocess import combine_email_fields

_cached_model = None

def get_or_load_model() -> Optional[PhishingClassifier]:
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    model_dir = settings.MODEL_DIR
    model_path = os.path.join(model_dir, "phishing_model.joblib")
    vec_path = os.path.join(model_dir, "tfidf_vectorizer.joblib")

    if os.path.exists(model_path) and os.path.exists(vec_path):
        try:
            _cached_model = PhishingClassifier.load(model_dir)
            return _cached_model
        except Exception as e:
            print(f"[!] Error loading model from {model_dir}: {e}")

    # In serverless cloud environments (Vercel / AWS Lambda), NEVER attempt offline dataset training
    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))
    if is_serverless:
        print(f"[!] Pre-trained model artifacts not found at {model_dir} in serverless runtime. Operating in resilient heuristic mode.")
        return None

    # Local development optional fallback (only if explicitly enabled via environment)
    if os.getenv("AUTO_TRAIN_IF_MISSING", "false").lower() in ("1", "true"):
        try:
            from backend.ml.train import train_pipeline
            print("[+] Model artifacts missing. Auto-training baseline model for local development...")
            _cached_model, _ = train_pipeline(model_dir=model_dir, force_dataset_download=False)
            return _cached_model
        except Exception as e:
            print(f"[!] Error auto-training model: {e}")
            return None

    return None

def predict_email(
    subject: str = "",
    body: str = "",
    sender: str = "",
    urls: Optional[List[str]] = None
) -> Dict[str, float]:
    """
    Computes ML phishing vs legitimate probability for an incoming email.
    """
    model = get_or_load_model()
    text = combine_email_fields(subject=subject, body=body, sender=sender, urls=urls)

    if model is not None:
        try:
            probs = model.predict_proba([text])[0]
            # probs[0] = class 0 (legitimate), probs[1] = class 1 (phishing)
            p_legit = float(round(probs[0], 4))
            p_phish = float(round(probs[1], 4))
            return {
                "phishing_probability": p_phish,
                "legitimate_probability": p_legit
            }
        except Exception as e:
            print(f"[!] Prediction inference error: {e}")

    # Heuristic fallback if ML engine is unavailable
    text_lower = text.lower()
    phish_signals = ["verify", "suspend", "account", "login", "paypa1", "password", "urgent", "invoice", "wire"]
    matches = sum(1 for s in phish_signals if s in text_lower)
    est_prob = min(0.95, max(0.05, matches * 0.18))

    return {
        "phishing_probability": round(est_prob, 2),
        "legitimate_probability": round(1.0 - est_prob, 2)
    }
