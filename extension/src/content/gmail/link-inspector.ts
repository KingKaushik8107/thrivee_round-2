/**
 * PhishX Browser Extension — Safe Gmail Link Inspector (Phase 7)
 * 
 * Inspects links inside the currently opened Gmail message on hover.
 * STRICT SAFETY RULES:
 * 1. NEVER makes network requests or API calls on hover.
 * 2. Uses ONLY already-returned analysis data from the current email investigation.
 * 3. NEVER modifies, redirects, or navigates the link.
 * 4. NEVER claims an un-analyzed link is "safe".
 * 5. Uses safe DOM APIs and textContent.
 */

import type { IncidentAnalysis } from '../../types';
import { INTERNAL_GOOGLE_DOMAINS } from './selectors';

export interface LinkInspectionResult {
  rawUrl: string;
  normalizedUrl: string;
  domain: string;
  isInternalGoogle: boolean;
  hasAnalyzedEvidence: boolean;
  threatLevel: 'high' | 'medium' | 'low' | 'unknown';
  evidenceSummary: string;
  details: string[];
}

export class LinkInspector {
  /**
   * Evaluates a hovered link using strictly already-analyzed incident data.
   * Performs ZERO network requests.
   */
  public static inspect(
    rawHref: string | null,
    analysis: IncidentAnalysis | null
  ): LinkInspectionResult | null {
    if (!rawHref) return null;

    const normalized = this.normalizeUrl(rawHref);
    if (!normalized) return null;

    const domain = this.extractDomain(normalized);
    const isInternal = this.isInternalGoogleDomain(domain);

    // If it is an internal Google navigation link, mark as internal
    if (isInternal) {
      return {
        rawUrl: rawHref,
        normalizedUrl: normalized,
        domain,
        isInternalGoogle: true,
        hasAnalyzedEvidence: false,
        threatLevel: 'low',
        evidenceSummary: 'Internal Google service navigation link',
        details: []
      };
    }

    // Match against already-returned analysis
    const matchedEvidence = this.findMatchingAnalysisEvidence(normalized, domain, analysis);

    if (matchedEvidence) {
      return {
        rawUrl: rawHref,
        normalizedUrl: normalized,
        domain,
        isInternalGoogle: false,
        hasAnalyzedEvidence: true,
        threatLevel: matchedEvidence.threatLevel,
        evidenceSummary: matchedEvidence.summary,
        details: matchedEvidence.details
      };
    }

    // Not matched in analyzed results (e.g. dynamically inserted or newly added)
    return {
      rawUrl: rawHref,
      normalizedUrl: normalized,
      domain,
      isInternalGoogle: false,
      hasAnalyzedEvidence: false,
      threatLevel: 'unknown',
      evidenceSummary: 'No URL-specific analysis returned',
      details: ['Domain identified from message body']
    };
  }

  /**
   * Normalizes a URL, unwrapping Google redirects without network calls.
   */
  public static normalizeUrl(rawHref: string): string | null {
    let urlStr = rawHref.trim();
    if (
      !urlStr ||
      urlStr.startsWith('javascript:') ||
      urlStr.startsWith('data:') ||
      urlStr.startsWith('blob:') ||
      urlStr.startsWith('#') ||
      urlStr.startsWith('tel:') ||
      urlStr.startsWith('mailto:')
    ) {
      return null;
    }

    // Unwrap Google redirection wrapper (https://www.google.com/url?q=...)
    if (urlStr.includes('google.com/url?') || urlStr.includes('google.com/url/')) {
      try {
        const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://mail.google.com';
        const parsed = new URL(urlStr, base);
        const targetQ = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (targetQ) {
          urlStr = decodeURIComponent(targetQ);
        }
      } catch {
        // Fall back to original url string
      }
    }

    return urlStr;
  }

