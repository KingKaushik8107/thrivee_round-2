import re
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from scipy.sparse import issparse

class LocalFeatureExplainer:
    """
    Exact local feature-level explainability (XAI) engine for TF-IDF + Logistic Regression classifiers.
    
    Mathematical Formulation:
        logit(x) = intercept + sum(coef_i * tfidf_i)
        contribution_i = coef_i * tfidf_i
        
    Where:
        - contribution_i > 0: Feature pushes the linear decision score toward phishing.
        - contribution_i < 0: Feature pushes the linear decision score toward legitimate.
        - intercept + sum(all_contributions) == classifier.decision_function(x)
    """

    @classmethod
    def explain(
        cls,
        vectorizer,
        classifier,
        text: str,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Calculates exact local feature attributions for a single text instance.
        
        Args:
            vectorizer: Fitted TfidfVectorizer instance.
            classifier: Fitted binary LogisticRegression classifier.
            text: Preprocessed text string.
            top_k: Maximum number of top positive and negative features to return.
            
        Returns:
            Structured dictionary with intercept, decision_score, contributions, and top features.
        """
        # Handle missing or invalid inputs gracefully
        if vectorizer is None or classifier is None:
            return cls._fallback_response("Model or vectorizer not initialized.")

        if not text or not isinstance(text, str) or not text.strip():
            # Intercept-only response for empty input
            intercept_val = float(classifier.intercept_[0]) if hasattr(classifier, "intercept_") else 0.0
            prob_phish = float(1.0 / (1.0 + np.exp(-intercept_val)))
            return {
                "intercept": round(intercept_val, 4),
                "decision_score": round(intercept_val, 4),
                "total_feature_contribution": 0.0,
                "reconstructed_decision_score": round(intercept_val, 4),
                "is_mathematically_valid": True,
                "active_feature_count": 0,
                "top_phishing_features": [],
                "top_legitimate_features": [],
                "token_highlights": []
            }

        # 1. Transform text using existing vectorizer (sparse representation)
        X_vec = vectorizer.transform([text])
        
        # 2. Extract linear model parameters
        intercept = float(classifier.intercept_[0])
        decision_score = float(classifier.decision_function(X_vec)[0])
        coef = classifier.coef_[0]
        feature_names = vectorizer.get_feature_names_out()

        # 3. Extract non-zero active features using sparse COO matrix
        coo = X_vec.tocoo()
        active_indices = coo.col
        active_tfidf_values = coo.data

        all_contributions: List[Dict[str, Any]] = []
        total_feature_contribution = 0.0
        active_features_lookup: Dict[str, float] = {}

        for idx, tfidf_val in zip(active_indices, active_tfidf_values):
            feat_name = feature_names[idx]
            weight = float(coef[idx])
            tfidf = float(tfidf_val)
            contrib = float(weight * tfidf)
            total_feature_contribution += contrib
            active_features_lookup[feat_name] = contrib

            direction = "phishing" if contrib > 0 else ("legitimate" if contrib < 0 else "neutral")
            all_contributions.append({
                "feature": feat_name,
                "weight": round(weight, 4),
                "tfidf": round(tfidf, 4),
                "contribution": round(contrib, 4),
                "direction": direction
            })

        # 4. Mathematical Reconstruction Validation
        reconstructed_decision_score = intercept + total_feature_contribution
        diff = abs(decision_score - reconstructed_decision_score)
        is_valid = diff < 1e-4

        # 5. Separate and sort top positive and negative features
        positive_features = [f for f in all_contributions if f["contribution"] > 0]
        negative_features = [f for f in all_contributions if f["contribution"] < 0]

        # Sort positive: highest positive contribution first
        positive_features.sort(key=lambda x: x["contribution"], reverse=True)
        top_phishing = positive_features[:top_k]

        # Sort negative: most negative contribution first
        negative_features.sort(key=lambda x: x["contribution"])
        top_legitimate = negative_features[:top_k]

        # 6. Extract safe token highlights for text inspection
        token_highlights = cls._generate_token_highlights(text, active_features_lookup)

        return {
            "intercept": round(intercept, 4),
            "decision_score": round(decision_score, 4),
            "total_feature_contribution": round(total_feature_contribution, 4),
            "reconstructed_decision_score": round(reconstructed_decision_score, 4),
            "is_mathematically_valid": is_valid,
            "active_feature_count": len(all_contributions),
            "top_phishing_features": top_phishing,
            "top_legitimate_features": top_legitimate,
            "token_highlights": token_highlights
        }

    @classmethod
    def _generate_token_highlights(
        cls,
        text: str,
        active_features_lookup: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Produces safe, normalized token highlight records for active vocabulary tokens
        present in the input text without fragile index assumptions.
        """
        highlights = []
        if not active_features_lookup:
            return highlights

        # Find words and URLs in text
        tokens = re.findall(r'[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|https?://[^\s]+|\b\w+\b', text.lower())
        seen_tokens = set()

        for token in tokens:
            if token in active_features_lookup and token not in seen_tokens:
                seen_tokens.add(token)
                contrib = active_features_lookup[token]
                direction = "phishing" if contrib > 0 else ("legitimate" if contrib < 0 else "neutral")
                highlights.append({
                    "token": token,
                    "contribution": round(contrib, 4),
                    "direction": direction
                })

        # Sort highlights by absolute contribution magnitude
        highlights.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return highlights[:25]

    @classmethod
    def _fallback_response(cls, message: str) -> Dict[str, Any]:
        return {
            "intercept": 0.0,
            "decision_score": 0.0,
            "total_feature_contribution": 0.0,
            "reconstructed_decision_score": 0.0,
            "is_mathematically_valid": False,
            "active_feature_count": 0,
            "top_phishing_features": [],
            "top_legitimate_features": [],
            "token_highlights": [],
            "error": message
        }
