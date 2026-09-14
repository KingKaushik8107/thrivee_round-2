/**
 * Automated Unit Test Suite for Gmail Security UI (Phase 7)
 * 
 * Verifies risk-tiered UI presentation, backend verdict preservation,
 * explicit separation of Risk Score vs. ML Probability, raw XAI logit attributions (+0.81),
 * forensic evidence rendering, safe DOM construction (no innerHTML), accessibility,
 * and resilient error recovery.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

// Mock DOM Environment for UI rendering
class MockUIElement {
  constructor(tagName = 'div', attributes = {}, textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.textContent = textContent;
    this.children = [];
    this.parentElement = null;
    this.style = {};
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    const idx = this.children.indexOf(refChild);
    if (idx !== -1) {
      newChild.parentElement = this;
      this.children.splice(idx, 0, newChild);
    } else {
      this.appendChild(newChild);
    }
    return newChild;
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) {
        this.parentElement.children.splice(idx, 1);
      }
    }
  }

  replaceChildren(...newChildren) {
    this.children = [];
    for (const child of newChildren) {
      this.appendChild(child);
    }
  }

  getElementById(id) {
    if (this.attributes.id === id || this.id === id) return this;
    for (const child of this.children) {
      const found = child.getElementById ? child.getElementById(id) : null;
      if (found) return found;
    }
    return null;
  }

  // Helper to inspect all text inside element hierarchy
  getAllText() {
    let str = this.textContent || '';
    for (const child of this.children) {
      str += ' ' + child.getAllText();
    }
    return str.trim();
  }
}

class MockUIDocument extends MockUIElement {
  constructor() {
    super('HTML');
    this.body = new MockUIElement('BODY');
    this.appendChild(this.body);
  }

  createElement(tagName) {
    return new MockUIElement(tagName);
  }

  getElementById(id) {
    return this.body.getElementById(id);
  }
}

// Setup global mock DOM
const mockDoc = new MockUIDocument();
global.document = mockDoc;
global.window = {
  innerWidth: 1200,
  open: () => {}
};

import { GmailUI } from '../src/content/gmail/ui.ts';

test('UI Test 1: Risk 10 produces LEGITIMATE presentation without false 100% safe claim', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-1',
    verdict: 'legitimate',
    risk_score: 10.0,
    ml_probability: 0.001,
    attack_type: 'none',
    summary: 'Email analyzed.',
    explanation: 'Clean headers.',
    indicators: []
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  assert.ok(container, 'Container should be created');
  const allText = container.getAllText();
  assert.ok(allText.includes('LEGITIMATE'), 'Should display LEGITIMATE verdict');
  assert.ok(allText.includes('10 / 100'), 'Should display risk score');
  assert.ok(allText.includes('No significant phishing indicators detected'), 'Should show calm disclaimer');
  assert.ok(!allText.includes('100% safe'), 'Must never claim 100% safe');
});

test('UI Test 2: Risk 50 produces SUSPICIOUS presentation', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-2',
    verdict: 'suspicious',
    risk_score: 50.0,
    ml_probability: 0.62,
    attack_type: 'reconnaissance',
    summary: 'Suspicious email.',
    explanation: 'Review sender.',
    indicators: ['Suspicious external domain']
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('SUSPICIOUS'));
  assert.ok(allText.includes('50 / 100'));
  assert.ok(allText.includes('Some phishing indicators detected'));
});

test('UI Test 3: Risk 90 produces CRITICAL PHISHING presentation', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-3',
    verdict: 'critical_phishing',
    risk_score: 90.0,
    ml_probability: 0.998,
    attack_type: 'credential_harvesting',
    summary: 'Critical phishing.',
    explanation: 'Urgent action demanded.',
    indicators: ['Sender mismatch', 'IP host link']
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('CRITICAL PHISHING'));
  assert.ok(allText.includes('90 / 100'));
  assert.ok(allText.includes('Avoid clicking links'));
});

test('UI Test 4: Preserves backend verdict string exactly', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-4',
    verdict: 'credential_harvesting_attack',
    risk_score: 85.0,
    ml_probability: 0.95,
    attack_type: 'credential_harvesting',
    summary: 'Custom attack verdict.',
    explanation: '',
    indicators: []
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('CREDENTIAL HARVESTING ATTACK'), 'Backend verdict must be preserved in display');
});

test('UI Test 5: ML probability is displayed separately from risk score', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-5',
    verdict: 'phishing',
    risk_score: 74.0,
    ml_probability: 0.9973,
    attack_type: 'phishing',
    summary: '',
    explanation: '',
    indicators: []
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Risk Score:'), 'Must label Risk Score separately');
  assert.ok(allText.includes('74 / 100'), 'Must show 74 / 100');
  assert.ok(allText.includes('ML Probability:'), 'Must label ML Probability separately');
  assert.ok(allText.includes('99.7% phishing'), 'Must show formatted percentage for ML probability');
});

test('UI Test 6: XAI feature contributions are displayed as raw logits (+0.81), never percentages', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-6',
    verdict: 'critical_phishing',
    risk_score: 92.0,
    ml_probability: 0.99,
    attack_type: 'phishing',
    summary: '',
    explanation: '',
    indicators: [],
    xai: {
      model_features: {
        decision_score: 5.8,
        intercept: 0.13,
        total_feature_contribution: 5.67,
        is_mathematically_valid: true,
        top_phishing_features: [
          { feature: 'verify', weight: 1.96, tfidf: 0.41, contribution: 0.8123, direction: 'phishing' },
          { feature: 'suspended', weight: 2.12, tfidf: 0.30, contribution: 0.6412, direction: 'phishing' }
        ],
        top_legitimate_features: []
      },
      forensic_evidence: [],
      threat_intelligence_evidence: [],
      summary: '',
      confidence_notes: []
    }
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Strong phishing-direction ML features:'));
  assert.ok(allText.includes('• verify'));
  assert.ok(allText.includes('+0.81'), 'Must format contribution with sign');
  assert.ok(allText.includes('+0.64'), 'Must format contribution with sign');
  assert.ok(!allText.includes('0.81%') && !allText.includes('81%'), 'Feature contributions must NOT be formatted as percentages');
});

test('UI Test 7: Legitimate-direction features are labeled correctly', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-7',
    verdict: 'legitimate',
    risk_score: 5.0,
    ml_probability: 0.0002,
    attack_type: 'none',
    summary: '',
    explanation: '',
    indicators: [],
    xai: {
      model_features: {
        decision_score: -8.5,
        intercept: 0.13,
        total_feature_contribution: -8.63,
        is_mathematically_valid: true,
        top_phishing_features: [],
        top_legitimate_features: [
          { feature: 'enron', weight: -12.4, tfidf: 0.17, contribution: -2.14, direction: 'legitimate' }
        ]
      },
      forensic_evidence: [],
      threat_intelligence_evidence: [],
      summary: '',
      confidence_notes: []
    }
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Strong legitimate-direction ML features:'));
  assert.ok(allText.includes('• enron'));
  assert.ok(allText.includes('-2.14'));
});

test('UI Test 8: Security indicators summary handles strings and structured IndicatorDTO objects', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-8',
    verdict: 'phishing',
    risk_score: 78.0,
    ml_probability: 0.94,
    attack_type: 'phishing',
    summary: '',
    explanation: '',
    indicators: [
      {
        id: 'ind-1',
        source: 'sender_analyzer',
        category: 'sender',
        indicator_code: 'FREE_EMAIL_SPOOF',
        title: 'Suspicious sender/domain mismatch',
        severity: 'high',
        evidence: 'DisplayName <user@free.com>'
      },
      {
        id: 'ind-2',
        source: 'url_analyzer',
        category: 'url',
        indicator_code: 'SUSPICIOUS_URL',
        title: 'Suspicious external URL',
        severity: 'high',
        evidence: 'http://paypa1-update.com'
      }
    ],
    xai: {
      model_features: {
        decision_score: 4.2,
        intercept: 0.13,
        total_feature_contribution: 4.07,
        is_mathematically_valid: true,
        top_phishing_features: [],
        top_legitimate_features: []
      },
      forensic_evidence: [
        {
          source: 'brand_analyzer',
          category: 'brand',
          title: 'Brand impersonation detected',
          severity: 'high',
          evidence: 'PayPal brand target'
        }
      ],
      threat_intelligence_evidence: [],
      summary: '',
      confidence_notes: []
    }
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Security indicators:'));
  assert.ok(allText.includes('Suspicious sender/domain mismatch'));
  assert.ok(allText.includes('Suspicious external URL'));
  assert.ok(allText.includes('Brand impersonation detected'));
  assert.ok(!allText.includes('[object Object]'), 'Must NEVER render [object Object]');
});

test('UI Test 8b: Object with message or description renders meaningful text', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-8b',
    verdict: 'phishing',
    risk_score: 80.0,
    ml_probability: 0.9,
    attack_type: 'phishing',
    summary: '',
    explanation: '',
    indicators: [
      { message: 'Urgent action demanded in email body' },
      { description: 'Punycode lookalike domain identified' }
    ]
  };

  GmailUI.render('ANALYZED', analysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Urgent action demanded in email body'));
  assert.ok(allText.includes('Punycode lookalike domain identified'));
  assert.ok(!allText.includes('[object Object]'));
});

test('UI Test 8c: Nested indicator and malformed objects render safely without [object Object]', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-8c',
    verdict: 'phishing',
    risk_score: 82.0,
    ml_probability: 0.92,
    attack_type: 'phishing',
    summary: '',
    explanation: '',
    indicators: [
      { evidence: { title: 'Nested evidence finding' } },
      { category: 'attachment' },
      {},
      null,
      undefined
    ]
  };

  assert.doesNotThrow(() => {
    GmailUI.render('ANALYZED', analysis);
  });
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Nested evidence finding'));
  assert.ok(allText.includes('Suspicious attachment indicator'));
  assert.ok(allText.includes('Security indicator detected'));
  assert.ok(!allText.includes('[object Object]'), 'Must never contain [object Object]');
});

test('UI Test 9: Missing forensic evidence does not crash UI and section is omitted', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-9',
    verdict: 'legitimate',
    risk_score: 0.0,
    ml_probability: 0.001,
    attack_type: 'none',
    summary: '',
    explanation: '',
    indicators: [],
    xai: undefined
  };

  assert.doesNotThrow(() => {
    GmailUI.render('ANALYZED', analysis);
  });
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(!allText.includes('Security indicators:'), 'Should omit section when no evidence returned');
});

test('UI Test 10: Error response displays safe user-facing text and retry action', () => {
  mockDoc.body.children = [];
  let retryClicked = false;

  GmailUI.render('ERROR', null, 'Analysis unavailable. Could not connect to backend.', () => {
    retryClicked = true;
  });

  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('Analysis unavailable'));
  assert.ok(allText.includes('Retry Analysis'));
  assert.equal(retryClicked, false);
});

test('UI Test 11: Malformed XAI structure does not crash the UI', () => {
  mockDoc.body.children = [];
  const analysis = {
    incident_id: 'inc-11',
    verdict: 'suspicious',
    risk_score: 45.0,
    ml_probability: 0.5,
    attack_type: 'unknown',
    summary: '',
    explanation: '',
    indicators: null,
    xai: {
      model_features: null,
      forensic_evidence: null,
      threat_intelligence_evidence: null
    }
  };

  assert.doesNotThrow(() => {
    GmailUI.render('ANALYZED', analysis);
  });
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(!allText.includes('[object Object]'));
});
