import React, { useState, useEffect } from 'react';

interface MoodEntry {
  id: number;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'struggling' | 'rough';
  note: string;
}

const MOOD_EMOJIS = {
  great: '🌟',
  good: '😊',
  okay: '😐',
  struggling: '😔',
  rough: '🌧️'
};

export const MoodTracker: React.FC = () => {
  const [entries, setEntries] = useState<MoodEntry[]>(() => {
    try {
      const stored = localStorage.getItem('moodEntries');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse mood entries", e);
    }
    return [];
  });

  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood'] | null>(null);
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    localStorage.setItem('moodEntries', JSON.stringify(entries));
  }, [entries]);

  const today = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = entries.some(e => e.date === today);

  const handleCheckIn = () => {
    if (!selectedMood) return;
    
    const newEntry: MoodEntry = {
      id: Date.now(),
      date: today,
      mood: selectedMood,
      note: note.trim()
    };
    
    setEntries(prev => [newEntry, ...prev]);
    setSelectedMood(null);
    setNote('');
    setIsExpanded(false);
  };

  return (
    <div className="bg-card rounded-xl shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-main flex items-center">
          <span className="mr-2">📅</span> Daily Check-in
        </h3>
        {hasCheckedInToday && !isExpanded && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
            Done Today
          </span>
        )}
      </div>

      {!hasCheckedInToday || isExpanded ? (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-muted">How are you feeling today?</p>
          <div className="flex justify-between">
            {(Object.keys(MOOD_EMOJIS) as Array<keyof typeof MOOD_EMOJIS>).map(mood => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`text-2xl p-2 rounded-full transition-transform hover:scale-110 ${selectedMood === mood ? 'bg-primary-light ring-2 ring-primary' : 'grayscale hover:grayscale-0'}`}
                title={mood.charAt(0).toUpperCase() + mood.slice(1)}
              >
                {MOOD_EMOJIS[mood]}
              </button>
            ))}
          </div>
          
          {selectedMood && (
            <div className="space-y-2 animate-fade-in">
              <input
                type="text"
                placeholder="Add a short note (optional)..."
                className="w-full p-2 text-sm border border-input rounded-md focus:ring-primary focus:border-primary bg-card-secondary"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={100}
              />
              <button
                onClick={handleCheckIn}
                className="w-full py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover transition-colors"
              >
                Save Check-in
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted">
          <p>You checked in today. Great job staying mindful!</p>
          <button 
            onClick={() => setIsExpanded(true)}
            className="text-primary hover:underline mt-2 text-xs"
          >
            Update check-in
          </button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-default">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Recent Check-ins</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
            {entries.slice(0, 5).map(entry => (
              <div key={entry.id} className="flex items-center text-sm bg-card-secondary p-2 rounded-md">
                <span className="text-xl mr-2">{MOOD_EMOJIS[entry.mood]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-main capitalize">{entry.mood}</span>
                    <span className="text-xs text-subtle">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {entry.note && <p className="text-xs text-muted truncate">{entry.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
