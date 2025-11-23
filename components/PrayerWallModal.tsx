
import React, { useState, useRef, useEffect } from 'react';
import type { PrayerWallEntry } from '../types';

interface PrayerWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PrayerWallEntry[];
  onAddPrayer: (text: string) => Promise<void>;
  onPray: (id: number) => void;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const timeAgo = (timestamp: number): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "just now";
};

export const PrayerWallModal: React.FC<PrayerWallModalProps> = ({ isOpen, onClose, entries, onAddPrayer, onPray, onShowToast }) => {
    const [newPrayer, setNewPrayer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const PRAYER_MAX_LENGTH = 300;

    useEffect(() => {
        if (isOpen) {
            textareaRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const prayerText = newPrayer.trim();
        if (!prayerText) return;
        if (prayerText.length > PRAYER_MAX_LENGTH) {
            onShowToast(`Prayer is too long. Please limit to ${PRAYER_MAX_LENGTH} characters.`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await onAddPrayer(prayerText);
            setNewPrayer('');
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            onShowToast(`Failed to post prayer: ${message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
                <header className="flex items-center justify-between p-4 border-b border-default">
                    <h3 className="text-xl font-semibold text-main">Community Prayer Wall</h3>
                    <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 p-6 overflow-y-auto bg-card-secondary space-y-4">
                    {entries.length === 0 ? (
                        <div className="text-center p-8 text-muted">
                            <p>The prayer wall is quiet right now.</p>
                            <p>Be the first to share a prayer or a note of gratitude.</p>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <div key={entry.id} className="bg-card p-4 rounded-lg shadow-sm animate-fade-in">
                                <p className="text-main whitespace-pre-wrap break-words">{entry.text}</p>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="text-subtle">{timeAgo(entry.timestamp)}</span>
                                    <div className="flex items-center space-x-3">
                                        {entry.prayers > 0 && (
                                            <span className="flex items-center text-accent-dark">
                                                <HeartIcon /> {entry.prayers}
                                            </span>
                                        )}
                                        <button 
                                            onClick={() => onPray(entry.id)} 
                                            className="px-3 py-1 bg-accent-light text-accent-dark rounded-full text-xs hover:bg-accent-light-hover transition-colors focus:outline-none focus:ring-2 ring-accent"
                                        >
                                            Praying for you
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <footer className="p-4 border-t border-default">
                    <form onSubmit={handleSubmit} className="space-y-2">
                        <label htmlFor="prayer-input" className="text-sm font-medium text-muted">Share an anonymous prayer or note of gratitude</label>
                        <div className="flex items-start space-x-2">
                            <textarea
                                id="prayer-input"
                                ref={textareaRef}
                                value={newPrayer}
                                onChange={(e) => setNewPrayer(e.target.value)}
                                className="flex-grow text-base p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary resize-none"
                                placeholder="e.g., 'Grateful for another day...'"
                                rows={2}
                                maxLength={PRAYER_MAX_LENGTH}
                                disabled={isSubmitting}
                            />
                            <button type="submit" disabled={isSubmitting || !newPrayer.trim()} className="h-[44px] p-3 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : <SendIcon />}
                            </button>
                        </div>
                        <p className={`text-xs text-right ${newPrayer.length > PRAYER_MAX_LENGTH ? 'text-red-500' : 'text-subtle'}`}>
                            {newPrayer.length} / {PRAYER_MAX_LENGTH}
                        </p>
                    </form>
                </footer>
            </div>
        </div>
    );
};
