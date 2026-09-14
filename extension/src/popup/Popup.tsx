import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Inbox,
  Play,
  ArrowRight
} from 'lucide-react';
import type { IncidentAnalysis, BackendHealthStatus, EmailAnalysisRequest } from '../types';
import type { HealthCheckResponse, AnalyzeEmailResponse, ContentStateResponse } from '../shared/messages';
import { SOC_BASE_URL } from '../config';

export type PopupState =
  | 'LOADING'
  | 'NO_GMAIL'
  | 'NO_EMAIL'
  | 'GMAIL_READY'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'ERROR';

export const Popup: React.FC = () => {
  const [popupState, setPopupState] = useState<PopupState>('LOADING');
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);
  const [activeEmail, setActiveEmail] = useState<EmailAnalysisRequest | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IncidentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { type: 'HEALTH_CHECK' },
          (response: HealthCheckResponse) => {
            if (chrome.runtime.lastError) {
              setIsConnected(false);
              setCheckingHealth(false);
              return;
            }
            if (response && response.success) {
              setBackendStatus(response.data);
              setIsConnected(true);
            } else {
              setIsConnected(false);
            }
            setCheckingHealth(false);
          }
        );
      } else {
        // Fallback for browser preview / testing
        setIsConnected(true);
        setBackendStatus({ status: 'ok', service: 'PhishX Platform' });
        setCheckingHealth(false);
      }
    } catch {
      setIsConnected(false);
      setCheckingHealth(false);
    }
  }, []);

  const detectActiveContext = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      // Dev / Test fallback environment
      setPopupState('GMAIL_READY');
      setActiveEmail({
        sender: 'security@paypal-security-alert.com',
        subject: 'URGENT: Verify Your Account Credentials',
        body: 'Your account access has been restricted. Verify at http://paypal-update.phishing.com immediately.',
        urls: ['http://paypal-update.phishing.com']
      });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        setPopupState('NO_GMAIL');
        return;
      }

      const activeTab = tabs[0];
      const tabUrl = activeTab.url || '';

      // Verify active tab is Gmail
      if (!tabUrl.startsWith('https://mail.google.com/')) {
        setPopupState('NO_GMAIL');
        return;
      }

      // Tab is Gmail -> query content script for open email and analysis
      if (activeTab.id) {
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: 'GET_CONTENT_STATE' },
          (response: ContentStateResponse) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              // Content script might still be injecting or idle; check service worker memory
              chrome.runtime.sendMessage({ type: 'GET_ACTIVE_EMAIL' }, (swRes: any) => {
                if (!chrome.runtime.lastError && swRes?.success && swRes.data) {
                  setActiveEmail(swRes.data);
                  setPopupState('GMAIL_READY');
                } else {
                  setPopupState('NO_EMAIL');
                }
              });
              return;
            }

            const stateData = response.data;
            if (stateData && stateData.isEmailOpen && stateData.emailData) {
              setActiveEmail(stateData.emailData);
              if (stateData.currentAnalysis) {
                setAnalysisResult(stateData.currentAnalysis);
                setPopupState('ANALYZED');
              } else {
                setPopupState('GMAIL_READY');
              }
            } else {
              setActiveEmail(null);
              setPopupState('NO_EMAIL');
            }
          }
        );
      } else {
        setPopupState('NO_EMAIL');
      }
    });
  }, []);

  useEffect(() => {
    console.log('[PhishX Extension] PhishX popup initialized.');
    checkHealth();
    detectActiveContext();

    // Fallback safety timer: ensure popup never stays in LOADING forever
    const safetyTimer = setTimeout(() => {
      setPopupState((current) => (current === 'LOADING' ? 'NO_GMAIL' : current));
    }, 1200);

    return () => clearTimeout(safetyTimer);
  }, [checkHealth, detectActiveContext]);

  const handleAnalyzeEmail = (emailToAnalyze?: EmailAnalysisRequest) => {
    const targetEmail = emailToAnalyze || activeEmail;
    if (!targetEmail) {
      setPopupState('NO_EMAIL');
      return;
    }

    setPopupState('ANALYZING');
    setError(null);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE_EMAIL', payload: targetEmail },
        (response: AnalyzeEmailResponse) => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message || 'Background service worker communication error.');
            setPopupState('ERROR');
            return;
          }

          if (response && response.success && response.data) {
            setAnalysisResult(response.data);
            setPopupState('ANALYZED');
          } else {
            setError(response?.error || 'Analysis service temporarily unavailable.');
            setPopupState('ERROR');
          }
        }
      );
    } else {
      // Preview fallback simulation
      setTimeout(() => {
        setAnalysisResult({
          incident_id: 'b492c0ff-6263-4e10-95c2-41c8118fd244',
          verdict: 'critical_phishing',
          risk_score: 89.9,
          ml_probability: 0.9975,
          attack_type: 'credential_harvesting',
          summary: 'Critical phishing attack targeting credentials.',
          explanation: 'XAI signals verified.',
          indicators: [
            { type: 'sender', severity: 'critical', finding: 'Sender domain mismatch', description: 'Sender spoofing detected' },
            { type: 'url', severity: 'high', finding: 'Lookalike PayPal domain', description: 'Typosquatting domain detected' }
          ],
          xai: {
            model_features: {
              decision_score: 5.9061,
              intercept: 0.1320,
              total_feature_contribution: 5.7741,
              is_mathematically_valid: true,
              top_phishing_features: [
                { feature: 'verify', weight: 1.9689, tfidf: 0.3925, contribution: 0.7729, direction: 'phishing' },
                { feature: 'account', weight: 2.5460, tfidf: 0.3137, contribution: 0.7987, direction: 'phishing' }
              ],
              top_legitimate_features: []
            },
            forensic_evidence: [],
            threat_intelligence_evidence: [],
            summary: 'Phishing features identified.',
            confidence_notes: []
          }
        });
        setPopupState('ANALYZED');
      }, 600);
    }
  };

  const handleRunSandboxTest = (isPhishing: boolean) => {
    const sandboxPayload: EmailAnalysisRequest = isPhishing
      ? {
          sender: 'security@paypa1-login.com',
          subject: 'URGENT: Your PayPal Account Has Been Suspended',
          body: 'Verify your credentials immediately at http://paypa1-login.com/verify to prevent termination.',
          urls: ['http://paypa1-login.com/verify']
        }
      : {
          sender: 'alex.chen@enterprise.corp',
          subject: 'Q3 Security Operations Review Notes',
          body: 'Hi team, please find the attached notes from our quarterly SOC review meeting. Thanks!',
          urls: []
        };

    setActiveEmail(sandboxPayload);
    handleAnalyzeEmail(sandboxPayload);
  };

  const openSOCConsole = () => {
    const url = analysisResult?.incident_id
      ? `${SOC_BASE_URL}/incident/${analysisResult.incident_id}`
      : SOC_BASE_URL;

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const openGmail = () => {
    const url = 'https://mail.google.com';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const getIndicatorText = (indicator: any): string => {
    if (!indicator) return '';
    if (typeof indicator === 'string') return indicator;
    return indicator.finding || indicator.description || indicator.evidence || indicator.value || indicator.type || '';
  };

  return (
    <div className="p-4 space-y-3 bg-slate-950 text-slate-100 min-h-[520px] flex flex-col justify-between font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <div className="space-y-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-red-950 border border-red-800 text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold font-mono text-white tracking-wide">
                PHISHX &bull; EXTENSION
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                AI Phishing Defense & XAI
              </p>
            </div>
          </div>

          {/* Backend Status Indicator */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                checkHealth();
                detectActiveContext();
              }}
              disabled={checkingHealth}
              title="Refresh connection and tab state"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
            </button>
            <div
              title={backendStatus?.service ? `${backendStatus.service} (${backendStatus.status})` : (isConnected ? 'Backend connected' : 'Backend offline')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dynamic State View */}
      <div className="flex-1 space-y-3">
        {/* State: LOADING */}
        {popupState === 'LOADING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3 flex flex-col items-center justify-center min-h-[220px]">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-white">Inspecting Active Tab...</div>
              <div className="text-[10px] text-slate-400">Connecting to Gmail coordinator & PhishX API</div>
            </div>
          </div>
        )}

        {/* State: NO_GMAIL */}
        {popupState === 'NO_GMAIL' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-white">Open Gmail to Analyze</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  PhishX provides real-time ML forensics specifically for Gmail. Switch to an active Gmail tab to analyze emails.
                </div>
              </div>
            </div>

            <button
              onClick={openGmail}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow"
            >
              <span>Open Gmail (mail.google.com)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* State: NO_EMAIL */}
        {popupState === 'NO_EMAIL' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gmail Active</span>
              </span>
              <span className="text-[10px] text-slate-500">Standby</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-center space-y-1.5">
              <Inbox className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-xs font-mono font-bold text-slate-300">No Email Currently Open</div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Click any email in your Gmail inbox. PhishX will automatically detect and dissect it.
              </p>
            </div>

            <button
              onClick={detectActiveContext}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold transition-colors flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Scan Active Tab Again</span>
            </button>
          </div>
        )}

        {/* State: GMAIL_READY */}
        {popupState === 'GMAIL_READY' && activeEmail && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Email Detected</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                READY FOR ANALYSIS
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1.5">
              <div className="text-white font-bold truncate">
                {activeEmail.subject || '(No Subject)'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                From: {activeEmail.sender || 'Unknown Sender'}
              </div>
              {activeEmail.urls && activeEmail.urls.length > 0 && (
                <div className="text-[10px] text-indigo-300">
                  🔗 {activeEmail.urls.length} link{activeEmail.urls.length === 1 ? '' : 's'} extracted
                </div>
              )}
            </div>

            <button
              onClick={() => handleAnalyzeEmail()}
              disabled={!isConnected}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20"
            >
              <span>⚡ Analyze Detected Email</span>
            </button>
          </div>
        )}

        {/* State: ANALYZING */}
        {popupState === 'ANALYZING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3 flex flex-col items-center justify-center min-h-[220px]">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-white">Running PhishX AI Analysis...</div>
              <div className="text-[10px] text-slate-400">Executing ML inference, Exact XAI attribution & Threat Intel</div>
            </div>
          </div>
        )}

        {/* State: ANALYZED */}
        {popupState === 'ANALYZED' && analysisResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
            {/* Verdict Row & Incident Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                analysisResult.verdict.includes('critical')
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : analysisResult.verdict.includes('phishing')
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : analysisResult.verdict.includes('suspicious')
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {analysisResult.verdict.replace(/_/g, ' ')}
              </span>

              {analysisResult.incident_id && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  INC-{analysisResult.incident_id.replace(/^INC-/i, '').slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {/* Risk & ML Probability Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <div className="text-[9px] text-slate-400 uppercase">Risk Score</div>
                <div className="text-sm font-bold text-white">
                  {Math.round(analysisResult.risk_score)} <span className="text-[10px] text-slate-500">/ 100</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <div className="text-[9px] text-slate-400 uppercase">ML Probability</div>
                <div className="text-sm font-bold text-white">
                  {(analysisResult.ml_probability * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* XAI Attribution Features */}
            {analysisResult.xai?.model_features && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5 text-[10px] font-mono">
                <div className="text-indigo-400 font-bold flex items-center justify-between">
                  <span>Top XAI Signal Contributions</span>
                  <span className="text-[9px] text-slate-500">
                    Logit: {analysisResult.xai.model_features.decision_score > 0 ? `+${analysisResult.xai.model_features.decision_score.toFixed(2)}` : analysisResult.xai.model_features.decision_score.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1">
                  {analysisResult.xai.model_features.top_phishing_features.slice(0, 2).map((f, i) => (
                    <div key={i} className="flex justify-between text-rose-300">
                      <span className="truncate max-w-[200px]">[+] "{f.feature}"</span>
                      <span className="font-bold shrink-0">+{f.contribution.toFixed(2)}</span>
                    </div>
                  ))}
                  {analysisResult.xai.model_features.top_legitimate_features.slice(0, 2).map((f, i) => (
                    <div key={i} className="flex justify-between text-emerald-300">
                      <span className="truncate max-w-[200px]">[-] "{f.feature}"</span>
                      <span className="font-bold shrink-0">{f.contribution.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Indicators */}
            {analysisResult.indicators && analysisResult.indicators.length > 0 && (
              <div className="space-y-1 text-[10px] font-mono text-slate-300">
                {analysisResult.indicators.slice(0, 2).map((ind, i) => {
                  const text = getIndicatorText(ind);
                  return text ? (
                    <div key={i} className="text-amber-300/90 truncate">
                      ⚠ {text}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* State: ERROR */}
        {popupState === 'ERROR' && (
          <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-4 space-y-3">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-rose-300">Analysis Error</div>
                <div className="text-[10px] font-mono text-slate-300 leading-relaxed">
                  {error || 'Unable to complete forensic analysis. Check backend connectivity.'}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleAnalyzeEmail()}
              className="w-full py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-mono text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Investigation</span>
            </button>
          </div>
        )}

        {/* Sandbox Quick Testing Drawer */}
        <div className="pt-1">
          <button
            onClick={() => setShowSandbox(!showSandbox)}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center space-x-1"
          >
            <Play className="w-2.5 h-2.5" />
            <span>{showSandbox ? 'Hide Test Sandbox' : 'Sandbox Verification Tools'}</span>
          </button>

          {showSandbox && (
            <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRunSandboxTest(true)}
                  disabled={popupState === 'ANALYZING' || !isConnected}
                  className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[10px] font-mono font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Test Phishing</span>
                </button>

                <button
                  onClick={() => handleRunSandboxTest(false)}
                  disabled={popupState === 'ANALYZING' || !isConnected}
                  className="px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-[10px] font-mono font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Test Benign</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer & SOC Console Deep Link */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={openSOCConsole}
          className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>VIEW IN SOC INVESTIGATION CONSOLE</span>
        </button>
      </div>
    </div>
  );
};
