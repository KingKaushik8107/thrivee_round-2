import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  User,
  Clock,
  RefreshCw,
  MessageSquare,
  Trash2,
  AlertCircle,
  Check
} from 'lucide-react';
import type { AnalystNote } from '../../types';
import { addIncidentNote, getIncidentNotes, deleteIncidentNote } from '../../services/api';

interface AnalystNotesPanelProps {
  incidentId: string;
  initialNotes?: AnalystNote[];
  onNoteAdded?: (newNote: AnalystNote) => void;
  onNoteDeleted?: (noteId: string) => void;
}

export const AnalystNotesPanel: React.FC<AnalystNotesPanelProps> = ({
  incidentId,
  initialNotes = [],
  onNoteAdded,
  onNoteDeleted,
}) => {
  const [notes, setNotes] = useState<AnalystNote[]>(initialNotes);
  const [newNoteText, setNewNoteText] = useState('');
  const [analystName, setAnalystName] = useState(() => {
    return localStorage.getItem('phishx_analyst_name') || 'SOC Analyst';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (initialNotes.length === 0 && incidentId) {
      setIsLoading(true);
      getIncidentNotes(incidentId)
        .then((res) => {
          if (isMounted) setNotes(res);
        })
        .catch((e) => {
          console.error('Failed to load notes:', e);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [incidentId, initialNotes.length]);

  const handleAnalystNameChange = (val: string) => {
    setAnalystName(val);
    localStorage.setItem('phishx_analyst_name', val);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      const savedNote = await addIncidentNote(
        incidentId,
        newNoteText.trim(),
        analystName.trim() || 'SOC Analyst'
      );
      setNotes((prev) => [savedNote, ...prev]);
      setNewNoteText('');
      if (onNoteAdded) {
        onNoteAdded(savedNote);
      }
    } catch (err: any) {
      console.error('Failed to add note:', err);
      setActionError(err.response?.data?.detail || 'Failed to save analyst note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    setActionError(null);
    try {
      await deleteIncidentNote(incidentId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setConfirmDeleteId(null);
      if (onNoteDeleted) {
        onNoteDeleted(noteId);
      }
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      setActionError(err.response?.data?.detail || 'Failed to delete analyst note.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            ANALYST INVESTIGATION NOTES
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
            {notes.length}
          </span>
        </div>
      </div>

      {/* Error alert if any */}
      {actionError && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-950/60 border border-red-800/80 text-xs font-mono text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* New Note Form */}
      <form onSubmit={handleAddNote} className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/80">
          <User className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-mono text-slate-400">Analyst:</span>
          <input
            type="text"
            value={analystName}
            onChange={(e) => handleAnalystNameChange(e.target.value)}
            placeholder="SOC Analyst"
            className="bg-slate-900 border border-slate-750 text-xs font-mono text-slate-200 px-2.5 py-1 rounded-md focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <textarea
          rows={3}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Record investigation findings, domain whois notes, triage steps, or containment rationale..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-y leading-relaxed"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newNoteText.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING NOTE...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>ADD NOTE</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {isLoading && notes.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-slate-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl p-6">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p>No analyst notes recorded for this incident yet.</p>
            <p className="text-slate-600 text-[11px] mt-1">Use the form above to add notes for this case.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{note.analyst_name}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </span>

                  {/* Inline Delete Confirmation or Trigger */}
                  {confirmDeleteId === note.id ? (
                    <div className="flex items-center space-x-1.5 bg-red-950/80 border border-red-800 rounded px-2 py-0.5">
                      <span className="text-red-300 text-[10px] font-bold">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingId === note.id}
                        className="text-red-400 hover:text-red-200 font-bold px-1 rounded transition-colors disabled:opacity-50"
                        title="Confirm deletion"
                        aria-label="Confirm delete note"
                      >
                        {deletingId === note.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-red-300" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === note.id}
                        className="text-slate-400 hover:text-slate-200 px-1 rounded transition-colors text-[10px]"
                        title="Cancel"
                        aria-label="Cancel delete note"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(note.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Delete this note"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {note.note_text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

