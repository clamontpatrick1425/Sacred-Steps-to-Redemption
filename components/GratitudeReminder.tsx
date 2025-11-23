import React from 'react';
import type { GratitudeEntry } from '../types';

interface GratitudeReminderProps {
  entry: GratitudeEntry | null;
  onShuffle: () => void;
}

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M20 4h-5v5M4 20h5v-5" />
    </svg>
);

export const GratitudeReminder: React.FC<GratitudeReminderProps> = ({ entry, onShuffle }) => {
    if (!entry) {
        return null;
    }

    return (
        <div className="mb-6 bg-accent-light border-l-4 border-accent text-accent-dark p-4 rounded-r-lg shadow-sm animate-fade-in" role="status">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold mb-1">A Moment of Gratitude</p>
                    <p className="italic">"{entry.text}"</p>
                </div>
                <button 
                    onClick={onShuffle} 
                    className="p-1.5 rounded-full text-accent hover:bg-accent-light-hover hover:text-accent-dark transition-colors"
                    aria-label="Show another gratitude entry"
                >
                    <RefreshIcon />
                </button>
            </div>
        </div>
    );
};