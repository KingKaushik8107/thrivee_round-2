import os
import sys
import argparse
import time
from typing import Dict, Any, Tuple, Optional, Set
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from datasets import load_dataset

from backend.ml.model import PhishingClassifier
from backend.ml.preprocess import prepare_dataframe, remove_leakage_from_split
from backend.ml.evaluate import evaluate_model
from backend.config import settings

DATASET_NAME = "mamtakumar/seven-phishing-email-datasets"
LOCAL_RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "hf_raw")

def load_huggingface_dataset() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, int]]:
    """
    Loads the Hugging Face dataset 'mamtakumar/seven-phishing-email-datasets'
    using `load_dataset`. Falls back to locally cached parquet files if offline.
    """
    print(f"\n[+] Loading primary Hugging Face dataset: '{DATASET_NAME}'...")
    
    ds = None
    raw_counts = {}
    
    train_pq = os.path.join(LOCAL_RAW_DIR, "train.parquet")
    eval_pq = os.path.join(LOCAL_RAW_DIR, "eval.parquet")
    test_pq = os.path.join(LOCAL_RAW_DIR, "test.parquet")

    if os.path.exists(train_pq) and os.path.exists(test_pq):
        print(f"[+] Loading dataset using load_dataset('parquet', data_files=...) from: {LOCAL_RAW_DIR}")
        data_files = {"train": train_pq, "eval": eval_pq, "test": test_pq}
        ds = load_dataset("parquet", data_files=data_files)
        train_df = ds["train"].to_pandas()
        eval_df = ds["eval"].to_pandas()
        test_df = ds["test"].to_pandas()
        print(f"[OK] Successfully loaded '{DATASET_NAME}' dataset. Splits: {list(ds.keys())}")
    else:
        try:
            print("[+] Connecting to Hugging Face datasets hub...")
            ds = load_dataset(DATASET_NAME)
            print(f"[OK] Successfully loaded '{DATASET_NAME}' via datasets.load_dataset. Available splits: {list(ds.keys())}")
            train_df = ds["train"].to_pandas() if "train" in ds else pd.DataFrame()
            eval_df = ds["eval"].to_pandas() if "eval" in ds else (ds["validation"].to_pandas() if "validation" in ds else pd.DataFrame())
            test_df = ds["test"].to_pandas() if "test" in ds else pd.DataFrame()
        except Exception as e:
            raise RuntimeError(f"Could not download or load dataset '{DATASET_NAME}'. Error: {e}")

    raw_counts["raw_train_samples"] = len(train_df)
    raw_counts["raw_eval_samples"] = len(eval_df)
    raw_counts["raw_test_samples"] = len(test_df)
    raw_counts["total_raw_samples"] = len(train_df) + len(eval_df) + len(test_df)
    
    print(f"[OK] Ingested raw samples:")
    print(f"     * Train split:      {len(train_df):,} raw records")
    print(f"     * Validation split: {len(eval_df):,} raw records")
    print(f"     * Test split:       {len(test_df):,} raw records")
    print(f"     * TOTAL RAW:        {raw_counts['total_raw_samples']:,} raw records")

    return train_df, eval_df, test_df, raw_counts

