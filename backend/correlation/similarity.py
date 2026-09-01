import math
from typing import Dict, Any, List, Set
from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class EmailSimilarityEngine:
    @classmethod
    def compute_similarity(cls, email_a: Dict[str, Any], email_b: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes multi-dimensional correlation between two analyzed emails.
        """
        sender_a = (email_a.get("sender") or "").lower().strip()
        sender_b = (email_b.get("sender") or "").lower().strip()

        subject_a = email_a.get("subject") or ""
        subject_b = email_b.get("subject") or ""

        body_a = email_a.get("body") or ""
        body_b = email_b.get("body") or ""

        brand_a = email_a.get("target_brand") or ""
        brand_b = email_b.get("target_brand") or ""

        urls_a = set(email_a.get("urls") or [])
        urls_b = set(email_b.get("urls") or [])

        # 1. Subject Similarity (Levenshtein token ratio)
        subject_score = fuzz.token_sort_ratio(subject_a, subject_b) / 100.0 if (subject_a and subject_b) else 0.0

        # 2. Text / Body Cosine Similarity via TF-IDF
        text_score = 0.0
        if body_a and body_b:
            try:
                vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
                tfidf_matrix = vec.fit_transform([body_a, body_b])
                text_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
            except Exception:
                text_score = fuzz.partial_ratio(body_a[:200], body_b[:200]) / 100.0

        # 3. Sender / Domain Similarity
        domain_a = sender_a.split("@")[-1] if "@" in sender_a else sender_a
        domain_b = sender_b.split("@")[-1] if "@" in sender_b else sender_b
        
        domain_match = 1.0 if (domain_a and domain_a == domain_b) else (
            fuzz.ratio(domain_a, domain_b) / 100.0 if (domain_a and domain_b) else 0.0
        )

        # 4. Brand Target Overlap
        brand_match = 1.0 if (brand_a and brand_a.lower() == brand_b.lower()) else 0.0

        # 5. URL / Infrastructure Overlap
        url_intersection = urls_a.intersection(urls_b)
        url_match = 1.0 if url_intersection else 0.0

        # Weighted aggregate similarity
        # Weights: Body 30%, Subject 25%, Domain 20%, Brand 15%, URL 10%
        composite = (
            (text_score * 0.30) +
            (subject_score * 0.25) +
            (domain_match * 0.20) +
            (brand_match * 0.15) +
            (url_match * 0.10)
        )

        # If exact URL or exact domain + brand match, boost correlation
        if url_intersection or (domain_a == domain_b and brand_match == 1.0):
            composite = max(composite, 0.85)

        composite = round(min(1.0, composite), 3)

        return {
            "similarity_score": composite,
            "similarity_percentage": int(composite * 100),
            "is_related": composite >= 0.65,
            "components": {
                "body_text_similarity": round(text_score, 2),
                "subject_similarity": round(subject_score, 2),
                "domain_match": round(domain_match, 2),
                "brand_overlap": brand_match,
                "shared_urls_count": len(url_intersection)
            }
        }
