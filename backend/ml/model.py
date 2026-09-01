from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import Dict, Any, Tuple, Optional
import joblib
import os

class PhishingClassifier:
    """
    Production Phishing Text Classifier combining sublinear TF-IDF (1-2 ngrams)
    with L2-regularized Balanced Logistic Regression.
    """
    def __init__(
        self,
        C: float = 2.0,
        max_iter: int = 1500,
        max_features: int = 35000,
        ngram_range: Tuple[int, int] = (1, 2)
    ):
        self.C = C
        self.max_iter = max_iter
        self.max_features = max_features
        self.ngram_range = ngram_range

        self.vectorizer = TfidfVectorizer(
            ngram_range=self.ngram_range,
            max_features=self.max_features,
            sublinear_tf=True,
            strip_accents="unicode",
            lowercase=True,
            stop_words="english",
            token_pattern=r'(?u)\b\w+\b|https?://[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        )
        self.classifier = LogisticRegression(
            C=self.C,
            max_iter=self.max_iter,
            solver="lbfgs",
            class_weight="balanced",
            random_state=42
        )

    def fit(self, X_train, y_train):
        """
        Fits the TF-IDF vectorizer and Logistic Regression model strictly on X_train.
        """
        X_vec = self.vectorizer.fit_transform(X_train)
        self.classifier.fit(X_vec, y_train)
        return self

    def transform(self, X_texts):
        """
        Transforms text using the fitted vectorizer without fitting.
        """
        return self.vectorizer.transform(X_texts)

    def predict_proba(self, X_texts):
        X_vec = self.vectorizer.transform(X_texts)
        return self.classifier.predict_proba(X_vec)

    def predict(self, X_texts):
        X_vec = self.vectorizer.transform(X_texts)
        return self.classifier.predict(X_vec)

    def save(self, model_dir: str):
        os.makedirs(model_dir, exist_ok=True)
        model_path = os.path.join(model_dir, "phishing_model.joblib")
        vec_path = os.path.join(model_dir, "tfidf_vectorizer.joblib")
        joblib.dump(self.classifier, model_path)
        joblib.dump(self.vectorizer, vec_path)

    @classmethod
    def load(cls, model_dir: str):
        model_path = os.path.join(model_dir, "phishing_model.joblib")
        vec_path = os.path.join(model_dir, "tfidf_vectorizer.joblib")
        if not os.path.exists(model_path) or not os.path.exists(vec_path):
            raise FileNotFoundError(f"Model artifacts not found in {model_dir}")

        instance = cls()
        instance.classifier = joblib.load(model_path)
        instance.vectorizer = joblib.load(vec_path)
        return instance
