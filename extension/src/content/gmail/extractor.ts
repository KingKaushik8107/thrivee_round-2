/**
 * PhishX Browser Extension — Resilient Gmail Extractor
 * 
 * Safely extracts sender, subject, message body, and links from the opened Gmail message.
 * Adheres to strict privacy, data minimization, payload capping, and DOM resilience rules.
 */

import type { EmailAnalysisRequest } from '../../types';
import { GMAIL_SELECTORS, INTERNAL_GOOGLE_DOMAINS } from './selectors';
import { GmailDetector } from './detector';

// Maximum client-side body size to prevent oversized API payloads
export const MAX_BODY_CHARACTERS = 50000;

export class GmailExtractor {
  /**
   * Safely extracts email information from the currently opened Gmail message.
   * Returns null if no valid email can be confidently extracted.
   */
  public extract(): EmailAnalysisRequest | null {
    if (!GmailDetector.isEmailOpen()) {
      return null;
    }

    const container = GmailDetector.getActiveMessageContainer();

    const sender = this.extractSender(container);
    const subject = this.extractSubject();
    const { body, urls } = this.extractBodyAndUrls(container);

    // If nothing meaningful could be extracted, do not send guessed data
    const hasMeaningfulContent = Boolean(
      (sender && sender.trim().length > 0) ||
      (subject && subject.trim().length > 0) ||
      (body && body.trim().length > 0) ||
      (urls && urls.length > 0)
    );

    if (!hasMeaningfulContent) {
      return null;
    }

    return {
      sender: sender || '',
      subject: subject || '',
      body: body || '',
      urls: urls || []
    };
  }

  /**
   * Extracts the sender using multiple fallback strategies.
   */
  public extractSender(container: HTMLElement | null): string {
    const searchRoots: (HTMLElement | Document)[] = [];
    if (container) searchRoots.push(container);
    searchRoots.push(document);

    for (const root of searchRoots) {
      for (const selector of GMAIL_SELECTORS.SENDER) {
        const elements = root.querySelectorAll<HTMLElement>(selector);
        for (const el of Array.from(elements)) {
          // 1. Check direct 'email' attribute (standard in Gmail span.gD)
          const emailAttr = el.getAttribute('email');
          if (emailAttr && this.isValidEmail(emailAttr)) {
            const name = el.getAttribute('name') || el.textContent?.trim();
            if (name && name !== emailAttr && !name.includes('@')) {
              return `${name} <${emailAttr}>`;
            }
            return emailAttr;
          }

          // 2. Check 'data-hovercard-id' attribute
          const hovercardId = el.getAttribute('data-hovercard-id');
          if (hovercardId && this.isValidEmail(hovercardId)) {
            const name = el.textContent?.trim();
            if (name && name !== hovercardId && !name.includes('@')) {
              return `${name} <${hovercardId}>`;
            }
            return hovercardId;
          }

          // 3. Check aria-label containing email
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) {
            const matchedEmail = this.findEmailInString(ariaLabel);
            if (matchedEmail) {
              return matchedEmail;
            }
          }

          // 4. Check text content
          const text = el.textContent?.trim();
          if (text) {
            const matchedEmail = this.findEmailInString(text);
            if (matchedEmail) {
              return text;
            }
          }
        }
      }
    }

