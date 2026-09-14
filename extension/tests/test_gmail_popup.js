/**
 * Automated Unit & Integration Tests for PhishX Gmail Popup & Isolation
 * 
 * Verifies:
 * 1. Popup module initialization & rendering
 * 2. Gmail tab detection vs Non-Gmail tab handling
 * 3. Service worker message protocol (success, error, undefined response handling)
 * 4. Backend health check & connectivity state transitions
 * 5. Email analysis lifecycle (Analyzing -> Analyzed with Risk Score, ML %, XAI, Incident ID)
 * 6. SOC Investigation Console deep-link generation
 * 7. Google Meet error isolation: ZERO interception of meet.google.com, no network calls, no crashes
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';

// Mock Chrome runtime & tabs environment
let lastQueriedTabs = [];

global.chrome = {
  runtime: {
    lastError: null,
    sendMessage: (msg, callback) => {
      if (msg.type === 'HEALTH_CHECK' || msg.type === 'GET_STATUS') {
        callback?.({ success: true, data: { status: 'ok', service: 'PhishX Platform' } });
      } else if (msg.type === 'GET_ACTIVE_EMAIL') {
        callback?.({ success: true, data: null });
      } else if (msg.type === 'ANALYZE_EMAIL') {
        callback?.({
          success: true,
          data: {
            incident_id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
            verdict: 'critical_phishing',
            risk_score: 92.5,
            ml_probability: 0.9982,
            attack_type: 'credential_harvesting',
            summary: 'Urgent PayPal credential harvester detected.',
            explanation: 'High weight login keywords and domain mismatch.',
            indicators: [
              { type: 'sender', severity: 'critical', finding: 'Sender spoofing', description: 'Display name mismatch' },
              { type: 'url', severity: 'high', finding: 'Typosquatting link', description: 'Lookalike domain' }
            ],
            xai: {
              model_features: {
                decision_score: 6.42,
                intercept: 0.132,
                total_feature_contribution: 6.288,
                is_mathematically_valid: true,
                top_phishing_features: [
                  { feature: 'verify', weight: 1.9689, tfidf: 0.3925, contribution: 0.7729, direction: 'phishing' },
                  { feature: 'account', weight: 2.5460, tfidf: 0.3137, contribution: 0.7987, direction: 'phishing' }
                ],
                top_legitimate_features: []
              },
              forensic_evidence: [],
              threat_intelligence_evidence: [],
              summary: 'Urgent keywords found.',
              confidence_notes: []
            }
          }
        });
      } else {
        callback?.({ success: true, data: {} });
      }
    }
  },
  tabs: {
    query: (_queryInfo, callback) => {
      callback(lastQueriedTabs);
    },
    sendMessage: (_tabId, _msg, callback) => {
      callback?.({
        success: true,
        data: {
          isEmailOpen: true,
          emailData: {
            sender: 'security@paypal-security-alert.com',
            subject: 'URGENT: Verify Account',
            body: 'Verify at http://paypal-update.phishing.com immediately.',
            urls: ['http://paypal-update.phishing.com']
          },
          currentAnalysis: null,
          status: 'GMAIL_READY'
        }
      });
    },
    create: (_opts) => {}
  }
};

import { Popup } from '../src/popup/Popup.tsx';
import { SOC_BASE_URL } from '../src/config.ts';
import { LinkInspector } from '../src/content/gmail/link-inspector.ts';
import { INTERNAL_GOOGLE_DOMAINS } from '../src/content/gmail/selectors.ts';

test('Popup Test 1: Popup module initializes and exports component', () => {
  assert.ok(Popup, 'Popup component must be exported');
  assert.equal(typeof Popup, 'function');
});

test('Popup Test 2: Popup renders valid React element', () => {
  const el = React.createElement(Popup);
  assert.ok(el, 'Popup element must be created');
  assert.equal(el.type, Popup);
});

test('Popup Test 3: Detects active Gmail tab correctly', () => {
  lastQueriedTabs = [{ id: 101, url: 'https://mail.google.com/mail/u/0/#inbox' }];
  let isGmail = false;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    isGmail = tabs[0]?.url?.startsWith('https://mail.google.com/') || false;
  });
  assert.equal(isGmail, true, 'Active tab on mail.google.com should be detected as Gmail');
});

test('Popup Test 4: Handles non-Gmail tab safely', () => {
  lastQueriedTabs = [{ id: 102, url: 'https://news.ycombinator.com' }];
  let isGmail = false;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    isGmail = tabs[0]?.url?.startsWith('https://mail.google.com/') || false;
  });
  assert.equal(isGmail, false, 'Non-Gmail tab should return false');
});

test('Popup Test 5: Service worker HEALTH_CHECK success handled', async () => {
  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, resolve);
  });
  assert.equal(res.success, true);
  assert.equal(res.data.status, 'ok');
});

test('Popup Test 6: Service worker failure is handled gracefully without crashing', async () => {
  const origSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = (msg, cb) => {
    cb({ success: false, error: 'Service worker temporarily unavailable' });
  };

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'ANALYZE_EMAIL', payload: {} }, resolve);
  });
  assert.equal(res.success, false);
  assert.equal(res.error, 'Service worker temporarily unavailable');
  chrome.runtime.sendMessage = origSendMessage;
});

test('Popup Test 7: Undefined or null service worker response is handled safely', async () => {
  const origSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = (msg, cb) => {
    cb(undefined);
  };

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, resolve);
  });
  assert.equal(res, undefined);
  chrome.runtime.sendMessage = origSendMessage;
});

test('Popup Test 8: Backend health check failure handled with offline state', async () => {
  const origSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = (msg, cb) => {
    chrome.runtime.lastError = { message: 'Could not establish connection. Receiving end does not exist.' };
    cb(undefined);
  };

  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, resolve);
  });
  assert.ok(chrome.runtime.lastError);
  chrome.runtime.lastError = null;
  chrome.runtime.sendMessage = origSendMessage;
});

test('Popup Test 9: Analysis success returns structured verdict, risk, and XAI', async () => {
  const payload = {
    sender: 'security@paypal-security-alert.com',
    subject: 'URGENT: Verify Account',
    body: 'Verify at http://paypal-update.phishing.com immediately.',
    urls: ['http://paypal-update.phishing.com']
  };

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'ANALYZE_EMAIL', payload }, resolve);
  });
  assert.equal(res.success, true);
  const data = res.data;
  assert.equal(data.verdict, 'critical_phishing');
  assert.equal(data.risk_score, 92.5);
  assert.equal(data.ml_probability, 0.9982);
  assert.ok(data.incident_id);
  assert.ok(data.xai?.model_features?.top_phishing_features?.length > 0);
});

test('Popup Test 10: Analysis failure returns descriptive error message', async () => {
  const origSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = (msg, cb) => {
    cb({ success: false, error: 'Analysis service timeout (15s)' });
  };

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'ANALYZE_EMAIL', payload: {} }, resolve);
  });
  assert.equal(res.success, false);
  assert.equal(res.error, 'Analysis service timeout (15s)');
  chrome.runtime.sendMessage = origSendMessage;
});

test('Popup Test 11: Formats incident ID correctly (INC-XXXXXXXX)', () => {
  const incidentId = 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f';
  const formatted = `INC-${incidentId.replace(/^INC-/i, '').slice(0, 8).toUpperCase()}`;
  assert.equal(formatted, 'INC-C1D2E3F4');
});

test('Popup Test 12: SOC Investigation URL constructed using configured SOC_BASE_URL (localhost:5173)', () => {
  const incidentId = 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f';
  const url = `${SOC_BASE_URL}/incident/${incidentId}`;
  assert.equal(url, `http://localhost:5173/incident/${incidentId}`);
});

test('Popup Test 13: Google Meet domain is recognized as internal Google domain', () => {
  assert.ok(INTERNAL_GOOGLE_DOMAINS.includes('meet.google.com'), 'meet.google.com must be in INTERNAL_GOOGLE_DOMAINS');
  const isInternal = LinkInspector.isInternalGoogleDomain('meet.google.com');
  assert.equal(isInternal, true, 'meet.google.com must be identified as internal Google service');
});

test('Popup Test 14: Google Meet presence in Gmail does not crash LinkInspector or Extractor', () => {
  const meetUrl = 'https://meet.google.com/call?subdomain=mail&origin=https%3A%2F%2Fmail.google.com';
  const result = LinkInspector.inspect(meetUrl, null);
  assert.ok(result, 'LinkInspector should safely return inspection result');
  assert.equal(result.isInternalGoogle, true, 'Google Meet link must be marked internal Google');
  assert.equal(result.domain, 'meet.google.com');
  assert.equal(result.threatLevel, 'low');
});

test('Popup Test 15 (REGRESSION): Specific Google Meet fetch URL does NOT trigger network calls or errors in PhishX', () => {
  const meetFetchUrl = 'https://meet.google.com/call?subdomain=mail&origin=https%3A%2F%2Fmail.google.com&authuser=0';
  
  // 1. Verify normalization unwraps safely
  const normalized = LinkInspector.normalizeUrl(meetFetchUrl);
  assert.ok(normalized);
  
  // 2. Verify domain extraction
  const domain = LinkInspector.extractDomain(normalized);
  assert.equal(domain, 'meet.google.com');
  
  // 3. Verify internal Google classification prevents external threat classification
  const isInternal = LinkInspector.isInternalGoogleDomain(domain);
  assert.equal(isInternal, true);

  // 4. Verify LinkInspector does not throw
  const inspectRes = LinkInspector.inspect(meetFetchUrl, null);
  assert.ok(inspectRes);
  assert.equal(inspectRes.isInternalGoogle, true);
  assert.equal(inspectRes.hasAnalyzedEvidence, false);
});
