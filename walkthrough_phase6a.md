# Phase 6A Walkthrough — Gmail Detection & Safe Extraction

## Overview
Phase 6A extends the **PhishX (THRIVE)** Chrome Manifest V3 Browser Extension to perform safe, real-time phishing detection directly inside **Gmail** (`https://mail.google.com/*`).

The content script detects when an email is opened in Gmail's Single Page Application (SPA), extracts the minimum required email fields (sender, subject, body text, email URLs) via multi-tier fallback selectors, sanitizes and caps the payload, generates a deterministic fingerprint to prevent duplicate processing, and proxies analysis through the background service worker to the FastAPI backend.

---

## 1. Gmail Architecture & Component Layout

```
extension/src/content/
├── content-script.ts          # Coordinator: SPA navigation, debounced observer, messaging
└── gmail/
    ├── selectors.ts           # Resilient multi-tier selector fallbacks & domain filters
    ├── detector.ts            # View detector: distinguishes open email vs. inbox/settings
    ├── extractor.ts           # Safe extractor, sanitizer, URL unwrapper, and fingerprinting
    └── ui.ts                  # In-page status card, warning banner, and XAI preview
```

---

## 2. Multi-Tier Selector Fallback Strategy

Gmail is a complex single-page application whose internal class names frequently vary across builds. The extractor employs hierarchical semantic and structural fallbacks:

| Target Field | Primary Selector / Strategy | Fallback Selectors |
| :--- | :--- | :--- |
| **Sender** | `span[email]` attribute (e.g. `span.gD`) | `[data-hovercard-id]`, `span.go`, aria-label header matching, regex pattern `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/` |
| **Subject** | `h2.hP` heading element | `h2[data-thread-perm-id]`, `div[role="main"] h2`, `h1.ha`, and sanitized `document.title` (stripping unread counts and Gmail suffixes) |
| **Body** | `.ii.gt .a3s.aiL` message body element | `.ii.gt`, `.adn .a3s`, `div[dir="ltr"].a3s` |
| **URLs** | `<a href>` inside active message body clone | Filters out internal Google UI domains (`mail.google.com`, `support.google.com`, `accounts.google.com`) and unwraps Google redirectors (`google.com/url?q=...`) |

---

## 3. SPA Navigation, Observer & Deduplication

```
                  User Action / DOM Mutation
                              │
                              ▼
                     350ms Debounce Window
                              │
                              ▼
                   GmailDetector.isEmailOpen()?
                     ├── No ──► Clear state & hide banner (IDLE)
                     │
                    Yes
                     │
                     ▼
             Extract Sanitized Email Payload
                     │
                     ▼
         Calculate 32-bit FNV-1a Fingerprint
                     │
                     ▼
         Fingerprint === lastFingerprint?
           ├── Yes ──► STOP (Prevent redundant analysis)
           │
           No
           │
           ▼
  Notify Service Worker (EMAIL_DETECTED)
           │
           ▼
  Trigger Backend Analysis (ANALYZE_EMAIL)
           │
           ▼
  Render In-Page UI (ANALYZED / WARNING)
```

1. **SPA Navigation Detection**: Monitors `popstate`, `hashchange`, and intercepts `history.pushState` / `replaceState` to detect thread changes without full page reloads.
2. **Debounced MutationObserver**: Observes DOM subtree modifications with a 350ms debounce to batch Gmail's progressive rendering mutations into a single evaluation.
3. **Cryptographic Fingerprinting**: Combines normalized sender, subject, initial body chunk (300 chars), and sorted links into a fast 32-bit FNV-1a hash. Repeated DOM updates on the same email produce an identical fingerprint and are immediately skipped.

---

## 4. Privacy, Security & Data Minimization

- **Narrow Host Scope**: Restricted strictly to `https://mail.google.com/*`. No `<all_urls>` permission.
- **Data Minimization**: Extracts only the currently open email. Never captures:
  - ❌ Passwords or credential fields
  - ❌ Cookies or browser session tokens
  - ❌ Browser history
  - ❌ OAuth refresh tokens
  - ❌ Contact lists or inbox background messages
- **Payload Limits**: Email body text is safely capped at **50,000 characters** client-side (`MAX_BODY_CHARACTERS = 50000`).
- **Safe DOM APIs**: In-page UI uses programmatic DOM creation (`document.createElement`, `textContent`) with strict escaping. No untrusted data is ever passed to `innerHTML`.
- **Non-Destructive User Control**: Purely informative. Does not block Gmail interaction, delete emails, move emails to spam, or auto-click links.

---

## 5. In-Page UI States & Presentation

The floating in-page status card provides clean, unobtrusive feedback:

- **DETECTING**: Email context identified; analysis queued.
- **ANALYZING**: Animated badge indicating real-time ML + XAI inference in progress.
- **ANALYZED (Critical Phishing / Suspicious)**:
  - Red/Rose cyber border and warning badge (`CRITICAL PHISHING`).
  - Risk Score (e.g., `89.9 / 100`) and ML probability.
  - Top 2–3 XAI features: `Strong phishing-direction ML features: +account, +verify`.
  - **View in SOC Console** button deep-linking to the full web investigation platform (`http://localhost:5173`).
- **ANALYZED (Legitimate)**:
  - Green/Emerald indicator: `✓ PhishX: No significant phishing indicators detected (Risk: 0.0/100)`.
- **ERROR**: Clear error notification with one-click **Retry** button.
- **Minimize / Expand**: Header toggle allows collapsing into a minimal chip.

---

## 6. Automated Unit Tests (10/10 Passed)

The test suite in [test_gmail_extractor.js](file:///d:/THRIVE/extension/tests/test_gmail_extractor.js) validates all 10 required acceptance criteria:

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **Test 1** | Valid email extraction (sender, subject, body, links) | ✅ PASSED |
| **Test 2** | Missing sender behaves safely without throwing | ✅ PASSED |
| **Test 3** | Missing subject falls back to document title | ✅ PASSED |
| **Test 4** | Inbox list view returns `null` (no active email) | ✅ PASSED |
| **Test 5** | Duplicate URLs in email body are deduplicated | ✅ PASSED |
| **Test 6** | Internal Google links filtered out & Google redirectors unwrapped | ✅ PASSED |
| **Test 7** | Oversized body text (>50,000 chars) is safely truncated | ✅ PASSED |
| **Test 8** | Repeated DOM mutations produce identical fingerprint (1 analysis) | ✅ PASSED |
| **Test 9** | Navigation to new email produces distinct fingerprint | ✅ PASSED |
| **Test 10** | Malformed DOM handles edge cases without throwing | ✅ PASSED |

**Run Command**:
```bash
npm run test:extension
```

---

## 7. Full Project Verification Summary

| Suite / Check | Command | Status |
| :--- | :--- | :--- |
| **Extension Unit Tests** | `npm run test:extension` | **10 / 10 Passed** |
| **Extension Bundle Build** | `npm run build:extension` | **0 Errors (Success)** |
| **Web Application Build** | `npm run build` | **0 Errors (Success)** |
| **Linter Check** | `npm run lint` | **0 Errors (Clean)** |
| **Backend Test Suite** | `pytest tests/ -v` | **48 / 48 Passed (100%)** |
