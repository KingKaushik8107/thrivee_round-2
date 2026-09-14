/**
 * PhishX Browser Extension — Gmail Content Script Coordinator (Phase 7)
 * 
 * Orchestrates Gmail SPA navigation detection, resilient DOM extraction,
 * fingerprint deduplication, service worker communication, delegated safe
 * link-hover inspection, and in-page risk-tiered cybersecurity card presentation.
 */

import { GmailDetector } from './gmail/detector';
import { gmailExtractor } from './gmail/extractor';
import { GmailUI } from './gmail/ui';
import { LinkInspector } from './gmail/link-inspector';
import type { AnalyzeEmailResponse } from '../shared/messages';
import type { EmailAnalysisRequest, IncidentAnalysis } from '../types';

console.log('[PhishX Extension] Gmail Content Script Coordinator (Phase 7) initialized.');

class GmailContentCoordinator {
  private lastFingerprint: string | null = null;
  private isAnalyzing: boolean = false;
  private currentAnalysis: IncidentAnalysis | null = null;
  private currentEmailData: EmailAnalysisRequest | null = null;
  private debounceTimer: number | null = null;
  private observer: MutationObserver | null = null;
  private isLinkListenerAttached: boolean = false;

  public init() {
    // 1. Initial view scan
    this.scheduleScan(100);

    // 2. SPA Navigation Listeners (Hash / Popstate)
    window.addEventListener('hashchange', () => this.handleNavigationChange());
    window.addEventListener('popstate', () => this.handleNavigationChange());

    // 3. Intercept history pushState/replaceState for SPA transitions
    this.patchHistoryEvents();

    // 4. MutationObserver for DOM changes with 350ms debounce
    this.initMutationObserver();

    // 5. Delegated safe link-hover inspection listener (attached once)
    this.initLinkHoverListener();

    // 6. Message listener from Extension Popup or Background Worker
    this.initMessageListener();
  }

  private initMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver(() => {
      this.scheduleScan(350);
    });

