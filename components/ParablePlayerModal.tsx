import React, { useState, useEffect, useRef } from 'react';
import { generateParableSegment } from '../services/geminiService';

interface ParablePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

interface StorySegment {
    role: 'model' | 'user';
    text: string;
}

const parableStarters = [
    { key: 'The Prodigal Son', title: 'The Prodigal Son', description: 'A story of loss, return, and unconditional forgiveness.' },
    { key: 'The Good Samaritan', title: 'The Good Samaritan', description: 'Explore what it truly means to be a neighbor to those in need.' },
    { key: 'The Sower', title: 'The Parable of the Sower', description: 'Discover how different hearts receive the message of faith.' },
];

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-primary"></div>
        <p className="ml-3 text-muted">The next chapter is being written...</p>
    </div>
);


export const ParablePlayerModal: React.FC<ParablePlayerModalProps> = ({ isOpen, onClose, onShowToast }) => {
    const [activeParable, setActiveParable] = useState<string | null>(null);
    const [story, setStory] = useState<StorySegment[]>([]);
    const [choices, setChoices] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const storyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
             storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [story, choices, isOpen]);

    const handleStartParable = async (title: string) => {
        setActiveParable(title);
        setIsLoading(true);
        setIsComplete(false);
        setStory([]);
        setChoices([]);
        
        try {
            const result = await generateParableSegment(title, '', null);
            setStory([{ role: 'model', text: result.storySegment }]);
            setChoices(result.choices);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            onShowToast(`Could not start story: ${message}`, 'error');
            setActiveParable(null); // Go back to selection
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleChoice = async (choice: string) => {
        if (!activeParable) return;
        setIsLoading(true);
        
        const fullStoryHistory = story.map(s => s.text).join('\n\n');
        
        setStory(prev => [...prev, { role: 'user', text: `I chose to: ${choice}` }]);
        setChoices([]);
        
        try {
            const result = await generateParableSegment(activeParable, fullStoryHistory, choice);
            setStory(prev => [...prev, { role: 'model', text: result.storySegment }]);
            
            if (result.isEnding) {
                setIsComplete(true);
                setChoices([]);
            } else {
                setChoices(result.choices);
            }
        } catch (err) {
             const message = err instanceof Error ? err.message : "An unknown error occurred.";
            onShowToast(`Could not continue story: ${message}`, 'error');
            // Restore previous choices to allow retry
            setStory(prev => prev.slice(0, -1));
            setChoices(story.length > 0 ? choices : []);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setActiveParable(null);
        setStory([]);
        setChoices([]);
        setIsComplete(false);
        setIsLoading(false);
    };


    if (!isOpen) return null;

    return (
        <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
                <header className="flex items-center justify-between p-4 border-b border-default">
                    <h3 className="text-xl font-semibold text-main">
                        {activeParable ? `Interactive Parable: ${activeParable}` : 'Choose a Story'}
                    </h3>
                    <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 p-6 overflow-y-auto bg-card-secondary space-y-4">
                    {!activeParable ? (
                        <div className="space-y-4">
                            {parableStarters.map(p => (
                                <button key={p.key} onClick={() => handleStartParable(p.title)} className="w-full text-left p-4 bg-card rounded-lg shadow-sm hover:shadow-md hover:border-primary border-transparent border-2 transition-all focus:outline-none focus:ring-2 ring-primary">
                                    <h4 className="font-semibold text-main">{p.title}</h4>
                                    <p className="text-sm text-muted">{p.description}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <>
                            {story.map((segment, index) => (
                                <div key={index} className={`flex ${segment.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-prose px-4 py-2 rounded-lg ${segment.role === 'user' ? 'bg-primary-light text-primary-text' : 'bg-card'}`}>
                                        <p className="whitespace-pre-wrap">{segment.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && <LoadingSpinner />}
                             <div ref={storyEndRef} />
                        </>
                    )}
                </div>
                
                {(activeParable && !isLoading) && (
                    <footer className="p-4 border-t border-default space-y-3">
                        {isComplete ? (
                             <div className="text-center">
                                <p className="text-muted mb-3">The story has concluded.</p>
                                <button onClick={handleReset} className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
                                    Start a New Story
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {choices.map((choice, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleChoice(choice)}
                                        className="w-full text-left p-3 bg-card-secondary text-main rounded-lg shadow-sm hover:shadow-md hover:bg-primary-light transition-all focus:outline-none focus:ring-2 ring-primary"
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                        )}
                         <button onClick={handleReset} className="text-xs text-subtle hover:underline p-1">
                                or go back to story selection...
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};