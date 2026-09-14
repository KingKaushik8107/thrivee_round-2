import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Play
} from 'lucide-react';
import type { IncidentAnalysis, BackendHealthStatus } from '../types';
import type { HealthCheckResponse, AnalyzeEmailResponse } from '../shared/messages';
import { SOC_BASE_URL } from '../config';

export const Popup: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);
  const [activeEmail, setActiveEmail] = useState<EmailAnalysisRequest | null>(null);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<IncidentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveEmail = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_EMAIL' }, (res: any) => {
        if (res && res.success && res.data) {
          setActiveEmail(res.data);
        }
      });
    }
  };

  const checkHealth = async () => {
    setCheckingHealth(true);
    setError(null);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { type: 'HEALTH_CHECK' },
          (response: HealthCheckResponse) => {
            if (response && response.success) {
              setBackendStatus(response.data);
              setIsConnected(true);
            } else {
              setIsConnected(false);
              setError(response?.error || 'Backend service unreachable.');
            }
            setCheckingHealth(false);
          }
        );
      } else {
        // Fallback in dev/browser preview
        setIsConnected(true);
        setBackendStatus({ status: 'ok', service: 'PhishX Platform' });
        setCheckingHealth(false);
      }
    } catch (err: any) {
      setIsConnected(false);
      setError(err.message || 'Error checking backend.');
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchActiveEmail();
  }, []);

  const handleRunTestAnalysis = (isPhishing: boolean) => {
    setAnalyzing(true);
    setError(null);

    const testPayload = isPhishing
      ? {
          sender: 'security@paypa1-login.com',
          subject: 'URGENT: Your account has been suspended!',
          body: 'Verify your account immediately at http://paypa1-login.com/verify-account',
          urls: ['http://paypa1-login.com/verify-account']
        }
      : {
          sender: 'vince.kaminski@enron.com',
          subject: 'Enron Power Market Research Meeting',
          body: 'Hi team, thanks for the market research notes. Attached is the presentation for tomorrow.',
          urls: []
        };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE_EMAIL', payload: testPayload },
        (response: AnalyzeEmailResponse) => {
          setAnalyzing(false);
          if (response && response.success) {
            setTestResult(response.data);
          } else {
            setError(response?.error || 'Analysis failed in background service worker.');
          }
        }
      );
    } else {
      // Dev fallback
      setTimeout(() => {
        setAnalyzing(false);
        setTestResult({
          incident_id: 'test-demo-123',
          verdict: isPhishing ? 'critical_phishing' : 'legitimate',
          risk_score: isPhishing ? 89.9 : 0.0,
          ml_probability: isPhishing ? 0.9973 : 0.0001,
          attack_type: isPhishing ? 'credential_harvesting' : 'none',
          summary: isPhishing
            ? 'Classified as CRITICAL PHISHING with verified feature attributions.'
            : 'Classified as LEGITIMATE.',
          explanation: 'XAI foundation analysis test.',
          indicators: [],
          xai: {
            model_features: {
              decision_score: isPhishing ? 5.9061 : -10.5586,
              intercept: 0.1320,
              total_feature_contribution: isPhishing ? 5.7741 : -10.6906,
              is_mathematically_valid: true,
              top_phishing_features: isPhishing ? [
                { feature: 'account', weight: 2.5460, tfidf: 0.3137, contribution: 0.7987, direction: 'phishing' },
                { feature: 'verify', weight: 1.9689, tfidf: 0.3925, contribution: 0.7729, direction: 'phishing' }
              ] : [],
              top_legitimate_features: !isPhishing ? [
                { feature: 'enron', weight: -12.4909, tfidf: 0.1714, contribution: -2.1404, direction: 'legitimate' },
                { feature: 'thanks', weight: -14.5568, tfidf: 0.0850, contribution: -1.2367, direction: 'legitimate' }
              ] : []
            },
            forensic_evidence: [],
            threat_intelligence_evidence: [],
            summary: isPhishing ? 'Phishing features identified.' : 'Legitimate features identified.',
            confidence_notes: ['Mathematical validation verified.']
          }
        });
      }, 500);
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: SOC_BASE_URL });
    } else {
      window.open(SOC_BASE_URL, '_blank');
    }
  };

  return (
    <div className="p-4 space-y-3.5 bg-slate-950 text-slate-100 min-h-[500px] flex flex-col justify-between font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <div className="space-y-2 pb-3 border-b border-slate-800">
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
              onClick={checkHealth}
              disabled={checkingHealth}
              title="Refresh connection status"
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

      {/* Main Mailbox Context Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Active Mailbox Context</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            {activeEmail ? 'GMAIL DETECTED' : 'STANDBY'}
          </span>
        </div>
        {activeEmail ? (
          <div className="space-y-2">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1">
              <div className="text-white font-bold truncate">
                {activeEmail.subject || '(No Subject)'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                From: {activeEmail.sender || 'Unknown Sender'}
              </div>
            </div>
            <button
              onClick={() => {
                setAnalyzing(true);
                setError(null);
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                  chrome.runtime.sendMessage(
                    { type: 'ANALYZE_EMAIL', payload: activeEmail },
                    (response: AnalyzeEmailResponse) => {
                      setAnalyzing(false);
                      if (response && response.success) {
                        setTestResult(response.data);
                      } else {
                        setError(response?.error || 'Analysis failed.');
                      }
                    }
                  );
                }
              }}
              disabled={analyzing || !isConnected}
              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow"
            >
              <span>{analyzing ? 'Analyzing Gmail Message...' : '⚡ Analyze Detected Email'}</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-400">
              No email currently open in Gmail tab
            </div>
            <p className="text-[10px] text-slate-400 leading-tight pt-1.5">
              Open an email in Gmail or use the sandbox test buttons below to run real-time XAI investigations.
            </p>
          </div>
        )}
      </div>

      {/* Service Worker Bridge Test Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="text-[11px] font-mono uppercase font-bold text-indigo-400 flex items-center space-x-1.5">
          <Play className="w-3.5 h-3.5" />
          <span>Foundation Test Sandbox</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleRunTestAnalysis(true)}
            disabled={analyzing || !isConnected}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[11px] font-mono font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
          >
            {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
            <span>Test Phishing</span>
          </button>

          <button
            onClick={() => handleRunTestAnalysis(false)}
            disabled={analyzing || !isConnected}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-[11px] font-mono font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
          >
            {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            <span>Test Benign</span>
          </button>
        </div>

        {error && (
          <div className="p-2 rounded bg-red-950/50 border border-red-900 text-red-300 text-[10px] font-mono flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Analysis Result Preview */}
        {testResult && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs font-mono animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                testResult.verdict.includes('phishing') ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {testResult.verdict.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-white font-bold">
                Risk: {Math.round(testResult.risk_score)}/100
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>ML Probability:</span>
              <span className="text-white font-bold">{Math.round(testResult.ml_probability * 10000) / 100}%</span>
            </div>

            {testResult.xai?.model_features && (
              <div className="space-y-1 pt-1 border-t border-slate-900">
                <div className="text-[10px] text-indigo-400 font-bold flex items-center justify-between">
                  <span>Decision Score (Logit):</span>
                  <span>{testResult.xai.model_features.decision_score > 0 ? `+${testResult.xai.model_features.decision_score.toFixed(4)}` : testResult.xai.model_features.decision_score.toFixed(4)}</span>
                </div>

                <div className="space-y-0.5 text-[10px]">
                  {testResult.xai.model_features.top_phishing_features.slice(0, 2).map((f, i) => (
                    <div key={i} className="flex justify-between text-rose-300">
                      <span>[+] "{f.feature}"</span>
                      <span>+{f.contribution.toFixed(4)}</span>
                    </div>
                  ))}
                  {testResult.xai.model_features.top_legitimate_features.slice(0, 2).map((f, i) => (
                    <div key={i} className="flex justify-between text-emerald-300">
                      <span>[-] "{f.feature}"</span>
                      <span>{f.contribution.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer & Dashboard Link */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={openDashboard}
          className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>OPEN SOC INVESTIGATION CONSOLE</span>
        </button>
      </div>
    </div>
  );
};
