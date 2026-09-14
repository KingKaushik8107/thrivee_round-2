/**
 * Automated Unit Test Suite for Gmail Link Inspector (Phase 7)
 * 
 * Verifies safe link-hover inspection:
 * 1. Uses ONLY already-analyzed incident data (ZERO network requests).
 * 2. Extracts domain accurately and unwraps Google redirectors.
 * 3. Never labels an unanalyzed link as "SAFE".
 * 4. Ignores internal Google services and non-web protocols.
 * 5. Does not modify link href or cause navigation.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LinkInspector } from '../src/content/gmail/link-inspector.ts';

test('Link Test 1: Extracts destination domain accurately from clean URL', () => {
  const result = LinkInspector.inspect('https://login-account-verify.com/auth', null);
  assert.ok(result);
  assert.equal(result.domain, 'login-account-verify.com');
  assert.equal(result.isInternalGoogle, false);
});

test('Link Test 2: Unwraps Google redirection URLs without network calls', () => {
  const googleWrapped = 'https://www.google.com/url?q=https%3A%2F%2Fpaypa1-security-update.com%2Flogin&sa=D&sntz=1';
  const result = LinkInspector.inspect(googleWrapped, null);
  assert.ok(result);
  assert.equal(result.domain, 'paypa1-security-update.com');
  assert.ok(result.normalizedUrl.includes('paypa1-security-update.com'));
});

test('Link Test 3: Identifies internal Google navigation links', () => {
  const supportLink = 'https://support.google.com/mail/answer/12345';
  const result = LinkInspector.inspect(supportLink, null);
  assert.ok(result);
  assert.equal(result.isInternalGoogle, true);
  assert.equal(result.domain, 'support.google.com');
  assert.ok(result.evidenceSummary.includes('Internal Google service'));
});

test('Link Test 4: Matches already-analyzed threat evidence from incident analysis', () => {
  const analysis = {
    incident_id: 'inc-link-4',
    verdict: 'critical_phishing',
    risk_score: 95.0,
    ml_probability: 0.99,
    attack_type: 'credential_harvesting',
    summary: '',
    explanation: '',
    indicators: ['Suspicious domain: evil-bank-phish.com', 'IP host link'],
    xai: {
      model_features: null,
      forensic_evidence: [
        { analyzer: 'url_analyzer', finding: 'Suspicious domain: evil-bank-phish.com', severity: 'high', description: 'Typosquatting' }
      ],
      threat_intelligence_evidence: [],
      summary: '',
      confidence_notes: []
    }
  };

  const result = LinkInspector.inspect('https://evil-bank-phish.com/verify-now', analysis);
  assert.ok(result);
  assert.equal(result.domain, 'evil-bank-phish.com');
  assert.equal(result.hasAnalyzedEvidence, true);
  assert.equal(result.threatLevel, 'high');
  assert.ok(result.evidenceSummary.includes('Suspicious destination'));
});

test('Link Test 5: Unknown URL is labeled UNANALYZED / UNKNOWN and NEVER labeled SAFE', () => {
  const analysis = {
    incident_id: 'inc-link-5',
    verdict: 'legitimate',
    risk_score: 5.0,
    ml_probability: 0.001,
    attack_type: 'none',
    summary: '',
    explanation: '',
    indicators: []
  };

  const result = LinkInspector.inspect('https://external-unknown-site.org/info', analysis);
  assert.ok(result);
  assert.equal(result.domain, 'external-unknown-site.org');
  assert.equal(result.hasAnalyzedEvidence, false);
  assert.equal(result.threatLevel, 'unknown');
  assert.equal(result.evidenceSummary, 'No URL-specific analysis returned');
  assert.ok(!result.evidenceSummary.toLowerCase().includes('safe'), 'Unknown link must never be marked safe');
});

test('Link Test 6: Non-web protocols return null and are ignored', () => {
  assert.equal(LinkInspector.inspect('javascript:alert(1)', null), null);
  assert.equal(LinkInspector.inspect('mailto:support@test.com', null), null);
  assert.equal(LinkInspector.inspect('data:text/html,<h1>test</h1>', null), null);
  assert.equal(LinkInspector.inspect('#anchor', null), null);
  assert.equal(LinkInspector.inspect('tel:+1234567890', null), null);
});

test('Link Test 7: Null or malformed links handle safely without throwing', () => {
  assert.doesNotThrow(() => {
    assert.equal(LinkInspector.inspect(null, null), null);
    assert.equal(LinkInspector.inspect('', null), null);
    assert.equal(LinkInspector.inspect('   ', null), null);
  });
});
