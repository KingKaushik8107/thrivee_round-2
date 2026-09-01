import re
import html
from typing import Dict, Any, List, Optional, Set
import pandas as pd

# Regex patterns for stripping email artifact noise
HTML_TAG_REGEX = re.compile(r'<[^>]+>', re.DOTALL)
FORWARD_HEADER_REGEX = re.compile(r'(?:-----Original Message-----|From:.*?Sent:.*?To:.*?Subject:|__{10,}|>{2,})', re.IGNORECASE | re.DOTALL)
CONSECUTIVE_WHITESPACE_REGEX = re.compile(r'\s{2,}')

def clean_text(text: Optional[str]) -> str:
    """
    Cleans raw email text by unescaping HTML entities, stripping HTML tags,
    removing non-printable control characters, and normalizing whitespace.
    """
    if not text or not isinstance(text, str):
        return ""
    
    # 1. Unescape HTML entities (&amp;, &lt;, &#39;, etc.)
    cleaned = html.unescape(text)
    
    # 2. Strip HTML tags
    cleaned = HTML_TAG_REGEX.sub(' ', cleaned)
    
    # 3. Strip non-printable / control characters (except newline, tab)
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', ' ', cleaned)
    
    # 4. Normalize newlines and extra spaces
    cleaned = re.sub(r'[\r\n\t]+', ' ', cleaned)
    cleaned = CONSECUTIVE_WHITESPACE_REGEX.sub(' ', cleaned)
    
    return cleaned.strip()

def strip_forward_and_reply_headers(text: str) -> str:
    """
    Removes quoted forwarded and reply header blocks to prevent cross-dataset
    or cross-split data leakage in conversational email threads.
    """
    if not text:
        return ""
    # Strip forwarded header block if present
    cleaned = FORWARD_HEADER_REGEX.sub(' ', text)
    return CONSECUTIVE_WHITESPACE_REGEX.sub(' ', cleaned).strip()

def combine_email_fields(
    subject: Optional[str] = "",
    body: Optional[str] = "",
    sender: Optional[str] = "",
    urls: Optional[List[str]] = None
) -> str:
    """
    Combines subject, body, sender, and URL strings into a unified structured feature string for ML processing.
    """
    s_clean = clean_text(subject)
    b_clean = clean_text(body)
    from_clean = clean_text(sender)
    
    url_str = ""
    if urls:
        if isinstance(urls, list):
            url_str = " ".join([clean_text(str(u)) for u in urls if u])
        elif isinstance(urls, str):
            url_str = clean_text(urls)

    parts = []
    if from_clean:
        parts.append(f"FROM: {from_clean}")
    if s_clean:
        parts.append(f"SUBJECT: {s_clean}")
    if b_clean:
        parts.append(f"BODY: {b_clean}")
    if url_str:
        parts.append(f"LINKS: {url_str}")

    return " \n ".join(parts)

def prepare_dataframe(
    records: List[Dict[str, Any]],
    strip_headers: bool = True
) -> pd.DataFrame:
    """
    Standardizes raw dictionary / DataFrame records into a clean, deduplicated DataFrame.
    """
    if isinstance(records, pd.DataFrame):
        df = records.copy()
    else:
        df = pd.DataFrame(records)
    
    if df.empty:
        return pd.DataFrame(columns=["subject", "body", "sender", "urls", "label", "full_text"])

    # Standardize column names
    col_map = {}
    for col in df.columns:
        c_low = str(col).lower()
        if c_low in ["text", "body", "email_text", "content"]:
            col_map[col] = "body"
        elif c_low in ["subject", "email_subject"]:
            col_map[col] = "subject"
        elif c_low in ["sender", "from", "email_sender"]:
            col_map[col] = "sender"
        elif c_low in ["label", "class", "target", "is_phishing"]:
            col_map[col] = "label"
        elif c_low in ["urls", "url_list", "links"]:
            col_map[col] = "urls"

    df = df.rename(columns=col_map)
    
    # Ensure required columns exist
    for col in ["subject", "body", "sender", "urls", "label"]:
        if col not in df.columns:
            df[col] = ""

    # Clean text columns
    df["subject"] = df["subject"].fillna("").astype(str).apply(clean_text)
    if strip_headers:
        df["body"] = df["body"].fillna("").astype(str).apply(lambda t: strip_forward_and_reply_headers(clean_text(t)))
    else:
        df["body"] = df["body"].fillna("").astype(str).apply(clean_text)
    df["sender"] = df["sender"].fillna("").astype(str).apply(clean_text)
    df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)

    # Combine text representation
    df["full_text"] = df.apply(
        lambda row: combine_email_fields(
            subject=row["subject"],
            body=row["body"],
            sender=row["sender"],
            urls=row["urls"] if isinstance(row["urls"], list) else ([row["urls"]] if row["urls"] else [])
        ),
        axis=1
    )

    # Filter out empty or uninformative text records (< 10 characters)
    df = df[df["full_text"].str.strip().str.len() >= 10].reset_index(drop=True)

    # Deduplicate exact normalized text
    df = df.drop_duplicates(subset=["full_text"]).reset_index(drop=True)
    return df

def remove_leakage_from_split(
    target_df: pd.DataFrame,
    reference_texts: Set[str]
) -> pd.DataFrame:
    """
    Removes any instances from target_df that match reference_texts to prevent
    train-to-validation or train-to-test data leakage.
    """
    if target_df.empty or not reference_texts:
        return target_df
    
    mask = ~target_df["full_text"].isin(reference_texts)
    return target_df[mask].reset_index(drop=True)
