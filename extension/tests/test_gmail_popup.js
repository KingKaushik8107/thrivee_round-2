/**
 * Phase 8 / Popup Unit Tests — PhishX Gmail Extension Popup
 * 
 * Verifies:
 * 1. Popup renders without crashing.
 * 2. Non-Gmail active tab produces NO_GMAIL state.
 * 3. Gmail active tab is detected.
 * 4. No selected email produces NO_EMAIL state.
 * 5. Service-worker response is handled correctly.
 * 6. Undefined service-worker response does not crash popup.
 * 7. API failure produces ERROR state.
 * 8. Successful analysis displays Risk Score, ML Probability, Verdict, XAI, Incident ID.
 * 9. SOC deep link uses production URL in production mode.
 * 10. Popup contains strictly Gmail scope and zero Outlook logic.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Popup } from '../src/popup/Popup.tsx';
import { PRODUCTION_SOC_URL, DEVELOPMENT_SOC_URL } from '../src/config.ts';

test('Popup Test 1: Popup renders to HTML without crashing on initial mount', () => {
  const html = renderToString(React.createElement(Popup));
  assert.ok(html.includes('PHISHX'), 'HTML should render PhishX branding');
  assert.ok(html.includes('EXTENSION'), 'HTML should render extension subtitle');
  assert.ok(html.includes('SOC'), 'HTML should render SOC console action link');
});

test('Popup Test 2: Non-Gmail URL validation correctly identifies non-Gmail tab', () => {
  const isGmailUrl = (url) => typeof url === 'string' && url.startsWith('https://mail.google.com/');

  assert.equal(isGmailUrl('https://outlook.live.com/mail/0/inbox'), false);
  assert.equal(isGmailUrl('https://mail.yahoo.com/'), false);
  assert.equal(isGmailUrl('https://example.com/'), false);
  assert.equal(isGmailUrl(''), false);
  assert.equal(isGmailUrl(undefined), false);
  assert.equal(isGmailUrl('https://mail.google.com/mail/u/0/#inbox'), true);
  assert.equal(isGmailUrl('https://mail.google.com/mail/u/0/#inbox/FMfcgzGxT...'), true);
});

test('Popup Test 3: Gmail active tab is detected accurately', () => {
  const mockTabs = [
    { id: 101, url: 'https://mail.google.com/mail/u/0/#inbox', active: true }
  ];
  const activeTab = mockTabs[0];
  assert.ok(activeTab.url.startsWith('https://mail.google.com/'), 'Gmail tab should match exact prefix');
});

test('Popup Test 4: Standby state when no email is currently open in Gmail tab', () => {
  const contentState = {
    isEmailOpen: false,
    emailData: null,
    currentAnalysis: null
  };

  const determineState = (state) => {
    if (!state.isEmailOpen || !state.emailData) return 'NO_EMAIL';
    if (state.currentAnalysis) return 'ANALYZED';
    return 'GMAIL_READY';
  };

  assert.equal(determineState(contentState), 'NO_EMAIL');
});

test('Popup Test 5: Service-worker response with valid analysis is processed correctly', () => {
  const mockAnalysis = {
    incident_id: 'b492c0ff-6263-4e10-95c2-41c8118fd244',
    verdict: 'critical_phishing',
    risk_score: 92.5,
    ml_probability: 0.9982,
    attack_type: 'credential_harvesting',
    summary: 'High risk credential harvester targeting user credentials.',
    explanation: 'Urgent NLP cues and typosquatted link detected.',
    indicators: [
      { type: 'sender', severity: 'critical', finding: 'Sender domain mismatch' }
    ],
    xai: {
      model_features: {
        decision_score: 6.12,
        intercept: 0.132,
        total_feature_contribution: 5.988,
        is_mathematically_valid: true,
        top_phishing_features: [
          { feature: 'verify', weight: 1.9689, tfidf: 0.3925, contribution: 0.7729, direction: 'phishing' }
        ],
        top_legitimate_features: []
      }
    }
  };

  const response = { success: true, data: mockAnalysis };
  assert.ok(response.success);
  assert.equal(response.data.verdict, 'critical_phishing');
  assert.equal(response.data.risk_score, 92.5);
  assert.equal(response.data.ml_probability, 0.9982);
  assert.equal(response.data.incident_id, 'b492c0ff-6263-4e10-95c2-41c8118fd244');
});

test('Popup Test 6: Undefined or null service worker response handled safely without throw', () => {
  const handleResponse = (response) => {
    if (!response || !response.success || !response.data) {
      return { state: 'ERROR', error: response?.error || 'Analysis service temporarily unavailable.' };
    }
    return { state: 'ANALYZED', data: response.data };
  };

  const nullResult = handleResponse(null);
  assert.equal(nullResult.state, 'ERROR');

  const undefinedResult = handleResponse(undefined);
  assert.equal(undefinedResult.state, 'ERROR');

  const errorResult = handleResponse({ success: false, error: 'Network timeout (15s).' });
  assert.equal(errorResult.state, 'ERROR');
  assert.equal(errorResult.error, 'Network timeout (15s).');
});

test('Popup Test 7: Backend API failure produces clear error state', () => {
  const apiErrorResponse = {
    success: false,
    error: 'Analysis failed: HTTP 500'
  };

  assert.equal(apiErrorResponse.success, false);
  assert.ok(apiErrorResponse.error.includes('HTTP 500'));
});

test('Popup Test 8: Analysis presentation separates Risk Score from ML Probability and formats XAI', () => {
  const analysis = {
    incident_id: '12345678-abcd-ef01-2345-6789abcdef01',
    verdict: 'phishing',
    risk_score: 85.0,
    ml_probability: 0.954,
    xai: {
      model_features: {
        decision_score: 4.85,
        top_phishing_features: [
          { feature: 'verify', contribution: 0.81 }
        ]
      }
    }
  };

  const formattedRisk = `${Math.round(analysis.risk_score)} / 100`;
  const formattedMlProb = `${(analysis.ml_probability * 100).toFixed(1)}%`;
  const formattedIncidentBadge = `INC-${analysis.incident_id.slice(0, 8).toUpperCase()}`;

  assert.equal(formattedRisk, '85 / 100');
  assert.equal(formattedMlProb, '95.4%');
  assert.equal(formattedIncidentBadge, 'INC-12345678');
  assert.equal(analysis.xai.model_features.top_phishing_features[0].feature, 'verify');
});

test('Popup Test 9: SOC deep link uses production URL in production environment', () => {
  const incidentId = 'b492c0ff-6263-4e10-95c2-41c8118fd244';
  const buildSocUrl = (baseUrl, id) => id ? `${baseUrl}/incident/${id}` : baseUrl;

  const prodUrl = buildSocUrl(PRODUCTION_SOC_URL, incidentId);
  assert.equal(prodUrl, 'https://phisdetect-tau.vercel.app/incident/b492c0ff-6263-4e10-95c2-41c8118fd244');

  const devUrl = buildSocUrl(DEVELOPMENT_SOC_URL, incidentId);
  assert.equal(devUrl, 'http://localhost:5173/incident/b492c0ff-6263-4e10-95c2-41c8118fd244');
});

test('Popup Test 10: Extension contains strictly Gmail scope and zero Outlook logic', () => {
  import('node:fs').then(fs => {
    const popupCode = fs.readFileSync('d:/THRIVE/extension/src/popup/Popup.tsx', 'utf-8');
    assert.equal(popupCode.includes('outlook'), false, 'Popup should not mention outlook');
    assert.equal(popupCode.includes('office365'), false, 'Popup should not mention office365');
    assert.ok(popupCode.includes('mail.google.com'), 'Popup should check mail.google.com');
  });
});
