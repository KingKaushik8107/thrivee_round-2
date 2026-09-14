/**
 * Phase 8 Extension Unit Tests
 * 
 * Verifies:
 * 1. Deep-link URL construction targeting exact incident (/incident/:id).
 * 2. Fallback console navigation when incident ID is undefined/empty.
 * 3. In-card incident ID badge formatting (INC-XXXXXX).
 * 4. Preservation of incident status and investigation fields.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

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

  getAllText() {
    let str = this.textContent || '';
    for (const child of this.children) {
      str += ' ' + child.getAllText();
    }
    return str.trim();
  }

  findButtonByText(pattern) {
    if (this.tagName === 'BUTTON' && (this.textContent || '').includes(pattern)) {
      return this;
    }
    for (const child of this.children) {
      const found = child.findButtonByText?.(pattern);
      if (found) return found;
    }
    return null;
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

let openedUrl = null;
const mockDoc = new MockUIDocument();
global.document = mockDoc;
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  open: (url) => {
    openedUrl = url;
  }
};

import { GmailUI } from '../src/content/gmail/ui.ts';

test('GmailUI Phase 8 — Deep Link URL Generation to Exact Incident', () => {
  mockDoc.body.children = [];
  openedUrl = null;
  const mockAnalysis = {
    incident_id: 'a8b9c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
    verdict: 'phishing',
    risk_score: 85.0,
    ml_probability: 0.92,
    status: 'investigating',
    attack_type: 'credential_harvesting',
    summary: 'Suspicious login link detected.',
    explanation: 'High threat detected.',
    indicators: []
  };

  GmailUI.render('ANALYZED', mockAnalysis);

  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  assert.ok(container, 'UI container should be rendered in DOM');

  const socConsoleBtn = container.findButtonByText('SOC Console');
  assert.ok(socConsoleBtn, 'View in SOC Console button should be present');

  // Trigger click
  socConsoleBtn.onclick();
  assert.equal(
    openedUrl,
    'http://localhost:5173/incident/a8b9c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
    'Clicking button should open deep link with exact incident ID'
  );
});

test('GmailUI Phase 8 — Deep Link Fallback when Incident ID is missing', () => {
  mockDoc.body.children = [];
  openedUrl = null;
  const mockAnalysis = {
    incident_id: '',
    verdict: 'legitimate',
    risk_score: 10.0,
    ml_probability: 0.05,
    attack_type: 'generic_phishing',
    summary: 'Clean email.',
    explanation: 'No indicators.',
    indicators: []
  };

  GmailUI.render('ANALYZED', mockAnalysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const socConsoleBtn = container.findButtonByText('SOC Console');
  assert.ok(socConsoleBtn);

  socConsoleBtn.onclick();
  assert.equal(
    openedUrl,
    'http://localhost:5173',
    'Clicking button without incident ID should fallback to base console URL'
  );
});

test('GmailUI Phase 8 — Formats Incident ID pill in Verdict Row', () => {
  mockDoc.body.children = [];
  const mockAnalysis = {
    incident_id: '12345678-abcd-ef01-2345-6789abcdef01',
    verdict: 'suspicious',
    risk_score: 45.0,
    ml_probability: 0.40,
    status: 'new',
    attack_type: 'generic_phishing',
    summary: 'Suspicious email.',
    explanation: 'Review required.',
    indicators: []
  };

  GmailUI.render('ANALYZED', mockAnalysis);
  const container = mockDoc.getElementById('phishx-gmail-banner-root');
  const allText = container.getAllText();
  assert.ok(allText.includes('INC-12345678'), 'Should display INC-12345678 badge');
});
