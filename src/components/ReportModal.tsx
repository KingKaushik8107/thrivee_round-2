import React from 'react';
import { FileText, X, Eye, Code, FileDown } from 'lucide-react';
import type { IncidentAnalysis } from '../types';
import { getIncidentReportUrl } from '../services/api';

interface ReportModalProps {
  incident: IncidentAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ incident, isOpen, onClose }) => {
  if (!isOpen || !incident) return null;

  const pdfUrl = getIncidentReportUrl(incident.incident_id, 'pdf');
  const htmlUrl = getIncidentReportUrl(incident.incident_id, 'html');
  const jsonUrl = getIncidentReportUrl(incident.incident_id, 'json');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                SECURITY INCIDENT INVESTIGATION REPORT
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Incident ID: {incident.incident_id} &bull; Classification: {incident.verdict.toUpperCase()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Download Buttons Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300 font-mono">
            Export compliant cybersecurity incident dossier in your preferred format:
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono transition-colors shadow-md shadow-red-600/20"
            >
              <FileDown className="w-4 h-4" />
              <span>DOWNLOAD PDF</span>
            </a>

            <a
              href={htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-mono transition-colors"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>VIEW HTML</span>
            </a>

            <a
              href={jsonUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-mono transition-colors"
            >
              <Code className="w-4 h-4 text-amber-400" />
              <span>EXPORT JSON</span>
            </a>
          </div>
        </div>

        {/* Interactive Live Report Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6 text-slate-200 text-xs sm:text-sm">
          {/* Executive Overview Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 font-mono">Verdict & Risk</span>
              <span className="text-sm font-extrabold text-red-400 font-mono">{incident.risk_score} / 100 ({incident.verdict.toUpperCase()})</span>
            </div>
            <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800/80">
              {incident.summary}
            </p>
          </div>

          {/* Key Findings Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px]">TARGET BRAND</div>
              <div className="font-bold text-amber-300 mt-1">{incident.target_brand || 'None Detected'}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px]">ATTACK OBJECTIVE</div>
              <div className="font-bold text-white mt-1">{incident.attack_type.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px]">ML PROBABILITY</div>
              <div className="font-bold text-indigo-400 mt-1">{Math.round(incident.ml_probability * 100)}%</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px]">INDICATORS FIRED</div>
              <div className="font-bold text-red-400 mt-1">{incident.indicators.length} Signals</div>
            </div>
          </div>

          {/* Indicators Table */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs font-bold text-slate-400 uppercase">Fired Forensic Indicators</h4>
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">Indicator Title</th>
                    <th className="p-2.5">Evidence Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                  {incident.indicators.map((ind, i) => (
                    <tr key={i}>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ind.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {ind.severity}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-white">{ind.title}</td>
                      <td className="p-2.5 text-slate-300">{ind.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
          >
            CLOSE PREVIEW
          </button>
        </div>
      </div>
    </div>
  );
};
