import React, { useState, useEffect } from 'react';
import {
  Search,
  UploadCloud,
  RefreshCw,
  FileDown,
  Flame,
  AlertOctagon
} from 'lucide-react';
import type { IncidentAnalysis, DemoScenario } from '../types';
import { analyzeEmail, uploadEmlFile, getIncidentDetail } from '../services/api';
import { RiskGauge } from '../components/RiskGauge';
import { IndicatorBadge } from '../components/IndicatorBadge';
import { EvidenceHighlighter } from '../components/EvidenceHighlighter';
import { RiskBreakdownChart } from '../components/RiskBreakdownChart';
import { IOCExportPanel } from '../components/IOCExportPanel';
import { AttackGraph } from '../components/AttackGraph';
import { AIAnalystChat } from '../components/AIAnalystChat';
import { ActionPlaybook } from '../components/ActionPlaybook';
import { FeedbackControls } from '../components/FeedbackControls';
import { ReportModal } from '../components/ReportModal';
import { DemoSelector } from '../components/DemoSelector';
import { XAIAnalysisPanel } from '../components/analysis/XAIAnalysisPanel';
import { SOCIncidentHeader } from '../components/analysis/SOCIncidentHeader';
import { AnalystNotesPanel } from '../components/analysis/AnalystNotesPanel';
import { InvestigationTimeline } from '../components/analysis/InvestigationTimeline';



interface InvestigationPageProps {
  initialIncidentId?: string | null;
  onNavigateToCampaign?: (campaignId: string) => void;
}

