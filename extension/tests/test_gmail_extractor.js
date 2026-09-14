/**
 * Automated Unit Test Suite for Gmail Extractor (Phase 6A)
 * 
 * Verifies all 10 required acceptance criteria test cases for Gmail extraction,
 * sanitization, URL filtering, deduplication, payload capping, fingerprinting,
 * and resilient DOM error handling.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

// Import compiled or source extractor modules
// We construct a mock DOM environment to verify the extraction logic reliably.

class MockElement {
  constructor(tagName = 'div', attributes = {}, textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.textContent = textContent;
    this.innerText = textContent;
    this.children = [];
    this.parentElement = null;
    this.offsetWidth = 100;
    this.offsetHeight = 100;
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

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName, this.attributes, this.textContent);
    clone.innerText = this.innerText;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matchesSelector(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  matchesSelector(selector) {
    if (selector.includes('.adn') && (this.attributes.class || '').includes('adn')) return true;
    if (selector.includes('.h7') && (this.attributes.class || '').includes('h7')) return true;
    if (selector.includes('[role="main"]') && this.attributes.role === 'main') return true;
    return false;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      if (this.nodeMatches(node, selector)) {
        results.push(node);
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    for (const child of this.children) {
      walk(child);
    }
    return results;
  }

  nodeMatches(node, selector) {
    const classes = (node.attributes.class || '').split(/\s+/);
    const role = node.attributes.role;
    const email = node.attributes.email;
    const hovercard = node.attributes['data-hovercard-id'];

    if (selector === 'a[href]') {
      return node.tagName === 'A' && Boolean(node.attributes.href);
    }
    if (selector === 'span[email]') {
      return node.tagName === 'SPAN' && Boolean(email);
    }
    if (selector === '[data-hovercard-id]') {
      return Boolean(hovercard);
    }
    if (selector.includes('.gD') && classes.includes('gD')) return true;
    if (selector.includes('.go') && classes.includes('go')) return true;
    if (selector.includes('h2.hP') && node.tagName === 'H2' && classes.includes('hP')) return true;
    if (selector.includes('h2') && node.tagName === 'H2') return true;
    if (selector.includes('.ii.gt') && classes.includes('ii') && classes.includes('gt')) return true;
    if (selector.includes('.a3s') && classes.includes('a3s')) return true;
    if (selector.includes('.adn') && classes.includes('adn')) return true;
    if (selector.includes('[role="main"]') && role === 'main') return true;
    if (selector.includes('[role="navigation"]') && role === 'navigation') return true;

    return false;
  }
}

class MockDocument extends MockElement {
  constructor() {
    super('HTML');
    this.body = new MockElement('BODY');
    this.appendChild(this.body);
    this.title = 'Inbox (1) - user@gmail.com - Gmail';
  }
}

// Emulated Extractor Logic for Verification
import { MAX_BODY_CHARACTERS, GmailExtractor } from '../src/content/gmail/extractor.ts';

// Setup Global Mock DOM
const mockDoc = new MockDocument();
global.document = mockDoc;
global.window = {
  location: {
    hash: '#inbox/FMfcgzGsnBsQxZ',
    origin: 'https://mail.google.com'
  }
};

const extractor = new GmailExtractor();

test('Test 1: Valid email extraction (sender, subject, body, links)', () => {
  mockDoc.body.children = [];
  window.location.hash = '#inbox/FMfcgzGsnBsQxZ';

  const main = new MockElement('div', { role: 'main', class: 'nH' });
  const thread = new MockElement('div', { class: 'adn ads' });
  const subject = new MockElement('h2', { class: 'hP' }, 'URGENT: Verify Your Bank Account');
  const senderSpan = new MockElement('span', { class: 'gD', email: 'security@paypal-verification.com', name: 'PayPal Security' }, 'PayPal Security');
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, 'Dear customer, please verify your account immediately.');
  
  const link = new MockElement('a', { href: 'http://paypal-verification.com/login' }, 'Click here');
  bodyDiv.appendChild(link);

  thread.appendChild(subject);
  thread.appendChild(senderSpan);
  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result, 'Result should not be null');
  assert.match(result.sender, /security@paypal-verification\.com/);
  assert.equal(result.subject, 'URGENT: Verify Your Bank Account');
  assert.ok(result.body.includes('verify your account immediately'));
  assert.equal(result.urls.length, 1);
  assert.equal(result.urls[0], 'http://paypal-verification.com/login');
});

test('Test 2: Missing sender behaves safely', () => {
  mockDoc.body.children = [];
  const main = new MockElement('div', { role: 'main' });
  const thread = new MockElement('div', { class: 'adn ads' });
  const subject = new MockElement('h2', { class: 'hP' }, 'Quarterly Planning Notes');
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, 'Here are the meeting notes for Q3.');
  
  thread.appendChild(subject);
  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result);
  assert.equal(result.sender, '');
  assert.equal(result.subject, 'Quarterly Planning Notes');
  assert.ok(result.body.includes('meeting notes for Q3'));
});

test('Test 3: Missing subject falls back safely', () => {
  mockDoc.body.children = [];
  mockDoc.title = 'Important Security Notice - Gmail';
  const main = new MockElement('div', { role: 'main' });
  const thread = new MockElement('div', { class: 'adn ads' });
  const senderSpan = new MockElement('span', { class: 'gD', email: 'it-support@corp.com' }, 'IT Support');
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, 'Password update is required.');
  
  thread.appendChild(senderSpan);
  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result);
  assert.equal(result.subject, 'Important Security Notice');
  assert.equal(result.sender, 'IT Support <it-support@corp.com>');
});

test('Test 4: No email currently open returns null', () => {
  mockDoc.body.children = [];
  window.location.hash = '#inbox';
  mockDoc.title = 'Inbox (5) - user@gmail.com - Gmail';

  const result = extractor.extract();
  assert.equal(result, null, 'Should return null when in inbox list view without open email');
});

test('Test 5: Duplicate URLs are deduplicated', () => {
  mockDoc.body.children = [];
  window.location.hash = '#all/FMfcgzGsnBsQxZ';
  const main = new MockElement('div', { role: 'main' });
  const thread = new MockElement('div', { class: 'adn ads' });
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, 'Check these links:');
  
  bodyDiv.appendChild(new MockElement('a', { href: 'https://evil-phish.com/track' }));
  bodyDiv.appendChild(new MockElement('a', { href: 'https://evil-phish.com/track' }));
  bodyDiv.appendChild(new MockElement('a', { href: 'https://evil-phish.com/track' }));

  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result);
  assert.equal(result.urls.length, 1);
  assert.equal(result.urls[0], 'https://evil-phish.com/track');
});

test('Test 6: Internal Gmail navigation links are filtered out & Google redirects unwrapped', () => {
  mockDoc.body.children = [];
  window.location.hash = '#inbox/FMfcgzGsnBsQxZ';
  const main = new MockElement('div', { role: 'main' });
  const thread = new MockElement('div', { class: 'adn ads' });
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, 'Links:');
  
  // Internal UI link
  bodyDiv.appendChild(new MockElement('a', { href: 'https://support.google.com/mail/answer/1234' }));
  bodyDiv.appendChild(new MockElement('a', { href: 'https://mail.google.com/mail/u/0/#settings' }));
  
  // Google redirect to external phishing link
  bodyDiv.appendChild(new MockElement('a', { href: 'https://www.google.com/url?q=https%3A%2F%2Fsecure-login-paypal.com%2Fauth' }));

  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result);
  assert.equal(result.urls.length, 1);
  assert.equal(result.urls[0], 'https://secure-login-paypal.com/auth');
});

test('Test 7: Large body exceeds limit is safely truncated', () => {
  mockDoc.body.children = [];
  window.location.hash = '#inbox/FMfcgzGsnBsQxZ';
  const main = new MockElement('div', { role: 'main' });
  const thread = new MockElement('div', { class: 'adn ads' });
  
  const hugeText = 'A'.repeat(60000);
  const bodyDiv = new MockElement('div', { class: 'ii gt a3s aiL' }, hugeText);

  thread.appendChild(bodyDiv);
  main.appendChild(thread);
  mockDoc.body.appendChild(main);

  const result = extractor.extract();
  assert.ok(result);
  assert.ok(result.body.length <= MAX_BODY_CHARACTERS + 100);
  assert.ok(result.body.includes('[Content truncated for analysis]'));
});

test('Test 8: Repeated DOM mutations produce identical fingerprint', () => {
  const emailA = {
    sender: 'boss@corp.com',
    subject: 'Urgent Wire Transfer',
    body: 'Please transfer $50,000 to the attached account.',
    urls: ['https://bank-transfer-wire.com']
  };

  const fp1 = extractor.getFingerprint(emailA);
  const fp2 = extractor.getFingerprint(emailA);
  assert.equal(fp1, fp2, 'Fingerprints must match exactly across repeated evaluations');
});

test('Test 9: Navigation to another email produces different fingerprint', () => {
  const emailA = {
    sender: 'boss@corp.com',
    subject: 'Urgent Wire Transfer',
    body: 'Please transfer $50,000 to the attached account.',
    urls: ['https://bank-transfer-wire.com']
  };

  const emailB = {
    sender: 'newsletter@tech.com',
    subject: 'Weekly Tech Digest',
    body: 'Here are the top stories this week.',
    urls: ['https://tech.com/stories']
  };

  const fpA = extractor.getFingerprint(emailA);
  const fpB = extractor.getFingerprint(emailB);
  assert.notEqual(fpA, fpB, 'Different emails must produce distinct fingerprints');
});

test('Test 10: Malformed DOM does not throw or crash', () => {
  mockDoc.body.children = [];
  window.location.hash = '#inbox/FMfcgzGsnBsQxZ';
  
  // Completely empty / strange structure
  const weirdDiv = new MockElement('div', { class: 'unknown-class' });
  mockDoc.body.appendChild(weirdDiv);

  assert.doesNotThrow(() => {
    extractor.extract();
    // Should safely return null or object without crashing
  });
});