  /**
   * Extracts clean hostname from URL string.
   */
  public static extractDomain(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.toLowerCase();
    } catch {
      // If incomplete or relative, extract host via regex
      const match = urlStr.match(/^(?:https?:\/\/)?([^/:]+)/i);
      return match ? match[1].toLowerCase() : urlStr;
    }
  }

  /**
   * Checks whether the domain is an internal Google/Gmail service.
   */
  public static isInternalGoogleDomain(domain: string): boolean {
    const cleanDomain = domain.toLowerCase();
    return INTERNAL_GOOGLE_DOMAINS.some(
      (d) => cleanDomain === d || cleanDomain.endsWith(`.${d}`)
    );
  }

  /**
   * Searches the existing analysis result for any threat indicators matching this URL or domain.
   */
  private static findMatchingAnalysisEvidence(
    normalizedUrl: string,
    domain: string,
    analysis: IncidentAnalysis | null
  ): { threatLevel: 'high' | 'medium' | 'low'; summary: string; details: string[] } | null {
    if (!analysis) return null;

    const details: string[] = [];
    let isHighThreat = false;
    let isMediumThreat = false;

    // 1. Check indicators in analysis
    if (Array.isArray(analysis.indicators)) {
      for (const ind of analysis.indicators) {
        const text = typeof ind === 'string'
          ? ind
          : (ind && typeof ind === 'object' ? `${ind.title || ''} ${ind.evidence || ''} ${ind.description || ''} ${ind.indicator_code || ''}`.trim() : '');
        const textLower = text.toLowerCase();
        if (textLower && (textLower.includes(domain) || textLower.includes(normalizedUrl.toLowerCase()) || textLower.includes('url') || textLower.includes('link') || textLower.includes('domain'))) {
          const displayFinding = (typeof ind === 'object' && ind !== null && ind.title) ? ind.title : text;
          if (displayFinding && !details.includes(displayFinding)) {
            details.push(displayFinding);
          }
          if (textLower.includes('suspicious') || textLower.includes('phish') || textLower.includes('typosquat') || textLower.includes('mismatch')) {
            isHighThreat = true;
          } else {
            isMediumThreat = true;
          }
        }
      }
    }

    // 2. Check XAI forensic evidence
    if (analysis.xai && Array.isArray(analysis.xai.forensic_evidence)) {
      for (const ev of analysis.xai.forensic_evidence) {
        const evTitle = ev.title || ev.evidence || ev.description || '';
        const descLower = `${evTitle} ${ev.description || ''} ${ev.category || ''} ${ev.source || ''}`.toLowerCase();
        if (descLower.includes(domain) || descLower.includes(normalizedUrl.toLowerCase()) || ev.category === 'url' || ev.source === 'url_analyzer' || ev.source === 'brand_analyzer' || ev.source === 'domain_analyzer') {
          if (evTitle && !details.includes(evTitle)) {
            details.push(evTitle);
          }
          if (ev.severity === 'high' || ev.severity === 'critical') {
            isHighThreat = true;
          } else if (ev.severity === 'medium') {
            isMediumThreat = true;
          }
        }
      }
    }

    // 3. Check threat intelligence evidence
    if (analysis.xai && Array.isArray(analysis.xai.threat_intelligence_evidence)) {
      for (const ti of analysis.xai.threat_intelligence_evidence) {
        if (ti.ioc_value && (normalizedUrl.includes(ti.ioc_value) || ti.ioc_value.includes(domain))) {
          details.push(`Threat Intel (${ti.source}): ${ti.finding}`);
          if (ti.reputation === 'malicious' || ti.reputation === 'suspicious') {
            isHighThreat = true;
          }
        }
      }
    }

    // If the overall email was classified as critical phishing or suspicious and this URL was in extracted URLs
    const wasInAnalyzedUrls = Boolean(
      analysis.xai?.forensic_evidence?.some((e) => e.analyzer === 'url_analyzer') ||
      details.length > 0
    );

    if (details.length > 0) {
      const threatLevel = isHighThreat ? 'high' : isMediumThreat ? 'medium' : 'low';
      const summary = isHighThreat
        ? 'Suspicious destination flagged in email investigation'
        : isMediumThreat
        ? 'Potential risk indicators associated with link'
        : 'Link analyzed with email';
      return { threatLevel, summary, details: Array.from(new Set(details)) };
    }

    if (wasInAnalyzedUrls && analysis.verdict.toLowerCase().includes('phishing')) {
      return {
        threatLevel: 'high',
        summary: 'Link belongs to email classified as Phishing',
        details: [`Email verdict: ${analysis.verdict.replace(/_/g, ' ')}`]
      };
    }

    return null;
  }
}
