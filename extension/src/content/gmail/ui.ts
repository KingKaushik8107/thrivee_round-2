/**
 * PhishX Browser Extension — Advanced Gmail Security UI (Phase 7)
 * 
 * In-page cybersecurity card and link-inspection UI for Gmail.
 * STRICT PRINCIPLES:
 * 1. Preserves backend verdict (analysis.verdict) without overriding it.
 * 2. Explicitly separates Risk Score (0–100) from ML Probability (%).
 * 3. Shows XAI feature contributions as raw numerical logits (+0.81), never percentages.
 * 4. Displays forensic security evidence summary only when provided by backend.
 * 5. Safe link-hover inspection using only already-analyzed results (0 network calls).
 * 6. High-contrast, accessible UI compatible with both Gmail light & dark modes.
 * 7. Zero innerHTML usage with untrusted data; safe DOM construction only.
 */

import type { IncidentAnalysis } from '../../types';
import type { LinkInspectionResult } from './link-inspector';
import { SOC_BASE_URL } from '../../config';

export type GmailUIState =
  | 'IDLE'
  | 'DETECTING'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'ERROR';

export class GmailUI {
  private static containerId = 'phishx-gmail-banner-root';
  private static linkTooltipId = 'phishx-gmail-link-tooltip';
  private static isCollapsed = false;

  /**
   * Renders or updates the main in-page PhishX security card.
   */
  public static render(
    state: GmailUIState,
    analysis?: IncidentAnalysis | null,
    errorMessage?: string,
    onAnalyzeClick?: () => void,
    onRetryClick?: () => void
  ) {
    let container = document.getElementById(this.containerId);

    if (state === 'IDLE') {
      if (container) {
        container.remove();
      }
      this.hideLinkInspection();
      return;
    }

    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      this.applyContainerStyles(container);
      document.body.appendChild(container);
    }

    // Clear existing contents safely
    container.replaceChildren();

    const card = document.createElement('div');
    this.applyCardStyles(card, state, analysis);