def clean_and_split_pipeline(
    train_raw: pd.DataFrame,
    eval_raw: pd.DataFrame,
    test_raw: pd.DataFrame,
    max_samples: Optional[int] = None
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Cleans, deduplicates, and removes cross-split data leakage across train, validation, and test sets.
    """
    print("\n[+] Performing rigorous data cleaning, HTML unescaping, and header stripping...")
    
    # 1. Clean individual splits
    clean_train = prepare_dataframe(train_raw, strip_headers=True)
    clean_eval = prepare_dataframe(eval_raw, strip_headers=True)
    clean_test = prepare_dataframe(test_raw, strip_headers=True)
    
    print(f"[OK] Cleaned & within-split deduplicated records:")
    print(f"     * Train:      {len(clean_train):,} clean records")
    print(f"     * Validation: {len(clean_eval):,} clean records")
    print(f"     * Test:       {len(clean_test):,} clean records")

    # 2. Prevent cross-split data leakage
    print("\n[+] Applying cross-split data leakage prevention...")
    train_texts = set(clean_train["full_text"].tolist())
    
    # Remove any train instances from eval
    eval_before = len(clean_eval)
    clean_eval = remove_leakage_from_split(clean_eval, train_texts)
    eval_leaks = eval_before - len(clean_eval)
    if eval_leaks > 0:
        print(f"     [!] Removed {eval_leaks:,} train-validation overlapping samples to eliminate leakage.")

    # Remove any train or eval instances from test
    known_texts = train_texts.union(set(clean_eval["full_text"].tolist()))
    test_before = len(clean_test)
    clean_test = remove_leakage_from_split(clean_test, known_texts)
    test_leaks = test_before - len(clean_test)
    if test_leaks > 0:
        print(f"     [!] Removed {test_leaks:,} test samples overlapping with train/val to eliminate leakage.")

    # 3. Optional sample size limiting for quick local iterations
    if max_samples and max_samples > 0 and len(clean_train) > max_samples:
        print(f"\n[+] Sampling {max_samples:,} stratified records from training set for requested budget...")
        clean_train = clean_train.groupby("label", group_keys=False).apply(
            lambda x: x.sample(int(np.rint(max_samples * len(x) / len(clean_train))), random_state=42)
        ).reset_index(drop=True)
        print(f"[OK] Training set sampled to: {len(clean_train):,} records.")

    # Count clean labels
    total_clean_samples = len(clean_train) + len(clean_eval) + len(clean_test)
    
    phishing_total = int(
        (clean_train["label"] == 1).sum() +
        (clean_eval["label"] == 1).sum() +
        (clean_test["label"] == 1).sum()
    )
    benign_total = int(
        (clean_train["label"] == 0).sum() +
        (clean_eval["label"] == 0).sum() +
        (clean_test["label"] == 0).sum()
    )

    stats = {
        "clean_train_count": len(clean_train),
        "clean_val_count": len(clean_eval),
        "clean_test_count": len(clean_test),
        "total_clean_samples": total_clean_samples,
        "phishing_count": phishing_total,
        "benign_count": benign_total,
        "train_phishing": int((clean_train["label"] == 1).sum()),
        "train_benign": int((clean_train["label"] == 0).sum()),
        "val_phishing": int((clean_eval["label"] == 1).sum()),
        "val_benign": int((clean_eval["label"] == 0).sum()),
        "test_phishing": int((clean_test["label"] == 1).sum()),
        "test_benign": int((clean_test["label"] == 0).sum()),
    }

    print("\n" + "=" * 60)
    print("  DATASET AUDIT & CLASS DISTRIBUTION SUMMARY")
    print("=" * 60)
    print(f"  * Total Clean Dataset Size: {stats['total_clean_samples']:,}")
    print(f"  * Phishing Emails (1):      {stats['phishing_count']:,} ({stats['phishing_count']/total_clean_samples*100:.1f}%)")
    print(f"  * Benign Emails (0):        {stats['benign_count']:,} ({stats['benign_count']/total_clean_samples*100:.1f}%)")
    print(f"  * Training Set (Train):     {stats['clean_train_count']:,} (Phish: {stats['train_phishing']:,}, Benign: {stats['train_benign']:,})")
    print(f"  * Validation Set (Val):     {stats['clean_val_count']:,} (Phish: {stats['val_phishing']:,}, Benign: {stats['val_benign']:,})")
    print(f"  * Test Set (Holdout Test):  {stats['clean_test_count']:,} (Phish: {stats['test_phishing']:,}, Benign: {stats['test_benign']:,})")
    print("=" * 60)

    return clean_train, clean_eval, clean_test, stats

def train_pipeline(
    model_dir: Optional[str] = None,
    max_samples: Optional[int] = None,
    force_dataset_download: bool = True
):
    """
    Primary Training Pipeline using Hugging Face 'mamtakumar/seven-phishing-email-datasets'.
    """
    if model_dir is None:
        model_dir = settings.MODEL_DIR

    print("=" * 75)
    print("  PhishX PHISHING ML PIPELINE -- HUGGING FACE PRODUCTION TRAINING")
    print("=" * 75)
    t_start = time.time()

    # 1. Load Hugging Face dataset
    train_raw, eval_raw, test_raw, raw_counts = load_huggingface_dataset()

    # 2. Clean, deduplicate, and prevent cross-split leakage
    train_df, val_df, test_df, clean_stats = clean_and_split_pipeline(
        train_raw, eval_raw, test_raw, max_samples=max_samples
    )

    # 3. Extract text and labels
    X_train = [str(t) for t in train_df["full_text"].tolist()]
    y_train = [int(lbl) for lbl in train_df["label"].tolist()]

    X_val = [str(t) for t in val_df["full_text"].tolist()]
    y_val = [int(lbl) for lbl in val_df["label"].tolist()]

    X_test = [str(t) for t in test_df["full_text"].tolist()]
    y_test = [int(lbl) for lbl in test_df["label"].tolist()]

    # 4. Fit TF-IDF Vectorizer ONLY on Training Set
    print("\n[+] Step 1: Fitting TF-IDF Vectorizer strictly on X_train (Vocabulary: max 35,000 unigrams + bigrams)...")
    model = PhishingClassifier(C=2.0, max_iter=1500, max_features=35000)
    
    t0 = time.time()
    X_train_vec = model.vectorizer.fit_transform(X_train)
    print(f"[OK] TF-IDF fitted on {len(X_train):,} training texts in {time.time()-t0:.2f}s. Sparse matrix shape: {X_train_vec.shape}")

    # 5. Model Validation & Hyperparameter Tuning
    print("\n[+] Step 2: Transforming validation set X_val...")
    X_val_vec = model.vectorizer.transform(X_val)

    print("\n[+] Step 3: Evaluating regularization parameter C on validation set...")
    candidate_c = [0.5, 1.0, 2.0, 5.0]
    best_c = 2.0
    best_val_f1 = 0.0

    for c_val in candidate_c:
        clf = PhishingClassifier(C=c_val, max_iter=1000)
        clf.classifier.fit(X_train_vec, y_train)
        val_pred = clf.classifier.predict(X_val_vec)
        from sklearn.metrics import f1_score, accuracy_score
        val_f1 = f1_score(y_val, val_pred, zero_division=0)
        val_acc = accuracy_score(y_val, val_pred)
        print(f"     Candidate C={c_val:<4} -> Validation F1: {val_f1*100:.2f}%, Val Accuracy: {val_acc*100:.2f}%")
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_c = c_val

    print(f"[OK] Selected optimal regularization strength: C={best_c} (Val F1: {best_val_f1*100:.2f}%)")

    # 6. Fit Final Model with Best C
    print(f"\n[+] Step 4: Training final Logistic Regression (L2, Balanced, C={best_c}) on full X_train...")
    t0 = time.time()
    model.classifier.C = best_c
    model.classifier.fit(X_train_vec, y_train)
    print(f"[OK] Logistic Regression converged in {time.time()-t0:.2f}s.")

    # 7. Evaluate ONCE on completely unseen Holdout Test Set
    print(f"\n[+] Step 5: Evaluating model ONCE on completely unseen Holdout Test Set ({len(X_test):,} samples)...")
    combined_metadata = {**raw_counts, **clean_stats, "selected_C": best_c}
    metrics_path = os.path.join(model_dir, "metrics.json")
    
    metrics = evaluate_model(
        model,
        X_test,
        y_test,
        output_path=metrics_path,
        dataset_metadata=combined_metadata
    )

    m = metrics["metrics"]
    cm = metrics["confusion_matrix"]

    print("\n" + "=" * 70)
    print("  FINAL HOLDOUT TEST EVALUATION RESULTS")
    print("=" * 70)
    print(f"  Test Accuracy:    {m['accuracy'] * 100:.2f}%")
    print(f"  Test Precision:   {m['precision'] * 100:.2f}%")
    print(f"  Test Recall:      {m['recall'] * 100:.2f}%")
    print(f"  Test F1-Score:    {m['f1_score'] * 100:.2f}%")
    print(f"  Test ROC-AUC:     {m['roc_auc']:.4f}")
    print("-" * 70)
    print(f"  Confusion Matrix: [TN: {cm['true_negatives']:,}, FP: {cm['false_positives']:,}]")
    print(f"                    [FN: {cm['false_negatives']:,}, TP: {cm['true_positives']:,}]")
    print("=" * 70)

    # 8. Save Artifacts
    model.save(model_dir)
    print(f"\n[OK] Model artifacts successfully saved to: {model_dir}")
    print(f"     * {os.path.join(model_dir, 'phishing_model.joblib')}")
    print(f"     * {os.path.join(model_dir, 'tfidf_vectorizer.joblib')}")
    print(f"     * {os.path.join(model_dir, 'metrics.json')}")
    print(f"[OK] Training pipeline completed in {time.time()-t_start:.1f}s.")
    print("=" * 75)

    return model, metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PhishX Phishing ML Model on Hugging Face Dataset")
    parser.add_argument("--hf", action="store_true", default=True, help="Train on Hugging Face dataset (default: True)")
    parser.add_argument("--max-samples", type=int, default=None, help="Optional max training samples limit (default: None, full dataset)")
    parser.add_argument("--model-dir", type=str, default=None, help="Directory to save model artifacts")
    args = parser.parse_args()
    
    train_pipeline(
        model_dir=args.model_dir,
        max_samples=args.max_samples,
        force_dataset_download=args.hf
    )
