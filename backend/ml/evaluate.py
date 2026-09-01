import json
import os
from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

def evaluate_model(
    model,
    X_test: List[str],
    y_test: List[int],
    output_path: Optional[str] = None,
    dataset_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates the classifier on unseen test data, calculates comprehensive metrics and top features,
    and returns a structured metrics dictionary.
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    
    try:
        auc = float(roc_auc_score(y_test, y_proba))
    except Exception:
        auc = 0.5

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = int(cm[0][0]), int(cm[0][1]), int(cm[1][0]), int(cm[1][1])

    clf_rep = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    # Extract top predictive feature n-grams from logistic regression
    top_phishing_features = []
    top_benign_features = []

    try:
        feature_names = model.vectorizer.get_feature_names_out()
        coefficients = model.classifier.coef_[0]

        # Sort indices
        top_phish_idx = np.argsort(coefficients)[-25:][::-1]
        top_benign_idx = np.argsort(coefficients)[:25]

        for idx in top_phish_idx:
            top_phishing_features.append({
                "feature": str(feature_names[idx]),
                "weight": float(round(coefficients[idx], 4))
            })

        for idx in top_benign_idx:
            top_benign_features.append({
                "feature": str(feature_names[idx]),
                "weight": float(round(coefficients[idx], 4))
            })
    except Exception as e:
        print(f"[!] Warning: Could not extract feature weights: {e}")

    metrics_result = {
        "dataset_name": "mamtakumar/seven-phishing-email-datasets",
        "dataset_source": "Hugging Face (mamtakumar/seven-phishing-email-datasets)",
        "model_architecture": "TF-IDF (1-2 ngrams, sublinear) + Logistic Regression (L2 Balanced)",
        "sample_counts": dataset_metadata or {},
        "total_test_samples": len(y_test),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4)
        },
        "confusion_matrix": {
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
            "matrix": [[tn, fp], [fn, tp]]
        },
        "classification_report": clf_rep,
        "top_phishing_features": top_phishing_features,
        "top_benign_features": top_benign_features,
        "class_labels": {
            "0": "Benign / Legitimate",
            "1": "Phishing / Malicious Spam"
        }
    }

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(metrics_result, f, indent=2)
        print(f"[OK] Evaluation metrics saved to: {output_path}")

    return metrics_result
