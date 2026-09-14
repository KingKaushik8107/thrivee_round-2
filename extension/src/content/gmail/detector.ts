/**
 * PhishX Browser Extension — Gmail View Detector
 * 
 * Determines whether the user is actively viewing an email message / thread
 * versus an inbox list, settings pane, or compose window.
 */

import { GMAIL_SELECTORS } from './selectors';

export class GmailDetector {
  /**
   * Checks whether the current Gmail state corresponds to an open email view.
   */
  public static isEmailOpen(): boolean {
    // 1. Check URL hash / pathname heuristics for Gmail SPA
    const hash = window.location.hash || '';
    const isMessageUrl =
      /#[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]{10,}/.test(hash) ||
      hash.includes('?th=') ||
      hash.startsWith('#all/') ||
      hash.startsWith('#inbox/') ||
      hash.startsWith('#sent/') ||
      hash.startsWith('#starred/') ||
      hash.startsWith('#spam/') ||
      hash.startsWith('#trash/');

    // 2. Check DOM for presence of opened message containers or body containers
    const messageContainer = this.getActiveMessageContainer();
    if (messageContainer) {
      return true;
    }

    // Fallback: If URL strongly suggests a message and a subject heading exists
    if (isMessageUrl) {
      for (const selector of GMAIL_SELECTORS.SUBJECT) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Retrieves the active message container element in the DOM.
   * If multiple messages are expanded in a thread, returns the most recent or active one.
   */
  public static getActiveMessageContainer(): HTMLElement | null {
    // Search thread containers first
    for (const selector of GMAIL_SELECTORS.THREAD_CONTAINERS) {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      if (elements.length > 0) {
        // Return the last expanded/active element in thread
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          // Ensure it has visible dimensions and contains a message body
          if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.querySelector('.ii.gt, .a3s'))) {
            return el;
          }
        }
      }
    }

    // Direct fallback for message body element container
    for (const selector of GMAIL_SELECTORS.BODY) {
      const bodyEl = document.querySelector<HTMLElement>(selector);
      if (bodyEl) {
        // Find nearest message wrapper or return body parent
        const parentMessage = bodyEl.closest<HTMLElement>('.adn, .h7, [role="main"]');
        return parentMessage || bodyEl;
      }
    }

    return null;
  }
}