    // 1. Header Bar with Logo and Minimize Button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';
    header.style.paddingBottom = this.isCollapsed ? '0px' : '8px';
    header.style.borderBottom = this.isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.12)';

    const brand = document.createElement('div');
    brand.style.display = 'flex';
    brand.style.alignItems = 'center';
    brand.style.gap = '6px';

    const icon = document.createElement('span');
    icon.textContent = '🛡️';
    icon.style.fontSize = '14px';
    icon.setAttribute('aria-hidden', 'true');

    const brandTitle = document.createElement('span');
    brandTitle.textContent = 'PHISHX';
    brandTitle.style.fontWeight = '800';
    brandTitle.style.fontSize = '11px';
    brandTitle.style.letterSpacing = '0.6px';
    brandTitle.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    brandTitle.style.color = '#f8fafc';

    brand.appendChild(icon);
    brand.appendChild(brandTitle);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '6px';

    // If collapsed, display compact risk summary pill in header
    if (this.isCollapsed && analysis) {
      const riskTier = this.getRiskTier(analysis);
      const miniPill = document.createElement('span');
      miniPill.textContent = `${riskTier.icon} ${Math.round(analysis.risk_score)}/100`;
      miniPill.style.fontSize = '10px';
      miniPill.style.fontWeight = 'bold';
      miniPill.style.color = riskTier.textColor;
      miniPill.style.fontFamily = 'ui-monospace, monospace';
      miniPill.style.padding = '1px 5px';
      miniPill.style.borderRadius = '4px';
      miniPill.style.background = riskTier.bgBadge;
      miniPill.setAttribute('aria-label', `Risk score ${Math.round(analysis.risk_score)} out of 100`);
      header.appendChild(miniPill);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = this.isCollapsed ? 'Expand' : 'Minimize';
    toggleBtn.setAttribute('aria-label', this.isCollapsed ? 'Expand PhishX Security Card' : 'Minimize PhishX Security Card');
    toggleBtn.setAttribute('tabindex', '0');
    toggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    toggleBtn.style.color = '#cbd5e1';
    toggleBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    toggleBtn.style.borderRadius = '4px';
    toggleBtn.style.padding = '2px 8px';
    toggleBtn.style.fontSize = '10px';
    toggleBtn.style.fontWeight = '600';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontFamily = 'inherit';
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      this.isCollapsed = !this.isCollapsed;
      this.render(state, analysis, errorMessage, onAnalyzeClick, onRetryClick);
    };

    controls.appendChild(toggleBtn);
    header.appendChild(brand);
    header.appendChild(controls);
    card.appendChild(header);

    // If collapsed, stop here
    if (this.isCollapsed) {
      container.appendChild(card);
      return;
    }

    // 2. Body based on State
    const bodyContent = document.createElement('div');
    bodyContent.style.paddingTop = '8px';
    bodyContent.style.fontSize = '11px';
    bodyContent.style.lineHeight = '1.4';
    bodyContent.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    if (state === 'DETECTING') {
      const p = document.createElement('div');
      p.textContent = 'Email detected. Ready for investigation.';
      p.style.color = '#cbd5e1';
      p.style.marginBottom = '8px';
      bodyContent.appendChild(p);

      if (onAnalyzeClick) {
        const analyzeBtn = document.createElement('button');
        analyzeBtn.textContent = '⚡ Analyze with PhishX';
        analyzeBtn.setAttribute('aria-label', 'Analyze email with PhishX');
        this.applyButtonStyles(analyzeBtn, '#4f46e5', '#6366f1');
        analyzeBtn.onclick = onAnalyzeClick;
        bodyContent.appendChild(analyzeBtn);
      }
    } else if (state === 'ANALYZING') {
      const p = document.createElement('div');
      p.textContent = '⚡ Analyzing email with AI, forensics & local XAI...';
      p.style.color = '#a5b4fc';
      p.style.fontWeight = '600';
      p.style.marginBottom = '4px';
      bodyContent.appendChild(p);

      const sub = document.createElement('div');
      sub.textContent = 'Checking phishing indicators & calculating feature attributions';
      sub.style.fontSize = '10px';
      sub.style.color = '#94a3b8';
      bodyContent.appendChild(sub);
    } else if (state === 'ERROR') {
      const p = document.createElement('div');
      p.textContent = `⚠ ${errorMessage || 'Analysis unavailable.'}`;
      p.style.color = '#fca5a5';
      p.style.fontWeight = '600';
      p.style.marginBottom = '8px';
      bodyContent.appendChild(p);

      const retryHandler = onRetryClick || onAnalyzeClick;
      if (retryHandler) {
        const retryBtn = document.createElement('button');
        retryBtn.textContent = '↻ Retry Analysis';
        retryBtn.setAttribute('aria-label', 'Retry PhishX email analysis');
        this.applyButtonStyles(retryBtn, '#334155', '#475569');
        retryBtn.onclick = retryHandler;
        bodyContent.appendChild(retryBtn);
      }
    } else if (state === 'ANALYZED' && analysis) {
      const riskTier = this.getRiskTier(analysis);
      // Preserved backend verdict
      const backendVerdict = (analysis.verdict || 'unknown').replace(/_/g, ' ').toUpperCase();

      // Top Verdict Row
      const verdictRow = document.createElement('div');
      verdictRow.style.display = 'flex';
      verdictRow.style.alignItems = 'center';
      verdictRow.style.justifyContent = 'space-between';
      verdictRow.style.marginBottom = '8px';

      const verdictBadge = document.createElement('span');
      verdictBadge.textContent = `${riskTier.icon} ${backendVerdict}`;
      verdictBadge.style.padding = '3px 7px';
      verdictBadge.style.borderRadius = '5px';
      verdictBadge.style.fontSize = '10px';
      verdictBadge.style.fontWeight = 'bold';
      verdictBadge.style.fontFamily = 'ui-monospace, monospace';
      verdictBadge.style.background = riskTier.bgBadge;
      verdictBadge.style.color = riskTier.textColor;
      verdictBadge.style.border = `1px solid ${riskTier.borderBadge}`;

      verdictRow.appendChild(verdictBadge);

      if (analysis.incident_id) {
        const idBadge = document.createElement('span');
        const shortId = analysis.incident_id.length > 8 ? `INC-${analysis.incident_id.slice(0, 8).toUpperCase()}` : analysis.incident_id;
        idBadge.textContent = shortId;
        idBadge.style.fontSize = '9px';
        idBadge.style.fontFamily = 'ui-monospace, monospace';
        idBadge.style.color = '#94a3b8';
        idBadge.style.background = 'rgba(255,255,255,0.06)';
        idBadge.style.padding = '2px 5px';
        idBadge.style.borderRadius = '4px';
        idBadge.setAttribute('title', `Incident ID: ${analysis.incident_id}`);
        verdictRow.appendChild(idBadge);
      }

      bodyContent.appendChild(verdictRow);

      // Distinct Risk Score vs ML Probability Box
      const metricsBox = document.createElement('div');
      metricsBox.style.display = 'grid';
      metricsBox.style.gridTemplateColumns = '1fr 1fr';
      metricsBox.style.gap = '6px';
      metricsBox.style.background = 'rgba(0, 0, 0, 0.35)';
      metricsBox.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      metricsBox.style.borderRadius = '6px';
      metricsBox.style.padding = '6px 8px';
      metricsBox.style.marginBottom = '8px';

      // Column 1: Risk Score (0-100)
      const riskCol = document.createElement('div');
      const riskLabel = document.createElement('div');
      riskLabel.textContent = 'Risk Score:';
      riskLabel.style.fontSize = '9px';
      riskLabel.style.color = '#94a3b8';
      riskLabel.style.fontFamily = 'ui-monospace, monospace';

      const riskVal = document.createElement('div');
      riskVal.textContent = `${Math.round(analysis.risk_score)} / 100`;
      riskVal.style.fontSize = '12px';
      riskVal.style.fontWeight = 'bold';
      riskVal.style.color = riskTier.textColor;
      riskVal.style.fontFamily = 'ui-monospace, monospace';

      riskCol.appendChild(riskLabel);
      riskCol.appendChild(riskVal);

      // Column 2: ML Probability (%)
      const mlCol = document.createElement('div');
      const mlLabel = document.createElement('div');
      mlLabel.textContent = 'ML Probability:';
      mlLabel.style.fontSize = '9px';
      mlLabel.style.color = '#94a3b8';
      mlLabel.style.fontFamily = 'ui-monospace, monospace';

      const mlVal = document.createElement('div');
      const mlPct = (analysis.ml_probability * 100).toFixed(1);
      mlVal.textContent = `${mlPct}% phishing`;
      mlVal.style.fontSize = '12px';
      mlVal.style.fontWeight = 'bold';
      mlVal.style.color = '#e2e8f0';
      mlVal.style.fontFamily = 'ui-monospace, monospace';

      mlCol.appendChild(mlLabel);
      mlCol.appendChild(mlVal);

      metricsBox.appendChild(riskCol);
      metricsBox.appendChild(mlCol);
      bodyContent.appendChild(metricsBox);

      // Actionable Warning or Clean Notice
      const noticeBox = document.createElement('div');
      noticeBox.style.fontSize = '10px';
      noticeBox.style.lineHeight = '1.35';
      noticeBox.style.marginBottom = '8px';
      noticeBox.style.padding = '5px 7px';
      noticeBox.style.borderRadius = '5px';

      if (riskTier.tier === 'critical') {
        noticeBox.style.background = 'rgba(225, 29, 72, 0.15)';
        noticeBox.style.border = '1px solid rgba(225, 29, 72, 0.3)';
        noticeBox.style.color = '#fecdd3';
        noticeBox.textContent = '⚠ Strong phishing indicators detected. Avoid clicking links or entering credentials.';
      } else if (riskTier.tier === 'suspicious') {
        noticeBox.style.background = 'rgba(245, 158, 11, 0.15)';
        noticeBox.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        noticeBox.style.color = '#fde68a';
        noticeBox.textContent = '⚠ Some phishing indicators detected. Review sender and links carefully.';
      } else {
        noticeBox.style.background = 'rgba(16, 185, 129, 0.12)';
        noticeBox.style.border = '1px solid rgba(16, 185, 129, 0.25)';
        noticeBox.style.color = '#a7f3d0';
        noticeBox.textContent = '✓ No significant phishing indicators detected.';
      }
      bodyContent.appendChild(noticeBox);

      // XAI Feature Explanation Section
      const modelFeatures = analysis.xai?.model_features;
      const topPhish = modelFeatures?.top_phishing_features || [];
      const topLegit = modelFeatures?.top_legitimate_features || [];

      if (topPhish.length > 0 || topLegit.length > 0) {
        const xaiSection = document.createElement('div');
        xaiSection.style.background = 'rgba(0, 0, 0, 0.3)';
        xaiSection.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        xaiSection.style.borderRadius = '6px';
        xaiSection.style.padding = '6px 8px';
        xaiSection.style.marginBottom = '8px';

        const isPhishDominant = topPhish.length > 0 && (analysis.risk_score >= 30 || topPhish.length >= topLegit.length);
        const headingText = isPhishDominant
          ? 'Strong phishing-direction ML features:'
          : 'Strong legitimate-direction ML features:';

        const xaiHeading = document.createElement('div');
        xaiHeading.textContent = headingText;
        xaiHeading.style.fontSize = '9px';
        xaiHeading.style.fontWeight = 'bold';
        xaiHeading.style.color = isPhishDominant ? '#fca5a5' : '#86efac';
        xaiHeading.style.marginBottom = '4px';
        xaiHeading.style.fontFamily = 'ui-monospace, monospace';
        xaiSection.appendChild(xaiHeading);

        const featuresToDisplay = isPhishDominant ? topPhish.slice(0, 3) : topLegit.slice(0, 3);
        const featureList = document.createElement('div');
        featureList.style.display = 'flex';
        featureList.style.flexDirection = 'column';
        featureList.style.gap = '2px';

        featuresToDisplay.forEach((f) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.justifyContent = 'space-between';
          row.style.fontSize = '9.5px';
          row.style.fontFamily = 'ui-monospace, monospace';

          const wordSpan = document.createElement('span');
          wordSpan.textContent = `• ${f.feature}`;
          wordSpan.style.color = '#f1f5f9';

          const contribSpan = document.createElement('span');
          // Raw logit attribution formatted with sign, NEVER percentages
          const formattedContrib = f.contribution > 0 ? `+${f.contribution.toFixed(2)}` : f.contribution.toFixed(2);
          contribSpan.textContent = formattedContrib;
          contribSpan.style.fontWeight = 'bold';
          contribSpan.style.color = f.direction === 'phishing' ? '#fda4af' : '#86efac';

          row.appendChild(wordSpan);
          row.appendChild(contribSpan);
          featureList.appendChild(row);
        });

        xaiSection.appendChild(featureList);
        bodyContent.appendChild(xaiSection);
      }

      // Security Evidence Summary Section (rendered ONLY if backend returned evidence)
      const evidenceList: string[] = [];
      const seenEvidence = new Set<string>();

      const addEvidence = (raw: any) => {
        const formatted = GmailUI.formatSecurityIndicator(raw);
        if (formatted && formatted.length > 0 && !seenEvidence.has(formatted)) {
          seenEvidence.add(formatted);
          evidenceList.push(formatted);
        }
      };

      if (Array.isArray(analysis.indicators)) {
        analysis.indicators.forEach(addEvidence);
      }
      if (analysis.xai && Array.isArray(analysis.xai.forensic_evidence)) {
        analysis.xai.forensic_evidence.forEach(addEvidence);
      }

      if (evidenceList.length > 0) {
        const evidenceSection = document.createElement('div');
        evidenceSection.style.background = 'rgba(0, 0, 0, 0.3)';
        evidenceSection.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        evidenceSection.style.borderRadius = '6px';
        evidenceSection.style.padding = '6px 8px';
        evidenceSection.style.marginBottom = '8px';

        const evTitle = document.createElement('div');
        evTitle.textContent = 'Security indicators:';
        evTitle.style.fontSize = '9px';
        evTitle.style.fontWeight = 'bold';
        evTitle.style.color = '#94a3b8';
        evTitle.style.marginBottom = '4px';
        evTitle.style.fontFamily = 'ui-monospace, monospace';
        evidenceSection.appendChild(evTitle);

        const evContainer = document.createElement('div');
        evContainer.style.display = 'flex';
        evContainer.style.flexDirection = 'column';
        evContainer.style.gap = '2px';

        evidenceList.slice(0, 3).forEach((evText) => {
          const evRow = document.createElement('div');
          evRow.style.fontSize = '9.5px';
          evRow.style.color = '#cbd5e1';
          evRow.textContent = `⚠ ${evText}`;
          evContainer.appendChild(evRow);
        });

        evidenceSection.appendChild(evContainer);
        bodyContent.appendChild(evidenceSection);
      }

      // Deep link to SOC Investigation Console
      const consoleLink = document.createElement('button');
      consoleLink.textContent = 'View in SOC Console ↗';
      consoleLink.setAttribute('aria-label', 'Open full incident investigation in PhishX SOC console');
      this.applyButtonStyles(consoleLink, '#1e293b', '#334155');
      consoleLink.onclick = () => {
        const incidentUrl = analysis.incident_id
          ? `${SOC_BASE_URL}/incident/${analysis.incident_id}`
          : SOC_BASE_URL;
        window.open(incidentUrl, '_blank');
      };
      bodyContent.appendChild(consoleLink);
    }

    card.appendChild(bodyContent);
    container.appendChild(card);
  }

  /**
   * Renders the safe link hover inspection preview.
   * STRICT SAFETY: Displays only already-analyzed results. ZERO network requests.
   */
  public static renderLinkInspection(result: LinkInspectionResult, anchorRect: DOMRect | null) {
    let tooltip = document.getElementById(this.linkTooltipId);
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = this.linkTooltipId;
      tooltip.style.position = 'fixed';
      tooltip.style.zIndex = '1000000';
      tooltip.style.maxWidth = '280px';
      tooltip.style.background = '#020617';
      tooltip.style.color = '#f8fafc';
      tooltip.style.border = '1px solid rgba(99, 102, 241, 0.4)';
      tooltip.style.borderRadius = '8px';
      tooltip.style.padding = '8px 10px';
      tooltip.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.7)';
      tooltip.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tooltip.style.fontSize = '10.5px';
      tooltip.style.pointerEvents = 'none';
      document.body.appendChild(tooltip);
    }

    tooltip.replaceChildren();

    // Position tooltip near anchor safely within viewport
    if (anchorRect) {
      const top = Math.max(10, anchorRect.top - 70);
      const left = Math.min(window.innerWidth - 300, Math.max(10, anchorRect.left));
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.justifyContent = 'space-between';
    title.style.gap = '6px';
    title.style.marginBottom = '4px';

    const brand = document.createElement('span');
    brand.textContent = '🛡️ PHISHX LINK CHECK';
    brand.style.fontSize = '9px';
    brand.style.fontWeight = 'bold';
    brand.style.fontFamily = 'ui-monospace, monospace';
    brand.style.color = '#a5b4fc';

    const threatBadge = document.createElement('span');
    threatBadge.style.fontSize = '8.5px';
    threatBadge.style.fontWeight = 'bold';
    threatBadge.style.padding = '1px 4px';
    threatBadge.style.borderRadius = '3px';
    threatBadge.style.fontFamily = 'ui-monospace, monospace';

    if (result.threatLevel === 'high') {
      threatBadge.textContent = 'HIGH RISK';
      threatBadge.style.background = 'rgba(225, 29, 72, 0.25)';
      threatBadge.style.color = '#fca5a5';
      threatBadge.style.border = '1px solid rgba(225, 29, 72, 0.5)';
    } else if (result.threatLevel === 'medium') {
      threatBadge.textContent = 'SUSPICIOUS';
      threatBadge.style.background = 'rgba(245, 158, 11, 0.25)';
      threatBadge.style.color = '#fde68a';
      threatBadge.style.border = '1px solid rgba(245, 158, 11, 0.5)';
    } else if (result.threatLevel === 'low') {
      threatBadge.textContent = 'CHECKED';
      threatBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      threatBadge.style.color = '#86efac';
      threatBadge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    } else {
      threatBadge.textContent = 'UNANALYZED';
      threatBadge.style.background = 'rgba(148, 163, 184, 0.2)';
      threatBadge.style.color = '#cbd5e1';
      threatBadge.style.border = '1px solid rgba(148, 163, 184, 0.4)';
    }

    title.appendChild(brand);
    title.appendChild(threatBadge);
    tooltip.appendChild(title);

    // Domain display (sanitized textContent)
    const domainRow = document.createElement('div');
    domainRow.style.fontSize = '10px';
    domainRow.style.color = '#f8fafc';
    domainRow.style.fontWeight = 'bold';
    domainRow.style.fontFamily = 'ui-monospace, monospace';
    domainRow.style.marginBottom = '3px';
    domainRow.style.wordBreak = 'break-all';
    domainRow.textContent = result.domain;
    tooltip.appendChild(domainRow);

    // Summary Text
    const summary = document.createElement('div');
    summary.style.fontSize = '9.5px';
    summary.style.color = result.threatLevel === 'high' ? '#fca5a5' : result.threatLevel === 'medium' ? '#fde68a' : '#94a3b8';
    summary.textContent = result.evidenceSummary;
    tooltip.appendChild(summary);
  }

  /**
   * Hides the safe link hover inspection tooltip.
   */
  public static hideLinkInspection() {
    const tooltip = document.getElementById(this.linkTooltipId);
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Evaluates visual presentation risk tier without overriding backend verdict.
   */
  private static getRiskTier(analysis: IncidentAnalysis): {
    tier: 'critical' | 'suspicious' | 'legitimate';
    icon: string;
    textColor: string;
    bgBadge: string;
    borderBadge: string;
  } {
    const score = analysis.risk_score;
    const verdictLower = (analysis.verdict || '').toLowerCase();

    if (score >= 70 || verdictLower.includes('critical') || verdictLower === 'phishing') {
      return {
        tier: 'critical',
        icon: '🔴',
        textColor: '#fda4af',
        bgBadge: 'rgba(225, 29, 72, 0.2)',
        borderBadge: 'rgba(225, 29, 72, 0.5)'
      };
    }

    if (score >= 30 || verdictLower.includes('suspicious')) {
      return {
        tier: 'suspicious',
        icon: '🟠',
        textColor: '#fde68a',
        bgBadge: 'rgba(245, 158, 11, 0.2)',
        borderBadge: 'rgba(245, 158, 11, 0.5)'
      };
    }

    return {
      tier: 'legitimate',
      icon: '🟢',
      textColor: '#86efac',
      bgBadge: 'rgba(16, 185, 129, 0.2)',
      borderBadge: 'rgba(16, 185, 129, 0.4)'
    };
  }

  private static applyContainerStyles(el: HTMLElement) {
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.style.zIndex = '999999';
    el.style.maxWidth = '330px';
    el.style.width = 'calc(100vw - 40px)';
    el.style.boxSizing = 'border-box';
    el.style.pointerEvents = 'auto';
  }

  private static applyCardStyles(card: HTMLElement, state: GmailUIState, analysis?: IncidentAnalysis | null) {
    card.style.background = '#090d16'; // High-contrast solid dark container
    card.style.color = '#f8fafc';
    card.style.borderRadius = '10px';
    card.style.padding = '10px 12px';
    card.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
    card.style.transition = 'all 0.2s ease-in-out';
    card.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    if (state === 'ANALYZED' && analysis) {
      const riskTier = this.getRiskTier(analysis);
      if (riskTier.tier === 'critical') {
        card.style.border = '1px solid rgba(225, 29, 72, 0.6)';
        card.style.boxShadow = '0 0 16px rgba(225, 29, 72, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.7)';
      } else if (riskTier.tier === 'suspicious') {
        card.style.border = '1px solid rgba(245, 158, 11, 0.5)';
      } else {
        card.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      }
    } else {
      card.style.border = '1px solid rgba(255, 255, 255, 0.18)';
    }
  }

  private static applyButtonStyles(btn: HTMLButtonElement, bg: string, hoverBg: string) {
    btn.style.width = '100%';
    btn.style.background = bg;
    btn.style.color = '#ffffff';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    btn.style.borderRadius = '6px';
    btn.style.padding = '6px 10px';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.15s ease';
    btn.style.fontFamily = 'inherit';

    btn.onmouseenter = () => {
      btn.style.background = hoverBg;
    };
    btn.onmouseleave = () => {
      btn.style.background = bg;
    };
  }

  /**
   * Safely formats any security indicator (string, IndicatorDTO, forensic evidence, or nested object)
   * into clean, human-readable text.
   * STRICT GUARANTEE: Never returns "[object Object]", never throws, and never exposes raw JSON.
   */
  public static formatSecurityIndicator(indicator: any): string | null {
    if (indicator === null || indicator === undefined) {
      return null;
    }

    // 1. Direct string
    if (typeof indicator === 'string') {
      const trimmed = indicator.trim();
      if (!trimmed || trimmed === '[object Object]') return null;
      return trimmed;
    }

    // 2. Structured Object
    if (typeof indicator === 'object') {
      // Prioritize explicit human-readable fields returned by backend
      const candidates = [
        indicator.title,
        indicator.message,
        indicator.description,
        indicator.evidence,
        indicator.finding,
        indicator.reason,
        indicator.name,
        indicator.summary
      ];

      for (const candidate of candidates) {
        if (typeof candidate === 'string') {
          const trimmed = candidate.trim();
          if (trimmed.length > 0 && trimmed !== '[object Object]') {
            return trimmed;
          }
        }
      }

      // Check if evidence is a nested object
      if (typeof indicator.evidence === 'object' && indicator.evidence !== null) {
        const nested = this.formatSecurityIndicator(indicator.evidence);
        if (nested) return nested;
      }

      // Fallback to formatted category or source if present
      if (typeof indicator.category === 'string' && indicator.category.trim().length > 0) {
        const cat = indicator.category.trim().replace(/_/g, ' ');
        return `Suspicious ${cat} indicator`;
      }

      if (typeof indicator.source === 'string' && indicator.source.trim().length > 0) {
        const src = indicator.source.trim().replace(/_/g, ' ');
        return `Indicator flagged by ${src}`;
      }

      // Safe fallback (never [object Object] or raw JSON)
      return 'Security indicator detected';
    }

    return null;
  }
}
