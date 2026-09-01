import React, { useState } from 'react';
import { Mail, ShieldAlert, ExternalLink, Paperclip, X, AlertOctagon } from 'lucide-react';
import type { EmailData, Indicator } from '../types';

interface EvidenceHighlighterProps {
  email: EmailData;
  indicators: Indicator[];
  targetBrand?: string | null;
  brandSimilarity?: number | null;
}

export const EvidenceHighlighter: React.FC<EvidenceHighlighterProps> = ({
  email,
  indicators,
  targetBrand,
  brandSimilarity
}) => {
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  // Find relevant indicators for specific fields
  const senderInd = indicators.find(i => i.source === 'sender_analysis' || i.category === 'brand_impersonation');
  const urlInds = indicators.filter(i => i.source === 'url_analysis');
  const attInds = indicators.filter(i => i.source === 'attachment_analysis');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2 text-slate-200">
          <Mail className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">ORIGINAL EMAIL & FORENSIC HIGHLIGHTS</h3>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Click any highlighted element to inspect forensic triggers
        </div>
      </div>

      {/* Email Metadata Header Box */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 mb-4 text-xs font-mono space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 w-16">FROM:</span>
            {email.display_name && <span className="text-slate-300 font-semibold">{email.display_name}</span>}
            <span
              onClick={() => senderInd && setSelectedIndicator(senderInd)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                senderInd
                  ? 'bg-red-950/80 text-red-300 border border-red-800/80 hover:bg-red-900/80'
                  : 'text-slate-300'
              }`}
            >
              &lt;{email.sender || 'Unknown Sender'}&gt;
            </span>
          </div>

          {senderInd && (
            <span className="text-[10px] text-red-400 uppercase font-bold flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Flagged Sender</span>
            </span>
          )}
        </div>

        {email.reply_to && email.reply_to !== email.sender && (
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 w-16">REPLY-TO:</span>
            <span className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
              {email.reply_to}
            </span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 w-16">TO:</span>
          <span className="text-slate-300">{email.receiver || 'recipient@enterprise.com'}</span>
        </div>

        <div className="flex items-center space-x-2 pt-1 border-t border-slate-900">
          <span className="text-slate-500 w-16">SUBJECT:</span>
          <span className="text-white font-bold font-sans text-sm">
            {email.subject || '(No Subject)'}
          </span>
        </div>
      </div>

      {/* Email Body with Visual Highlights */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-4 flex-1 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed whitespace-pre-wrap select-text overflow-y-auto max-h-[360px]">
        {email.body ? (
          <div>
            {email.body}
          </div>
        ) : (
          <span className="text-slate-500 italic">No text body content.</span>
        )}
      </div>

      {/* Extracted Hyperlinks Section */}
      {email.urls && email.urls.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-400 font-mono flex items-center space-x-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
            <span>EXTRACTED HYPERLINKS ({email.urls.length})</span>
          </div>
          <div className="space-y-1.5">
            {email.urls.map((url, idx) => {
              const matchingInd = urlInds[0];
              return (
                <div
                  key={idx}
                  onClick={() => matchingInd && setSelectedIndicator(matchingInd)}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-red-900/40 text-red-300 font-mono text-xs cursor-pointer hover:border-red-600 transition-colors"
                >
                  <span className="truncate mr-2">{url}</span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-950 text-[10px] font-bold text-red-400 border border-red-800">
                    FLAGGED
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachments Section */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-400 font-mono flex items-center space-x-1.5">
            <Paperclip className="w-3.5 h-3.5 text-rose-400" />
            <span>ATTACHMENTS ({email.attachments.length})</span>
          </div>
          <div className="space-y-1.5">
            {email.attachments.map((att, idx) => {
              const matchingInd = attInds[0];
              return (
                <div
                  key={idx}
                  onClick={() => matchingInd && setSelectedIndicator(matchingInd)}
                  className="flex items-center justify-between p-2.5 rounded bg-slate-950/80 border border-rose-900/50 text-rose-300 font-mono text-xs cursor-pointer hover:border-rose-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-bold text-rose-200">{att.filename}</div>
                      <div className="text-[10px] text-slate-400">{att.content_type} &bull; {att.size_bytes ? `${att.size_bytes} bytes` : 'Metadata only'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-[10px] font-bold text-rose-400 border border-rose-800">
                    DANGEROUS
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Evidence Details Drawer / Modal */}
      {selectedIndicator && (
        <div className="absolute inset-x-4 bottom-4 bg-slate-900/98 border border-red-500/60 rounded-xl p-4 shadow-2xl z-20 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-red-400 font-mono text-xs font-bold uppercase">
              <AlertOctagon className="w-4 h-4" />
              <span>WHY FLAGGED &mdash; FORENSIC RATIONALE</span>
            </div>
            <button
              onClick={() => setSelectedIndicator(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-mono uppercase text-[10px]">Detected Evidence:</span>
              <div className="font-mono bg-slate-950 p-2 rounded text-red-300 border border-red-950 mt-0.5 font-bold">
                {selectedIndicator.evidence}
              </div>
            </div>

            {targetBrand && (
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400 font-mono uppercase text-[10px]">Expected Brand:</span>
                  <p className="font-bold text-white">{targetBrand}</p>
                </div>
                {brandSimilarity && (
                  <div>
                    <span className="text-slate-400 font-mono uppercase text-[10px]">Similarity Metric:</span>
                    <p className="font-mono font-bold text-amber-400">{Math.round(brandSimilarity * 100)}% Match</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <span className="text-slate-400 font-mono uppercase text-[10px]">Security Context:</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{selectedIndicator.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
