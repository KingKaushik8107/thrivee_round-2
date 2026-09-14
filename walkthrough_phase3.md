# Walkthrough: Phase 3 — Unified XAI + Forensic Evidence Integration

## 1. Executive Summary
Phase 3 integrates local Explainable AI (XAI) feature attributions into THRIVE's unified email investigation pipeline. A single comprehensive investigation result now seamlessly bundles:
1. **Machine Learning XAI Evidence**: Linear decision score, intercept, total feature attribution, and positive/negative feature contributions.
2. **Forensic Evidence**: Deterministic protocol, domain, brand, attachment, and content indicators.
3. **Threat Intelligence Evidence**: Live reputation statuses from VirusTotal, URLhaus, and AbuseIPDB.
4. **Hybrid Risk Score & Breakdown**: Independent, weighted composite scoring (0–100).
5. **Grounded Incident Narrative**: Natural-language summaries referencing real token drivers and SOC playbooks.

---

## 2. Architecture & Integration Pipeline

```
Raw Email Input (.eml / JSON / RFC 822)
                 │
                 ▼
        EmailParser (RFC 822 & heuristic body/header extractor)
                 │
                 ├──► Forensic Security Analyzers (Sender, Domain, Brand, URL, Content, Attachments)
                 ├──► Attack Type Classifier (Credential harvesting, BEC, etc.)
                 ├──► IOC Extractor & Threat Intel Lookups (VirusTotal, URLhaus, AbuseIPDB)
                 │
                 ▼
        ML Prediction & Local XAI Engine (explain_email)
                 │  ├── Scikit-Learn TF-IDF + Logistic Regression
                 │  └── Sparse COO Feature Attribution (contribution_i = w_i * tfidf_i)
                 │
                 ├──► Hybrid Risk Scoring (0–100 scale, weights preserved)
                 ├──► Risk Explanation Engine (Grounded executive summary)
                 │
                 ▼
        UnifiedXAIEngine (backend/risk/xai_engine.py)
                 │  ├── Model Features (Decision score, intercept, top features)
                 │  ├── Forensic Evidence Segregation
                 │  ├── Threat Intelligence Evidence Segregation
                 │  ├── Cohesive Plain-English Summary
                 │  └── Multi-Layer Confidence Notes
                 │
                 ▼
        Database Persistence & Unified API Response (/api/analyze)
```

---

## 3. Files Created & Modified

