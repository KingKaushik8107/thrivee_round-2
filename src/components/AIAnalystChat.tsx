import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw } from 'lucide-react';
import type { IncidentAnalysis } from '../types';
import { explainWithAI } from '../services/api';

interface AIAnalystChatProps {
  incident: IncidentAnalysis;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAnalystChat: React.FC<AIAnalystChatProps> = ({ incident }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I am your SOC AI Security Analyst. I have reviewed the forensic findings for this incident (${incident.verdict.replace(/_/g, ' ').toUpperCase()} - Score: ${incident.risk_score}/100). All my answers are grounded strictly in the verified security indicators and ML models. How can I assist you with this investigation?`
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'Why was this email flagged as dangerous?',
    'What are the strongest forensic indicators?',
    'What brand is being impersonated?',
    'What is the primary attack objective?',
    'What should the SOC team do next?'
  ];

  const handleSend = async (questionText: string) => {
    if (!questionText.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: questionText };
    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await explainWithAI({
        question: questionText,
        incident_id: incident.incident_id,
        structured_findings: incident,
        history: historyPayload
      });

      setMessages(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Unable to query the AI Security Analyst engine. Please check backend connection.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <span>AI SECURITY ANALYST</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Grounded Mode
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Strictly grounded in static forensic findings and ML inference</p>
          </div>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="py-2.5 overflow-x-auto flex space-x-2 border-b border-slate-800/80 no-scrollbar">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors disabled:opacity-50 flex items-center space-x-1"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 text-xs sm:text-sm">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-xl max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                  : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none font-sans whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Analyzing incident evidence and generating grounded response...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputQuestion);
        }}
        className="pt-3 border-t border-slate-800 flex items-center space-x-2"
      >
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask the AI Analyst a forensic question about this incident..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !inputQuestion.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
