
import React, { useState } from 'react';
import type { GratitudeEntry } from '../types';

interface GratitudeJarProps {
  entries: GratitudeEntry[];
  onAdd: (text: string) => void;
  onDelete: (id: number) => void;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


export const GratitudeJar: React.FC<GratitudeJarProps> = ({ entries, onAdd, onDelete }) => {
    const [newEntry, setNewEntry] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(newEntry);
        setNewEntry('');
    };

    return (
        <div className="p-4 bg-card rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-muted mb-2">Gratitude Jar</h3>
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                    type="text"
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    className="flex-grow text-base border-input focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                    placeholder="Add something you're grateful for..."
                    aria-label="Add a gratitude entry"
                />
                <button
                    type="submit"
                    className="p-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary disabled:opacity-50"
                    disabled={!newEntry.trim()}
                    aria-label="Add gratitude"
                >
                    <PlusIcon />
                </button>
            </form>
            {entries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-default">
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {entries.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between group p-1.5 rounded-md hover:bg-card-secondary animate-fade-in">
                                <p className="text-sm text-muted break-all">{entry.text}</p>
                                <button
                                    onClick={() => onDelete(entry.id)}
                                    className="ml-2 text-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Delete entry: ${entry.text}`}
                                >
                                    <TrashIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};