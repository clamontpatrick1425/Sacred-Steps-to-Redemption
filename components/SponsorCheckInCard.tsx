import React, { useState, useEffect } from 'react';
import type { SponsorCheckIn, SponsorNoteCategory } from '../types';

interface SponsorCheckInCardProps {
  currentWeek?: number;
  userName?: string;
  onShowToast?: (message: string, type: 'error' | 'info' | 'success') => void;
}

const CATEGORIES: { id: SponsorNoteCategory; label: string; icon: string; color: string }[] = [
  { id: 'progress', label: 'Progress Update', icon: '📈', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' },
  { id: 'question', label: 'Question for Sponsor', icon: '❓', color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300' },
  { id: 'step_work', label: 'Step Work Discussion', icon: '📖', color: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300' },
  { id: 'vulnerability', label: 'Urge / Vulnerability', icon: '🛡️', color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300' },
  { id: 'gratitude', label: 'Victory / Gratitude', icon: '✨', color: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300' },
];

const MOODS = ['Hopeful', 'Grateful', 'Tested / Urge', 'Peaceful', 'Seeking Guidance'];

const PROMPT_STARTERS = [
  'How did you get past fear when working on your moral inventory?',
  'I had a strong urge earlier this week—here is how I navigated it:',
  'Celebrated a key milestone today and wanted to share gratitude:',
  'Can we set aside 15 minutes this week to read through Step 3 together?',
];

export const SponsorCheckInCard: React.FC<SponsorCheckInCardProps> = ({
  currentWeek,
  userName = 'Fellow Pilgrim',
  onShowToast,
}) => {
  const [checkIns, setCheckIns] = useState<SponsorCheckIn[]>(() => {
    try {
      const stored = localStorage.getItem('sacred_steps_sponsor_checkins');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [noteText, setNoteText] = useState('');
  const [category, setCategory] = useState<SponsorNoteCategory>('question');
  const [selectedMood, setSelectedMood] = useState('Seeking Guidance');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sacred_steps_sponsor_checkins', JSON.stringify(checkIns));
    } catch (e) {
      console.error('Failed to save sponsor check-ins to localStorage', e);
    }
  }, [checkIns]);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newCheckIn: SponsorCheckIn = {
      id: `sponsor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category,
      note: noteText.trim(),
      mood: selectedMood,
      week: currentWeek,
      createdAt: new Date().toISOString(),
      isDiscussed: false,
    };

    setCheckIns((prev) => [newCheckIn, ...prev]);
    setNoteText('');
    setIsFormOpen(false);

    if (onShowToast) {
      onShowToast('Sponsor note saved to your check-in ledger.', 'success');
    }
  };

  const handleToggleDiscussed = (id: string) => {
    setCheckIns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isDiscussed: !c.isDiscussed } : c))
    );
  };

  const handleDeleteCheckIn = (id: string) => {
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
    if (onShowToast) {
      onShowToast('Note removed from check-in ledger.', 'info');
    }
  };

  const handleCopyForSponsor = (checkIn: SponsorCheckIn) => {
    const categoryObj = CATEGORIES.find((c) => c.id === checkIn.category);
    const catLabel = categoryObj?.label || 'Check-in';
    const weekStr = checkIn.week ? ` (Week ${checkIn.week})` : '';
    const moodStr = checkIn.mood ? ` | State of Mind: ${checkIn.mood}` : '';

    const textToCopy = `Hi! Sponsor check-in from ${userName}${weekStr}\nType: ${catLabel}${moodStr}\n\n"${checkIn.note}"\n\n(Logged via Sacred Steps to Redemption)`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(checkIn.id);
    if (onShowToast) {
      onShowToast('Formatted note copied! Ready to paste into SMS, WhatsApp, or Email.', 'success');
    }
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const filteredList = checkIns.filter((item) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'pending') return !item.isDiscussed;
    if (filterCategory === 'discussed') return item.isDiscussed;
    return item.category === filterCategory;
  });

  const pendingQuestionsCount = checkIns.filter((c) => !c.isDiscussed).length;

  return (
    <div className="bg-card-secondary p-6 rounded-xl border border-default space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xl">
            🤝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-main">Sponsor Check-In</h3>
              {pendingQuestionsCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {pendingQuestionsCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Jot down quick progress notes, victories, or questions to ask your sponsor
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border shadow-2xs ${
            isFormOpen
              ? 'bg-card text-main border-default hover:bg-card-secondary'
              : 'bg-primary text-on-primary border-primary hover:bg-primary-hover'
          }`}
        >
          {isFormOpen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Close Form</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ New Check-In Note</span>
            </>
          )}
        </button>
      </div>

      {/* Jot Down Form */}
      {isFormOpen && (
        <form onSubmit={handleSaveNote} className="bg-card p-5 rounded-xl border border-default shadow-xs space-y-4 animate-fadeIn">
          <div>
            <label className="block text-xs font-bold text-main uppercase tracking-wider mb-2">
              Note Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === cat.id
                      ? `${cat.color} font-bold shadow-xs scale-[1.02]`
                      : 'bg-card-secondary text-muted border-default hover:bg-card'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label.replace(' Discussion', '')}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-main uppercase tracking-wider mb-1.5">
              Current Spiritual State / Mood
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((mood) => (
                <button
                  type="button"
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer border ${
                    selectedMood === mood
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-card-secondary text-muted border-default hover:bg-card'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="sponsor-note-input" className="text-xs font-bold text-main uppercase tracking-wider">
                Note or Question for Your Sponsor
              </label>
              <span className="text-[11px] text-muted">
                {noteText.length}/1000 characters
              </span>
            </div>
            <textarea
              id="sponsor-note-input"
              rows={3}
              maxLength={1000}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g., Felt strong anxiety near old acquaintances on Thursday. Read Psalm 23 and called another group member. Want to ask how you dealt with fear during your 4th step inventory..."
              className="w-full bg-card-secondary text-main text-sm p-3 rounded-lg border border-default focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted/60"
            />
          </div>

          {/* Prompt Starters */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted">Quick ideas to click &amp; adapt:</span>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_STARTERS.map((starter, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setNoteText(starter)}
                  className="text-left text-[11px] text-muted bg-card-secondary hover:bg-card hover:text-main px-2 py-1 rounded border border-default/70 transition-colors cursor-pointer truncate max-w-full"
                  title={starter}
                >
                  &ldquo;{starter}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-default/60">
            <button
              type="button"
              onClick={() => {
                setNoteText('');
                setIsFormOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-default text-xs font-semibold text-muted hover:text-main cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteText.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Save to Ledger</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted font-medium mr-1">Filter:</span>
          {['all', 'pending', 'discussed', 'question', 'progress'].map((catKey) => (
            <button
              key={catKey}
              type="button"
              onClick={() => setFilterCategory(catKey)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer border ${
                filterCategory === catKey
                  ? 'bg-primary text-on-primary border-primary font-bold'
                  : 'bg-card text-muted border-default hover:bg-card-secondary'
              }`}
            >
              {catKey === 'all' ? `All (${checkIns.length})` : catKey}
            </button>
          ))}
        </div>
        {checkIns.length > 0 && (
          <span className="text-[11px] text-muted italic">
            Saved securely on this device
          </span>
        )}
      </div>

      {/* Check-in Notes List */}
      {checkIns.length === 0 ? (
        <div className="bg-card p-6 rounded-xl border border-default text-center space-y-2">
          <div className="text-3xl">🤝</div>
          <h4 className="font-bold text-main text-sm">No Sponsor Notes Yet</h4>
          <p className="text-xs text-muted max-w-md mx-auto">
            Use this space as your personal staging area. When questions or breakthroughs occur during your week, jot them here so you never forget to address them with your sponsor.
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer pt-1"
          >
            + Jot down your first note or question
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <p className="text-center text-xs text-muted py-4">No notes match the selected filter.</p>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {filteredList.map((item) => {
            const catObj = CATEGORIES.find((c) => c.id === item.category);
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-card p-4 rounded-xl border transition-all ${
                  item.isDiscussed
                    ? 'border-default/60 opacity-70 bg-card/60'
                    : 'border-default shadow-xs hover:border-primary/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catObj?.color || 'bg-card-secondary text-muted'}`}>
                      {catObj?.icon} {catObj?.label}
                    </span>
                    {item.mood && (
                      <span className="text-[10px] text-muted bg-card-secondary px-2 py-0.5 rounded border border-default/70">
                        {item.mood}
                      </span>
                    )}
                    {item.week && (
                      <span className="text-[10px] font-semibold text-primary">
                        Week {item.week}
                      </span>
                    )}
                    <span className="text-[10px] text-muted">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyForSponsor(item)}
                      title="Copy formatted note to send via text or email"
                      className="px-2 py-1 rounded bg-card-secondary hover:bg-primary-light border border-default text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{isCopied ? 'Copied!' : 'Copy for Text/Email'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCheckIn(item.id)}
                      title="Delete note"
                      className="p-1 rounded text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Note Content */}
                <p className={`text-sm text-main leading-relaxed ${item.isDiscussed ? 'line-through text-muted' : ''}`}>
                  {item.note}
                </p>

                {/* Discussed Status Checkbox */}
                <div className="mt-3 pt-2 border-t border-default/50 flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-muted hover:text-main select-none">
                    <input
                      type="checkbox"
                      checked={item.isDiscussed || false}
                      onChange={() => handleToggleDiscussed(item.id)}
                      className="rounded border-default text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="text-[11px] font-medium">
                      {item.isDiscussed ? 'Discussed with sponsor' : 'Mark as discussed with sponsor'}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
