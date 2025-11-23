
import React, { useState } from 'react';
import type { WeeklyTheme, SavedEntries, GratitudeEntry } from '../types';
import { generateMilestoneSummary } from '../services/geminiService';

interface MilestoneCardProps {
  milestone: number;
  themes: WeeklyTheme[];
  savedEntries: SavedEntries;
  gratitudeEntries: GratitudeEntry[];
  onSummaryGenerated: (milestone: number) => void;
}

const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 010-1.414L11 3a1 1 0 011.414 0z" />
    </svg>
);

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  themes,
  savedEntries,
  gratitudeEntries,
  onSummaryGenerated,
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMilestoneSummary(milestone, themes, savedEntries, gratitudeEntries);
      setSummary(result);
      onSummaryGenerated(milestone);
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

  return (
    <div className="mb-6 gradient-milestone text-white p-6 rounded-xl shadow-2xl animate-fade-in">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-5 bg-white/20 p-3 rounded-full">
            <StarIcon />
        </div>
        <div>
            <h2 className="text-2xl font-bold">Congratulations on a Major Milestone!</h2>
            <p className="mt-1 opacity-90">You've completed {milestone} weeks of reflection. Take a moment to see how far you've come.</p>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-white/20">
        {summary ? (
          <div className="bg-white/10 p-4 rounded-lg animate-fade-in">
            <h3 className="font-semibold text-lg mb-2">Your Personalized Reflection:</h3>
            <p className="whitespace-pre-wrap leading-relaxed font-serif">{summary}</p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2 bg-white text-primary font-semibold rounded-md shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-600 focus:ring-white transition-all disabled:opacity-70 disabled:cursor-wait"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Reflection...
                </span>
              ) : "Generate Your Reflection"}
            </button>
            {error && (
              <div className="mt-3 bg-red-800/50 border border-red-300/50 text-white text-sm p-3 rounded-md">
                <strong>Error:</strong> {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};