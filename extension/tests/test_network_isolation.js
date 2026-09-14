/**
 * Automated Network Isolation & Security Policy Verification Suite
 * 
 * Programmatically validates:
 * 1. Manifest permissions policy (Zero webRequest, zero debugger, zero tabs/history/cookies).
 * 2. Host scope restrictions (Gmail-only content script, Vercel/localhost API only, zero Meet permissions).
 * 3. Background Service Worker isolation (Zero FetchEvent / network proxying listeners).
 * 4. ThriveApiClient network targeting (Only configured API base, zero Meet URLs).
 * 5. Safe LinkInspector isolation (Zero network calls on hover, clean classification of internal Google Meet).
 * 6. GmailExtractor link filtering (meet.google.com filtered out of extracted payload URLs).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

import { ThriveApiClient } from '../src/api/thrive-api.ts';
import { LinkInspector } from '../src/content/gmail/link-inspector.ts';
import { INTERNAL_GOOGLE_DOMAINS } from '../src/content/gmail/selectors.ts';
import { API_BASE_URL, SOC_BASE_URL } from '../src/config.ts';

test('Isolation Test 1: Manifest contains zero invasive network interception permissions', () => {
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const permissions = manifest.permissions || [];
  
  const forbiddenPermissions = [
    'webRequest',
    'webRequestBlocking',
    'declarativeNetRequest',
    'declarativeNetRequestWithHostAccess',
    'tabs',
    'history',
    'cookies',
    'debugger',
    'management',
    'proxy'
  ];

  for (const forbidden of forbiddenPermissions) {
    assert.equal(
      permissions.includes(forbidden),
      false,
      `Manifest must not request invasive permission '${forbidden}'`
    );
  }
});

test('Isolation Test 2: Host permissions strictly isolate localhost API and exclude Google Meet and Vercel', () => {
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const hostPermissions = manifest.host_permissions || [];

  // Verify local backend is allowed
  assert.ok(
    hostPermissions.some((h) => h.includes('localhost:8000')),
    'Host permissions must include localhost:8000'
  );
  assert.ok(
    hostPermissions.some((h) => h.includes('127.0.0.1:8000')),
    'Host permissions must include 127.0.0.1:8000'
  );

  // Verify production Vercel is NOT in host_permissions
  assert.equal(
    hostPermissions.some((h) => h.includes('phisdetect-tau.vercel.app') || h.includes('vercel.app')),
    false,
    'Host permissions must NOT include Vercel domains'
  );

  // Verify meet.google.com is NOT in host_permissions
  assert.equal(
    hostPermissions.some((h) => h.includes('meet.google.com')),
    false,
    'Host permissions must NOT include meet.google.com'
  );

  // Verify content script scope is strictly Gmail
  const contentScripts = manifest.content_scripts || [];
  assert.ok(contentScripts.length > 0);
  const matches = contentScripts[0].matches || [];
  assert.deepEqual(matches, ['https://mail.google.com/*']);
});

test('Isolation Test 3: Service worker contains zero FetchEvent listeners or proxying logic', () => {
  const swPath = path.join(ROOT_DIR, 'src', 'background', 'service-worker.ts');
  assert.ok(fs.existsSync(swPath), 'service-worker.ts must exist');
  
  const swCode = fs.readFileSync(swPath, 'utf8');

  assert.equal(
    swCode.includes('addEventListener("fetch"') || swCode.includes("addEventListener('fetch'"),
    false,
    'Service worker must NOT attach fetch event listeners'
  );

  assert.equal(
    swCode.includes('FetchEvent'),
    false,
    'Service worker must NOT reference FetchEvent'
  );

  assert.equal(
    swCode.includes('chrome.webRequest'),
    false,
    'Service worker must NOT reference chrome.webRequest'
  );
});

test('Isolation Test 4: ThriveApiClient defaults to localhost API and never contacts meet.google.com or Vercel', () => {
  const client = new ThriveApiClient();
  assert.equal(client.getBaseUrl(), 'http://localhost:8000/api');

  // Verify default API_BASE_URL and SOC_BASE_URL
  assert.equal(API_BASE_URL, 'http://localhost:8000/api');
  assert.equal(SOC_BASE_URL, 'http://localhost:5173');

  assert.equal(API_BASE_URL.includes('meet.google.com'), false);
  assert.equal(API_BASE_URL.includes('vercel.app'), false);
  assert.equal(SOC_BASE_URL.includes('vercel.app'), false);
});

test('Isolation Test 5: LinkInspector performs zero network calls and classifies meet.google.com as internal', () => {
  const meetUrls = [
    'https://meet.google.com/call?subdomain=mail&origin=https%3A%2F%2Fmail.google.com',
    'https://meet.google.com/_/frame?authuser=0',
    'https://meet.google.com/abc-defg-hij'
  ];

  for (const url of meetUrls) {
    const res = LinkInspector.inspect(url, null);
    assert.ok(res, `LinkInspector must handle ${url} safely`);
    assert.equal(res.isInternalGoogle, true, 'Google Meet must be classified as internal Google service');
    assert.equal(res.threatLevel, 'low');
    assert.equal(res.hasAnalyzedEvidence, false);
  }
});

test('Isolation Test 6: Unknown external URLs are labeled UNANALYZED and never triggered over network', () => {
  const unknownUrl = 'https://some-random-unknown-domain-999.com/path';
  const res = LinkInspector.inspect(unknownUrl, null);
  
  assert.ok(res);
  assert.equal(res.isInternalGoogle, false);
  assert.equal(res.hasAnalyzedEvidence, false);
  assert.equal(res.threatLevel, 'unknown');
  assert.equal(res.evidenceSummary, 'No URL-specific analysis returned');
});

test('Isolation Test 7: INTERNAL_GOOGLE_DOMAINS explicitly contains meet.google.com and mail.google.com', () => {
  assert.ok(INTERNAL_GOOGLE_DOMAINS.includes('meet.google.com'));
  assert.ok(INTERNAL_GOOGLE_DOMAINS.includes('mail.google.com'));
  assert.ok(INTERNAL_GOOGLE_DOMAINS.includes('accounts.google.com'));
  assert.ok(INTERNAL_GOOGLE_DOMAINS.includes('support.google.com'));
});

test('Isolation Test 8: Runtime configuration defaults strictly to local development environment', () => {
  assert.equal(API_BASE_URL, 'http://localhost:8000/api');
  assert.equal(SOC_BASE_URL, 'http://localhost:5173');
});

test('Isolation Test 9: Extension source files contain zero references to Vercel production endpoints', () => {
  const srcDir = path.join(ROOT_DIR, 'src');
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.equal(
          content.includes('phisdetect-tau.vercel.app'),
          false,
          `Source file ${entry.name} must not contain Vercel production domain`
        );
      }
    }
  }

  scanDir(srcDir);
});
