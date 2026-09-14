# Walkthrough: Phase 4 — SOC XAI Investigation Interface

## 1. Executive Summary
Phase 4 implements a dedicated, high-contrast, SOC-grade Explainable AI (XAI) investigation interface in THRIVE's React frontend. Security analysts can now instantly understand **why** an email received a specific ML prediction and composite risk score, inspect exact linear feature drivers, examine mathematical verification proofs, and evaluate segregated forensic and threat intelligence evidence.

---

## 2. Frontend Architecture & Component Hierarchy

```text
                                InvestigationPage
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
      RiskGauge Header                                     XAIAnalysisPanel
(Composite 0–100 Score & Verdict)                    (Why did THRIVE classify this?)
                                                                   │
                                ┌──────────────────────────────────┼──────────────────────────────────┐
                                │                                  │                                  │
                      XAIModelDecisionCard                XAIContributionChart              ForensicEvidencePanel &
                 (Probability, Logit Score,             (Phishing [+] & Legitimate [-]    ThreatIntelEvidencePanel
                   Intercept & Math Proof)                 Proportional Bar Meters)       (Segregated Heuristics & TI)
```

---

## 3. Key Components Created & Updated

| File | Type | Description |
| :--- | :--- | :--- |
| [`src/types/index.ts`](file:///d:/THRIVE/src/types/index.ts) | **Modified** | Added TypeScript interfaces: `FeatureContribution`, `TokenHighlight`, `XAIModelFeatures`, `XAIForensicEvidence`, `XAIThreatIntelEvidence`, `UnifiedXAIResponse`, and extended `IncidentAnalysis` with optional `xai`. |
| [`src/components/analysis/XAIModelDecisionCard.tsx`](file:///d:/THRIVE/src/components/analysis/XAIModelDecisionCard.tsx) | **Created** | Visualizes ML Phishing Probability ($P \in [0, 100\%]$), Linear Decision Score ($\text{logit} \in \mathbb{R}$), Base Intercept ($\beta_0$), Total Contribution ($\sum c_i$), and an expandable step-by-step arithmetic verification drawer. |
| [`src/components/analysis/XAIContributionChart.tsx`](file:///d:/THRIVE/src/components/analysis/XAIContributionChart.tsx) | **Created** | Renders proportional, accessible bar meters for positive phishing drivers (`+0.7987`, etc.) and negative legitimate drivers (`-2.1404`, etc.) with weights ($w$), TF-IDF ($x$), and expandable "Show all" mechanics. |
| [`src/components/analysis/ForensicEvidencePanel.tsx`](file:///d:/THRIVE/src/components/analysis/ForensicEvidencePanel.tsx) | **Created** | Displays deterministic security indicators (severity badges, category, evidence snippets, security context) strictly segregated from ML modeling. |
| [`src/components/analysis/ThreatIntelEvidencePanel.tsx`](file:///d:/THRIVE/src/components/analysis/ThreatIntelEvidencePanel.tsx) | **Created** | Displays reputation telemetry from VirusTotal, URLhaus, and AbuseIPDB with status badges (MALICIOUS, SUSPICIOUS, CLEAN, UNKNOWN). |
| [`src/components/analysis/XAIAnalysisPanel.tsx`](file:///d:/THRIVE/src/components/analysis/XAIAnalysisPanel.tsx) | **Created** | Master orchestration component answering *"Why did THRIVE classify this email this way?"*, displaying multi-layer confidence notes and organizing the 2-column responsive layout. |
| [`src/pages/InvestigationPage.tsx`](file:///d:/THRIVE/src/pages/InvestigationPage.tsx) | **Modified** | Integrated `XAIAnalysisPanel` directly below the `RiskGauge` header and above the original email dissection view. |

---

## 4. Semantics & Analytical Integrity

1. **Probability vs Decision Score vs Contributions**:
   - **Probability**: Displayed as a percentage (e.g. `99.73%`) calculated via logistic sigmoid $\sigma(\text{Score})$.
   - **Decision Score**: Displayed as a signed real number (e.g. `+5.9061`) representing the model logit.
   - **Feature Contribution**: Displayed as an additive delta (e.g. `+0.7987`) representing $w_i \times x_i$. Labeled strictly as *"ML decision-score contribution"*, never as risk points or percentage changes.
2. **Evidence Layer Segregation**:
   - Machine learning language modeling, deterministic forensic rules, and external threat intelligence are displayed in separate cards to prevent cognitive conflation.
3. **Risk Score Invariance**:
   - The authoritative 0–100 composite risk score is displayed without alteration or client-side recalculation.

---

## 5. UI Verification & Test Results

### 1. TypeScript & Production Build Verification
```bash
npm run build
```
- **Result**: **0 errors**, built cleanly in 1.38s.

### 2. Linter Verification
```bash
npm run lint
```
- **Result**: **0 errors**, oxlint passed.

### 3. Backend Test Suite Invariance
```bash
pytest tests/ -v
```
- **Result**: **48 passed, 0 failed** in 4.30s.

---

## 6. Screenshots / UI Layout Breakdown

### High-Risk Phishing Scenario (`security@paypa1-login.com`):
1. **Executive Answer**: *"Machine-learning feature attribution identified 'account', 'verify', 'paypal' as primary features increasing the phishing decision score (+5.9061). Forensic analysis detected adverse signals: Target Brand Impersonation: PayPal. Threat intelligence flagged reputation alerts on domain:paypa1-login.com."*
2. **Confidence Badges**:
   - `✓ Mathematical validation verified: base intercept (+0.1320) + total feature attribution (+5.7741) matches linear logit (+5.9061)`
   - `✓ High convergence: Both statistical ML language modeling and deterministic forensic rules identified strong phishing signals`
   - `✓ Threat intelligence confirmation: External IOC feeds confirmed malicious infrastructure`
3. **ML Decision Card**: Prediction `PHISHING`, Probability `99.73%`, Decision Score `+5.9061`, Intercept `+0.1320`.
4. **Phishing Features**: `account` (+0.7987), `verify` (+0.7729), `paypal` (+0.6877), `suspended` (+0.5937).
5. **Forensic Evidence**: `[CRITICAL]` Target Brand Impersonation: PayPal (92% similarity), `[HIGH]` Insecure HTTP Protocol.
6. **Threat Intelligence**: `VirusTotal` domain: `paypa1-login.com` (`MALICIOUS`), `URLhaus` url: `http://paypa1-login.com/verify-account` (`MALICIOUS`).

### Benign Scenario (`vince.kaminski@enron.com`):
1. **Executive Answer**: *"Machine-learning feature attribution identified 'enron', 'thanks', 'meeting' as dominant legitimate-direction features (score: -10.5586). No adverse forensic security indicators were triggered."*
2. **ML Decision Card**: Prediction `LEGITIMATE`, Probability `0.00%`, Decision Score `-10.5586`.
3. **Legitimate Features**: `enron` (-2.1404), `thanks` (-1.2367), `meeting` (-1.0520), `research` (-0.9646).
4. **Forensic Evidence**: Clean state ("No adverse forensic security indicators triggered").
5. **Threat Intelligence**: Safe empty state ("No matching intelligence was returned by the configured threat intelligence providers").