    this.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  private patchHistoryEvents() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleNavigationChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleNavigationChange();
    };
  }

  private handleNavigationChange() {
    this.scheduleScan(200);
  }

  /**
   * Sets up delegated event listeners for safe link inspection.
   * STRICT SAFETY:
   * 1. Attached once via event delegation (no listener leaks on DOM mutations).
   * 2. Evaluates links against this.currentAnalysis (ZERO network calls on hover).
   * 3. Never modifies link href or navigates.
   */
  private initLinkHoverListener() {
    if (this.isLinkListenerAttached) return;
    this.isLinkListenerAttached = true;

    // Delegate mouseover for anchor links
    document.addEventListener(
      'mouseover',
      (event: MouseEvent) => {
        const target = (event.target as HTMLElement)?.closest<HTMLAnchorElement>('a[href]');
        if (!target) return;

        // Ensure link is inside email body / message container
        const isInsideMessage = target.closest('.adn, .ii.gt, .a3s, [role="main"]');
        if (!isInsideMessage) return;

        const href = target.getAttribute('href') || target.href;
        const result = LinkInspector.inspect(href, this.currentAnalysis);
        if (result) {
          GmailUI.renderLinkInspection(result, target.getBoundingClientRect());
        }
      },
      { passive: true }
    );

    // Delegate mouseout to remove inspection card
    document.addEventListener(
      'mouseout',
      (event: MouseEvent) => {
        const target = (event.target as HTMLElement)?.closest<HTMLAnchorElement>('a[href]');
        if (target) {
          GmailUI.hideLinkInspection();
        }
      },
      { passive: true }
    );

    // Keyboard focus accessibility
    document.addEventListener(
      'focusin',
      (event: FocusEvent) => {
        const target = (event.target as HTMLElement)?.closest<HTMLAnchorElement>('a[href]');
        if (!target) return;
        const isInsideMessage = target.closest('.adn, .ii.gt, .a3s, [role="main"]');
        if (!isInsideMessage) return;

        const href = target.getAttribute('href') || target.href;
        const result = LinkInspector.inspect(href, this.currentAnalysis);
        if (result) {
          GmailUI.renderLinkInspection(result, target.getBoundingClientRect());
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'focusout',
      () => {
        GmailUI.hideLinkInspection();
      },
      { passive: true }
    );
  }

  private scheduleScan(delayMs: number) {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.scanAndProcess();
    }, delayMs);
  }

  private scanAndProcess() {
    const isEmailOpen = GmailDetector.isEmailOpen();

    if (!isEmailOpen) {
      if (this.lastFingerprint !== null) {
        // User transitioned from an email back to inbox or settings
        this.lastFingerprint = null;
        this.currentAnalysis = null;
        this.currentEmailData = null;
        GmailUI.render('IDLE');
      }
      return;
    }

    // Extract current email
    const emailData = gmailExtractor.extract();
    if (!emailData) {
      return;
    }

    // Calculate deterministic fingerprint
    const fingerprint = gmailExtractor.getFingerprint(emailData);

    // Prevent duplicate analysis if email hasn't changed
    if (fingerprint === this.lastFingerprint) {
      return;
    }

    // New email detected!
    this.lastFingerprint = fingerprint;
    this.currentEmailData = emailData;
    console.log(`[PhishX Gmail] New email detected (fingerprint: ${fingerprint})`);

    // Notify background worker of active email
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'EMAIL_DETECTED',
        payload: emailData
      });
    }

    // Trigger analysis
    this.executeAnalysis(emailData);
  }

  private executeAnalysis(emailData: EmailAnalysisRequest) {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    GmailUI.render('ANALYZING');

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: 'ANALYZE_EMAIL',
          payload: emailData
        },
        (response: AnalyzeEmailResponse) => {
          this.isAnalyzing = false;
          if (response && response.success) {
            this.currentAnalysis = response.data;
            console.log(
              `[PhishX Gmail] Analysis completed: ${this.currentAnalysis.verdict} (Risk: ${this.currentAnalysis.risk_score})`
            );
            GmailUI.render(
              'ANALYZED',
              this.currentAnalysis,
              undefined,
              () => this.executeAnalysis(emailData),
              () => this.executeAnalysis(emailData)
            );
          } else {
            console.warn('[PhishX Gmail] Analysis error:', response?.error);
            GmailUI.render(
              'ERROR',
              null,
              'Analysis unavailable. Could not reach backend investigation service.',
              () => this.executeAnalysis(emailData),
              () => this.executeAnalysis(emailData)
            );
          }
        }
      );
    } else {
      // Dev / preview simulation fallback
      setTimeout(() => {
        this.isAnalyzing = false;
        const isPhish = emailData.body.includes('verify') || emailData.subject.includes('URGENT');
        this.currentAnalysis = {
          incident_id: 'gmail-demo-id',
          verdict: isPhish ? 'critical_phishing' : 'legitimate',
          risk_score: isPhish ? 89.9 : 5.0,
          ml_probability: isPhish ? 0.9973 : 0.001,
          attack_type: isPhish ? 'credential_harvesting' : 'none',
          summary: 'In-page test completed.',
          explanation: 'Safe XAI extraction verification.',
          indicators: isPhish ? ['Sender display mismatch', 'Suspicious URL'] : [],
          xai: {
            model_features: {
              decision_score: isPhish ? 5.9061 : -6.21,
              intercept: 0.132,
              total_feature_contribution: isPhish ? 5.7741 : -6.342,
              is_mathematically_valid: true,
              top_phishing_features: isPhish
                ? [
                    { feature: 'verify', weight: 1.9689, tfidf: 0.3925, contribution: 0.7729, direction: 'phishing' },
                    { feature: 'account', weight: 2.546, tfidf: 0.3137, contribution: 0.7987, direction: 'phishing' }
                  ]
                : [],
              top_legitimate_features: !isPhish
                ? [
                    { feature: 'meeting', weight: -8.45, tfidf: 0.22, contribution: -1.859, direction: 'legitimate' }
                  ]
                : []
            },
            forensic_evidence: isPhish
              ? [
                  { analyzer: 'sender_analyzer', finding: 'Sender domain mismatch', severity: 'high', description: 'Sender spoofing detected' },
                  { analyzer: 'url_analyzer', finding: 'Suspicious external URL', severity: 'high', description: 'IP host or typosquatting' }
                ]
              : [],
            threat_intelligence_evidence: [],
            summary: 'Features identified.',
            confidence_notes: []
          }
        };
        GmailUI.render(
          'ANALYZED',
          this.currentAnalysis,
          undefined,
          () => this.executeAnalysis(emailData),
          () => this.executeAnalysis(emailData)
        );
      }, 500);
    }
  }

  private initMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || typeof message !== 'object') return false;

        if (message.type === 'PING') {
          sendResponse({
            status: 'ready',
            phase: '8',
            currentAnalysis: this.currentAnalysis,
            currentEmailData: this.currentEmailData,
            isEmailOpen: GmailDetector.isEmailOpen()
          });
          return false;
        }

        if (message.type === 'GET_CONTENT_STATE' || message.type === 'GET_ACTIVE_EMAIL') {
          const isEmailOpen = GmailDetector.isEmailOpen();
          let emailData = this.currentEmailData;
          if (isEmailOpen && !emailData) {
            emailData = gmailExtractor.extract();
            this.currentEmailData = emailData;
          }
          sendResponse({
            success: true,
            data: {
              isEmailOpen,
              emailData,
              currentAnalysis: this.currentAnalysis
            }
          });
          return false;
        }

        return false;
      });
    }
  }
}

// Auto-instantiate coordinator in Gmail pages
const coordinator = new GmailContentCoordinator();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => coordinator.init());
} else {
  coordinator.init();
}