| File | Change | Purpose |
| :--- | :--- | :--- |
| [`backend/risk/xai_engine.py`](file:///d:/THRIVE/backend/risk/xai_engine.py) | **NEW** | Orchestration layer synthesizing ML XAI, forensic rules, and TI into `UnifiedXAIEngine`. |
| [`backend/api/schemas.py`](file:///d:/THRIVE/backend/api/schemas.py) | **MODIFIED** | Added Pydantic DTOs (`XAIModelFeaturesDTO`, `XAIForensicEvidenceDTO`, `XAIThreatIntelEvidenceDTO`, `UnifiedXAIResponseDTO`) and added `xai` to `AnalysisResponse`. |
| [`backend/api/analyze.py`](file:///d:/THRIVE/backend/api/analyze.py) | **MODIFIED** | Integrated `explain_email` and `UnifiedXAIEngine` into `run_pipeline`, returning structured XAI. |
| [`backend/risk/explanation.py`](file:///d:/THRIVE/backend/risk/explanation.py) | **MODIFIED** | Grounded natural-language narrative in real ML feature attributions with cautious phrasing. |
| [`backend/risk/__init__.py`](file:///d:/THRIVE/backend/risk/__init__.py) | **MODIFIED** | Exported `UnifiedXAIEngine`. |
| [`backend/api/incidents.py`](file:///d:/THRIVE/backend/api/incidents.py) | **MODIFIED** | Integrated unified XAI into `format_incident_dict` for incident views and report generation. |
| [`backend/reports/report_generator.py`](file:///d:/THRIVE/backend/reports/report_generator.py) | **MODIFIED** | Rendered XAI feature attribution cards and decision score tables in HTML incident reports. |
| [`backend/reports/pdf_generator.py`](file:///d:/THRIVE/backend/reports/pdf_generator.py) | **MODIFIED** | Rendered XAI feature attribution tables and math verification badges in PDF incident dossiers. |
| [`tests/test_unified_xai.py`](file:///d:/THRIVE/tests/test_unified_xai.py) | **NEW** | 10 unit tests validating pipeline integration, math checks, schema backward compatibility, and error handling. |

---

## 4. API Schema Extensions

The `AnalysisResponse` schema in [`backend/api/schemas.py`](file:///d:/THRIVE/backend/api/schemas.py) was additively extended with `xai: Optional[UnifiedXAIResponseDTO]`:

```json
{
  "incident_id": "0089b7fc-329a-446a-bf53-6eaea22c316c",
  "verdict": "critical_phishing",
  "risk_score": 89.9,
  "ml_probability": 0.9973,
  "attack_type": "credential_harvesting",
  "attack_type_confidence": 0.92,
  "target_brand": "PayPal",
  "brand_similarity": 0.92,
  "summary": "This email has been classified as CRITICAL PHISHING with a composite risk score of 89/100...",
  "explanation": "=== VERDICT: CRITICAL PHISHING (Risk Score: 89.9/100) ===\n...",
  "xai": {
    "model_features": {
      "decision_score": 5.9061,
      "intercept": 0.132,
      "total_feature_contribution": 5.7741,
      "reconstructed_decision_score": 5.9061,
      "top_phishing_features": [
        {
          "feature": "account",
          "weight": 2.546,
          "tfidf": 0.3137,
          "contribution": 0.7987,
          "direction": "phishing"
        },
        {
          "feature": "verify",
          "weight": 1.9689,
          "tfidf": 0.3925,
          "contribution": 0.7729,
          "direction": "phishing"
        }
      ],
      "top_legitimate_features": [
        {
          "feature": "clicking http",
          "weight": -1.0533,
          "tfidf": 0.2319,
          "contribution": -0.2443,
          "direction": "legitimate"
        }
      ],
      "is_mathematically_valid": true,
      "active_feature_count": 23,
      "token_highlights": []
    },
    "forensic_evidence": [
      {
        "source": "brand_analysis",
        "category": "brand_impersonation",
        "title": "Target Brand Impersonation: PayPal",
        "severity": "critical",
        "evidence": "Domain 'paypa1-login.com' closely resembles authentic PayPal infrastructure (similarity: 92%).",
        "description": "..."
      }
    ],
    "threat_intelligence_evidence": [
      {
        "ioc_type": "domain",
        "ioc_value": "paypa1-login.com",
        "status": "malicious",
        "provider": "VirusTotal",
        "reputation_score": null,
        "details": {}
      }
    ],
    "summary": "Machine-learning feature attribution identified 'account', 'verify', 'paypal' as primary features increasing the phishing decision score (score: +5.9061). Forensic analysis detected adverse signals: Target Brand Impersonation: PayPal. Threat intelligence flagged reputation alerts on domain:paypa1-login.com.",
    "confidence_notes": [
      "Mathematical validation verified: base intercept (+0.1320) + total feature attribution (+5.7741) exactly matches linear logit (+5.9061).",
      "Model identified 23 active vocabulary tokens with non-zero TF-IDF weights.",
      "High convergence: Both statistical ML language modeling and deterministic forensic rules identified strong phishing signals.",
      "Threat intelligence confirmation: External IOC feeds confirmed malicious infrastructure."
    ]
  }
}
```

---

## 5. Evidence Separation & Rigorous Semantics

1. **ML Evidence vs Forensic Evidence**:
   - **ML Evidence** represents statistical language patterns extracted from the message body, sender, and URLs. Each feature contribution $c_i = w_i \times x_i$ is an additive term in the linear logit model ($\mathbb{R}$), **not** a standalone probability percentage or risk score point.
   - **Forensic Evidence** represents deterministic security rules (display name spoofing, Punycode, combosquatting, Levenshtein distance, link destination mismatches, suspicious attachments).
2. **Threat Intelligence vs ML Evidence**:
   - **Threat Intelligence** provides real-time community reputation telemetry for specific extracted observables (domains, IPs, URLs).
   - TI is decoupled from local ML token weights.
3. **Risk Scoring Invariance**:
   - The 0–100 composite risk scoring engine and weights (`DEFAULT_WEIGHTS`) remain **100% unchanged**.
   - ML contributes strictly up to 30.0 points ($P(\text{Phishing}) \times 30.0$).

---

## 6. Verification & Test Results

### Automated Test Suite
Ran `pytest tests/ -v`:
- **Total Tests**: **48**
- **Passed**: **48**
- **Failed**: **0**
- **Execution Time**: **4.11 seconds**

#### Test Breakdown:
- `tests/test_analyzers.py`: 9 passed
- `tests/test_api.py`: 8 passed
- `tests/test_campaigns.py`: 2 passed
- `tests/test_ml.py`: 4 passed
- `tests/test_parser.py`: 4 passed
- `tests/test_risk.py`: 3 passed
- `tests/test_xai.py`: 8 passed
- `tests/test_unified_xai.py`: 10 passed (Phishing integration, Benign integration, Feature separation, Mathematical validation, Risk score unchanged, API schema compatibility, Missing TI handling, Empty input safety, Explanation grounding, No probability misuse).

---

## 7. Manual End-to-End Verification Results

### Sample 1: Suspicious Phishing Scenario
- **Subject**: *URGENT: Your account has been suspended!*
- **Sender**: `security@paypa1-login.com`
- **Output**:
  - **Verdict**: `CRITICAL PHISHING` (Risk Score: `89.9 / 100`)
  - **ML Probability**: `99.73%`
  - **ML Decision Score**: `+5.9061` (Base Intercept: `+0.1320`, Total Features: `+5.7741`)
  - **Mathematical Verification**: `True` ($\text{diff} < 10^{-4}$)
  - **Top Phishing Drivers**: `account` (+0.7987), `verify` (+0.7729), `paypal` (+0.6877), `suspended` (+0.5937), `paypal account` (+0.5484)
  - **Forensic Signals**: Target Brand Impersonation (PayPal), Link Destination Mismatch, Insecure HTTP Endpoint
  - **TI Findings**: `paypa1-login.com` flagged `malicious` by VirusTotal

### Sample 2: Legitimate / Benign Scenario
- **Subject**: *Enron Power Market Research Meeting*
- **Sender**: `vince.kaminski@enron.com`
- **Output**:
  - **Verdict**: `LEGITIMATE` (Risk Score: `0.0 / 100`)
  - **ML Probability**: `0.00%`
  - **ML Decision Score**: `-10.5586` (Base Intercept: `+0.1320`, Total Features: `-10.6906`)
  - **Mathematical Verification**: `True`
  - **Top Legitimate Drivers**: `enron` (-2.1404), `thanks` (-1.2367), `meeting` (-1.0520), `research` (-0.9646), `vince` (-0.9186)
  - **Forensic Signals**: 0 adverse indicators triggered

---

## 8. Known Limitations & Phase 4 Preparation
- **DOM Token Offsets**: As specified in the safety guidelines, token positions are not mapped to raw DOM or character spans in this backend phase to avoid fragile index mismatches due to normalization. Token mapping will be implemented in subsequent frontend/extension phases.
- **Model Invariance**: The TF-IDF + Logistic Regression model weights and feature space were strictly preserved without retraining.