    return '';
  }

  /**
   * Extracts the subject line with fallbacks.
   */
  public extractSubject(): string {
    // 1. Try DOM selectors
    for (const selector of GMAIL_SELECTORS.SUBJECT) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && el.textContent) {
        const subject = el.textContent.trim().replace(/\s+/g, ' ');
        if (subject.length > 0) {
          return subject;
        }
      }
    }

    // 2. Fallback to document.title
    if (document.title) {
      let title = document.title;
      // Strip unread counts like "(1) " or "(99+) "
      title = title.replace(/^\(\d+\+?\)\s*/, '');
      // Strip " - Gmail" suffix or "Gmail - " prefix
      title = title.replace(/\s*-\s*Gmail\s*$/i, '').replace(/^Gmail\s*-\s*/i, '');
      // Strip "Inbox - " prefix if present
      title = title.replace(/^Inbox\s*-\s*/i, '');
      title = title.trim();

      if (title.length > 0 && title.toLowerCase() !== 'gmail' && title.toLowerCase() !== 'inbox') {
        return title;
      }
    }

    return '';
  }

  /**
   * Extracts body text and deduplicated URLs from the message container.
   */
  public extractBodyAndUrls(container: HTMLElement | null): { body: string; urls: string[] } {
    const searchRoots: (HTMLElement | Document)[] = [];
    if (container) searchRoots.push(container);
    searchRoots.push(document);

    let bodyElement: HTMLElement | null = null;

    for (const root of searchRoots) {
      for (const selector of GMAIL_SELECTORS.BODY) {
        const el = root.querySelector<HTMLElement>(selector);
        if (el && el.textContent && el.textContent.trim().length > 0) {
          bodyElement = el;
          break;
        }
      }
      if (bodyElement) break;
    }

    if (!bodyElement) {
      return { body: '', urls: [] };
    }

    // Clone element to sanitize without mutating live page DOM
    const clone = bodyElement.cloneNode(true) as HTMLElement;

    // Remove any excluded elements from the clone
    for (const excludedSel of GMAIL_SELECTORS.EXCLUDED_ELEMENTS) {
      const excludedEls = clone.querySelectorAll(excludedSel);
      excludedEls.forEach((el) => el.remove());
    }

    // Extract links from clone
    const rawLinks = Array.from(clone.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const urlSet = new Set<string>();

    for (const link of rawLinks) {
      const href = link.getAttribute('href') || link.href;
      const normalizedUrl = this.normalizeEmailUrl(href);
      if (normalizedUrl) {
        urlSet.add(normalizedUrl);
      }
    }

    // Extract sanitized plain text
    let rawText = clone.innerText || clone.textContent || '';
    // Normalize newlines and whitespace
    rawText = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
    rawText = rawText.replace(/\n\s*\n\s*\n+/g, '\n\n');
    rawText = rawText.trim();

    // Enforce payload length ceiling safely
    if (rawText.length > MAX_BODY_CHARACTERS) {
      rawText = rawText.slice(0, MAX_BODY_CHARACTERS) + '\n\n[Content truncated for analysis]';
    }

    return {
      body: rawText,
      urls: Array.from(urlSet)
    };
  }

  /**
   * Normalizes an email link, unwrapping Google redirection and filtering UI links.
   */
  public normalizeEmailUrl(rawHref: string | null): string | null {
    if (!rawHref) return null;
    let urlStr = rawHref.trim();

    // Ignore non-web schemes
    if (
      urlStr.startsWith('javascript:') ||
      urlStr.startsWith('data:') ||
      urlStr.startsWith('blob:') ||
      urlStr.startsWith('#') ||
      urlStr.startsWith('tel:')
    ) {
      return null;
    }

    // Unwrap Google redirection links (e.g., https://www.google.com/url?q=https://target.com...)
    if (urlStr.includes('google.com/url?') || urlStr.includes('google.com/url/')) {
      try {
        const parsed = new URL(urlStr, window.location.origin);
        const targetQ = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (targetQ) {
          urlStr = decodeURIComponent(targetQ);
        }
      } catch {
        // Continue with raw url if parsing fails
      }
    }

    // Check if domain is an internal Google service
    try {
      const parsed = new URL(urlStr, window.location.origin);
      const hostname = parsed.hostname.toLowerCase();

      for (const internalDomain of INTERNAL_GOOGLE_DOMAINS) {
        if (hostname === internalDomain || hostname.endsWith(`.${internalDomain}`)) {
          return null;
        }
      }

      return parsed.href;
    } catch {
      // If relative or unable to parse as full URL, keep if it starts with http
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        return urlStr;
      }
      return null;
    }
  }

  /**
   * Generates a stable, deterministic fingerprint string for the email
   * to prevent re-analyzing the same message on subsequent DOM mutations.
   */
  public getFingerprint(data: EmailAnalysisRequest): string {
    const sender = (data.sender || '').trim().toLowerCase();
    const subject = (data.subject || '').trim().toLowerCase();
    const bodySample = (data.body || '').trim().slice(0, 300).toLowerCase();
    const urlsJoined = (data.urls || []).slice().sort().join(',');

    const combined = `${sender}:::${subject}:::${bodySample}:::${urlsJoined}`;
    return this.hashString(combined);
  }

  /**
   * Fast 32-bit FNV-1a hash function for generating compact fingerprints.
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  private isValidEmail(str: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
  }

  private findEmailInString(str: string): string | null {
    const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
  }
}

export const gmailExtractor = new GmailExtractor();
