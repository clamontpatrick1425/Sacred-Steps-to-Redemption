import React, { useState } from 'react';
import type { WeeklyTheme } from '../types';
import { generateMeditationScript } from '../services/geminiService';
import { TextToSpeechButton } from './TextToSpeechButton';

interface GuidedMeditationProps {
  entry: WeeklyTheme;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6m-5 4h4m5 6a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const LoadingSpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const GuidedMeditation: React.FC<GuidedMeditationProps> = ({ entry, onShowToast }) => {
    const [script, setScript] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateScript = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const generatedScript = await generateMeditationScript(entry);
            setScript(generatedScript);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(message);
            onShowToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card rounded-xl shadow-md p-6 transition-all hover:shadow-lg">
            <div className="flex items-center mb-3">
                <div className="mr-3 text-primary"><BrainIcon /></div>
                <h3 className="text-xl font-semibold text-main">AI-Powered Guided Meditation</h3>
            </div>
            <p className="text-muted mb-4">
                Generate a unique, 2-3 minute guided meditation based on this week's theme of '{entry.theme}' to help you reflect and find peace.
            </p>

            {!script && (
                <button
                    onClick={handleGenerateScript}
                    disabled={isLoading}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinnerIcon />
                            <span>Generating...</span>
                        </>
                    ) : "Create My Meditation"}
                </button>
            )}
            
            {error && !isLoading && (
                 <div className="mt-4 text-sm text-red-600">
                    <p><strong>Error:</strong> {error}</p>
                    <button onClick={handleGenerateScript} className="mt-2 text-primary underline">Try Again</button>
                </div>
            )}
            
            {script && (
                <div className="mt-4 pt-4 border-t border-default animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                         <h4 className="text-lg font-semibold text-muted">Your Personal Meditation Script</h4>
                         <TextToSpeechButton textToSpeak={script} onShowToast={onShowToast} />
                    </div>
                    <div className="max-h-60 overflow-y-auto bg-card-secondary p-4 rounded-md">
                        <p className="whitespace-pre-wrap text-main leading-relaxed">{script}</p>
                    </div>
                </div>
            )}
        </div>
    );
};