export const InvestigationPage: React.FC<InvestigationPageProps> = ({
  initialIncidentId,
  onNavigateToCampaign
}) => {
  const [rawEmailInput, setRawEmailInput] = useState<string>(`From: security@paypa1-login.com
Subject: Your account will be suspended!

Your account has been flagged. Verify your account immediately.
URL: http://paypa1-login.com/verify`);

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  // Load initial incident if passed via props
  useEffect(() => {
    if (initialIncidentId) {
      const loadDetail = async () => {
        setLoading(true);
        try {
          const res = await getIncidentDetail(initialIncidentId);
          setAnalysis(res);
          if (res.email?.body) {
            setRawEmailInput(
              `From: ${res.email.sender || ''}\nSubject: ${res.email.subject || ''}\n\n${res.email.body}`
            );
          }
        } catch (e) {
          console.error('Error loading incident:', e);
        } finally {
          setLoading(false);
        }
      };
      loadDetail();
    }
  }, [initialIncidentId]);

  const handleAnalyze = async () => {
    if (!rawEmailInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeEmail({ raw_content: rawEmailInput });
      setAnalysis(result);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Failed to analyze email. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const result = await uploadEmlFile(file);
      setAnalysis(result);
      if (result.email?.body) {
        setRawEmailInput(
          `From: ${result.email.sender || ''}\nSubject: ${result.email.subject || ''}\n\n${result.email.body}`
        );
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Error parsing uploaded .eml file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (scenario: DemoScenario) => {
    const formatted = `From: ${scenario.sender}
Subject: ${scenario.subject}

${scenario.body}${scenario.urls && scenario.urls.length > 0 ? `\nURL: ${scenario.urls[0]}` : ''}`;
    setRawEmailInput(formatted);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Quick Demo Selector */}
      <DemoSelector onSelectScenario={handleSelectDemo} />

      {/* 2. Email Ingestion Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white font-mono flex items-center space-x-2">
              <Search className="w-5 h-5 text-red-500" />
              <span>EMAIL INGESTION & FORENSIC DISSECTION</span>
            </h2>
            <p className="text-xs text-slate-400">
              Paste email headers/text or upload raw <code className="text-slate-300">.eml</code> files. Attachments and links will NOT be executed.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold cursor-pointer transition-colors">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>UPLOAD .EML FILE</span>
              <input
                type="file"
                accept=".eml,.msg,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            rows={5}
            value={rawEmailInput}
            onChange={(e) => setRawEmailInput(e.target.value)}
            placeholder="Paste raw email text, headers, and body here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-y leading-relaxed"
          />
        </div>

        {/* Action Button & Error */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {error ? (
            <div className="text-xs font-mono text-red-400 flex items-center space-x-1.5">
              <AlertOctagon className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">
              Ready for static parsing, RapidFuzz brand matching, and TF-IDF inference.
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !rawEmailInput.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>DISSECTING EMAIL FORENSICS...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>ANALYZE EMAIL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Analysis Results View */}
      {analysis && (
        <div className="space-y-6">
          {/* Phase 8: SOC Incident Header */}
          <SOCIncidentHeader
            analysis={analysis}
            onStatusUpdated={() => setTimelineRefreshTrigger((n) => n + 1)}
          />

          {/* Top Bar: Risk Gauge + Report Trigger */}
          <div className="flex flex-col gap-4">
            <RiskGauge
              score={analysis.risk_score}
              verdict={analysis.verdict}
              mlProbability={analysis.ml_probability}
              targetBrand={analysis.target_brand}
              brandSimilarity={analysis.brand_similarity}
              attackType={analysis.attack_type}
              attackConfidence={analysis.attack_type_confidence}
            />

            {/* Campaign Alert Banner (if incident is part of a campaign) */}
            {analysis.campaign_id && (
              <div className="bg-purple-950/40 border border-purple-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-900 rounded-lg text-purple-300">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-mono text-purple-300 uppercase">
                        CAMPAIGN CORRELATION DETECTED
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-900 text-purple-200 font-bold">
                        {analysis.campaign_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      This incident shares lookalike infrastructure and sender patterns with other analyzed emails.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToCampaign && onNavigateToCampaign(analysis.campaign_id!)}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors shrink-0"
                >
                  VIEW CAMPAIGN CLUSTER
                </button>
              </div>
            )}
          </div>

          {/* Dedicated Explainable AI (XAI) Investigation Suite */}
          <XAIAnalysisPanel analysis={analysis} />

          {/* Phase 8: SOC Case Management Row (Notes & Timeline) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalystNotesPanel
              incidentId={analysis.incident_id}
              initialNotes={analysis.notes || []}
              onNoteAdded={() => setTimelineRefreshTrigger((n) => n + 1)}
              onNoteDeleted={() => setTimelineRefreshTrigger((n) => n + 1)}
            />
            <InvestigationTimeline
              incidentId={analysis.incident_id}
              initialTimeline={analysis.timeline || []}
              refreshTrigger={timelineRefreshTrigger}
            />
          </div>

          {/* Main 2-Column Forensic View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Interactive Original Email & Highlights */}
            <EvidenceHighlighter
              email={analysis.email}
              indicators={analysis.indicators}
              targetBrand={analysis.target_brand}
              brandSimilarity={analysis.brand_similarity}
            />

            {/* Right Column: Fired Indicators List */}
            <div className="space-y-6">
              <IndicatorBadge indicators={analysis.indicators} />
              <RiskBreakdownChart
                breakdown={analysis.breakdown}
                totalScore={analysis.risk_score}
              />
            </div>
          </div>

          {/* IOC Extractor & Attack Graph Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IOCExportPanel
              incidentId={analysis.incident_id}
              iocs={analysis.iocs}
            />
            <AttackGraph incident={analysis} />
          </div>

          {/* AI Security Analyst Chat & SOC Playbook Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIAnalystChat incident={analysis} />
            <div className="space-y-6 flex flex-col justify-between">
              <ActionPlaybook recommendations={analysis.recommendations} />
              <FeedbackControls
                incidentId={analysis.incident_id}
                onFeedbackSubmitted={() => setTimelineRefreshTrigger((n) => n + 1)}
              />
            </div>
          </div>

          {/* Generate Report Bottom Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                GENERATE OFFICIAL INCIDENT REPORT
              </h3>
              <p className="text-xs text-slate-400">
                Export executive dossiers in PDF, self-contained HTML, or machine-readable JSON formats.
              </p>
            </div>

            <button
              onClick={() => setIsReportOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <FileDown className="w-4 h-4" />
              <span>GENERATE INCIDENT REPORT</span>
            </button>
          </div>
        </div>
      )}

      {/* Incident Report Modal */}
      {analysis && (
        <ReportModal
          incident={analysis}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};
