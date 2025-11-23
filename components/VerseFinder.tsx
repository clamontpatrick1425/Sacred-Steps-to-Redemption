
import React, { useState } from 'react';
import { findVerseForFeeling } from '../services/geminiService';

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


export const VerseFinder: React.FC = () => {
    const [feeling, setFeeling] = useState('');
    const [verseResult, setVerseResult] = useState<{ verse: string; citation: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feeling.trim()) return;

        setIsLoading(true);
        setError(null);
        setVerseResult(null);
        setIsCopied(false);

        try {
            const result = await findVerseForFeeling(feeling);
            setVerseResult(result);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!verseResult) return;
        const textToCopy = `"${verseResult.verse}" — ${verseResult.citation}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const handleClear = () => {
        setVerseResult(null);
        setFeeling('');
        setError(null);
        setIsCopied(false);
    };

    return (
        <div className="p-4 bg-card rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-muted mb-2">A Verse for Your Moment</h3>
            <form onSubmit={handleSubmit}>
                <label htmlFor="feeling-input" className="sr-only">How are you feeling?</label>
                <input
                    id="feeling-input"
                    type="text"
                    value={feeling}
                    onChange={(e) => setFeeling(e.target.value)}
                    className="block w-full text-base border-input focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                    placeholder="e.g., anxious, grateful..."
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !feeling.trim()}
                    className="mt-3 w-full flex items-center justify-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching...
                        </>
                    ) : "Find a Verse"}
                </button>
            </form>

            {error && (
                <div className="mt-3 bg-red-100 border-l-4 border-red-400 text-red-700 text-sm p-3 rounded-md">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {verseResult && (
                <div className="mt-4 pt-4 border-t border-default animate-fade-in">
                     <blockquote className="border-l-4 border-primary-light pl-4 relative">
                        <p className="font-serif italic text-muted">"{verseResult.verse}"</p>
                        <cite className="block text-right mt-2 not-italic text-muted text-sm">{verseResult.citation}</cite>
                        <div className="absolute top-0 right-0 flex items-center space-x-1">
                            <button 
                                onClick={handleCopy}
                                className="p-1 text-subtle hover:text-primary rounded-full hover:bg-card-secondary transition-colors"
                                aria-label="Copy verse"
                                title="Copy verse"
                            >
                                <CopyIcon />
                            </button>
                             <button 
                                onClick={handleClear}
                                className="p-1 text-subtle hover:text-red-500 rounded-full hover:bg-card-secondary transition-colors"
                                aria-label="Clear and start over"
                                title="Clear and start over"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </blockquote>
                    {isCopied && <p className="text-xs text-green-600 text-right mt-1 animate-fade-in">Copied!</p>}
                </div>
            )}
        </div>
    );
};