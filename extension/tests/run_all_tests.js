/**
 * PhishX Extension — Master Test Suite Runner
 * 
 * Executes all modular test suites:
 * 1. test_gmail_extractor.js (Extraction, sanitization, fingerprinting, URLs)
 * 2. test_gmail_ui.js (UI states, risk tiers, XAI logits, security indicators, error recovery)
 * 3. test_gmail_link_inspector.js (Safe link inspection, zero network calls, domain resolution)
 */

console.log('[PhishX Extension] Running Master Test Suite...\n');

import './test_gmail_extractor.js';
import './test_gmail_ui.js';
import './test_gmail_link_inspector.js';
import './test_phase8_extension.js';
import './test_gmail_popup.js';


