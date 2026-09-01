import sys
from typing import Dict, Any
import pandas as pd

def inspect():
    print("=" * 70)
    print("  PHAGEGUARD ML PIPELINE — DATASET INSPECTION")
    print("  Dataset: mamtakumar/seven-phishing-email-datasets")
    print("=" * 70)

    try:
        from datasets import load_dataset
        print("\n[+] Loading dataset from Hugging Face...")
        ds = load_dataset("mamtakumar/seven-phishing-email-datasets")
        print(f"[✓] Dataset loaded successfully. Available splits: {list(ds.keys())}")
    except Exception as e:
        print(f"[-] Could not load Hugging Face dataset online: {e}")
        print("[!] Note: Inspection requires internet connection to huggingface.co or cached dataset.")
        return

    for split_name in ds.keys():
        print(f"\n--- Split: '{split_name}' ---")
        split_data = ds[split_name]
        df = split_data.to_pandas()

        print(f"Total Samples: {len(df):,}")
        print(f"Columns: {list(df.columns)}")
        
        # Label distribution
        if "label" in df.columns:
            label_counts = df["label"].value_counts(dropna=False).to_dict()
            print("\nLabel Distribution:")
            for lbl, count in label_counts.items():
                lbl_name = "Phishing / Spam (1)" if lbl == 1 else "Benign / Legitimate (0)"
                pct = (count / len(df)) * 100
                print(f"  - {lbl_name}: {count:,} ({pct:.2f}%)")

        # Missing values check
        print("\nMissing Values Count:")
        for col in df.columns:
            missing = df[col].isnull().sum()
            print(f"  - {col}: {missing:,} missing ({(missing/len(df))*100:.2f}%)")

        # Duplicates check
        if "text" in df.columns:
            dup_text = df["text"].duplicated().sum()
            print(f"\nExact Duplicate 'text' rows: {dup_text:,} ({(dup_text/len(df))*100:.2f}%)")

        # Sub-dataset distribution if available
        if "dataset_name" in df.columns:
            print("\nSource Dataset Breakdown:")
            source_counts = df["dataset_name"].value_counts().head(10).to_dict()
            for src, cnt in source_counts.items():
                print(f"  - {src}: {cnt:,}")

    print("\n" + "=" * 70)
    print("Inspection complete. Data cleaning and stratified splitting recommended.")
    print("=" * 70)

if __name__ == "__main__":
    inspect()
