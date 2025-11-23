import React from 'react';
import { TextToSpeechButton } from './TextToSpeechButton';

interface DailyAffirmationCardProps {
    affirmation: string | null;
    isLoading: boolean;
    onShare: (text: string) => void;
    onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 010-1.414L11 3a1 1 0 011.414 0z" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);

const SkeletonLoader = () => (
    <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mt-2"></div>
    </div>
);


export const DailyAffirmationCard: React.FC<DailyAffirmationCardProps> = ({ affirmation, isLoading, onShare, onShowToast }) => {
    return (
        <div className="relative p-4 bg-accent-light border-l-4 border-accent rounded-r-lg shadow-sm animate-fade-in overflow-hidden">
            <div className="absolute -top-2 -right-2 text-accent opacity-10">
                <SparklesIcon />
            </div>
             <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite]"></div>

            <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                    <h3 className="text-sm font-semibold text-accent-dark mb-1 flex items-center">
                        <SparklesIcon />
                        <span className="ml-2">Your Daily Affirmation</span>
                    </h3>
                    {isLoading ? (
                        <SkeletonLoader />
                    ) : (
                        <p className="italic text-accent-dark font-serif text-lg">"{affirmation}"</p>
                    )}
                </div>
                {!isLoading && affirmation && (
                     <div className="flex-shrink-0 flex items-center space-x-1 -mt-1 -mr-1">
                        <TextToSpeechButton textToSpeak={affirmation} onShowToast={onShowToast} />
                        <button
                            onClick={() => onShare(affirmation)}
                            className="p-2 text-muted hover:text-primary rounded-full transition-colors hover:bg-card-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary"
                            title="Share this affirmation"
                            aria-label="Share this affirmation as an image"
                        >
                            <ShareIcon />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
