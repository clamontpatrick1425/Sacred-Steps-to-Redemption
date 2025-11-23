import React, { useState, useEffect } from 'react';
import type { WeeklyTheme, JournalResponses, SuggestedResource } from '../types';
import { PrintPreviewModal } from './PrintPreviewModal';
import { generatePersonalPrayer, generateDeeperReflectionPrompt, generateGoalSuggestions } from '../services/geminiService';
import { TextToSpeechButton } from './TextToSpeechButton';
import { ImageSkeleton } from './ImageSkeleton';
import { AudioRecorderButton } from './AudioRecorderButton';
import { QRCodeModal } from './QRCodeModal';
import { GuidedMeditation } from './GuidedMeditation';
import { decode } from '../utils/audioUtils';

interface JournalEntryProps {
  entry: WeeklyTheme | null;
  responses: Partial<JournalResponses>;
  onResponseChange: (week: number, field: keyof JournalResponses, value: string) => void;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
  onReplaceResource: (week: number, resourceIndex: number, brokenResource: SuggestedResource) => Promise<void>;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  imageUrl: string | null;
  onGenerateImage: (week: number, promptText: string) => void;
  isGeneratingImage: boolean;
  onShare: (content: { text: string; source: string }) => void;
  affirmation: string | null;
  isLoadingAffirmation: boolean;
  lyrics: string | null;
  isGeneratingLyrics: boolean;
  onGenerateLyrics: (week: number, theme: WeeklyTheme) => void;
  podcast: string | null;
  isGeneratingPodcast: boolean;
  onGeneratePodcast: (week: number, theme: WeeklyTheme) => void;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; className?: string; }> = ({ title, children, icon, action, className }) => (
    <div className={`bg-card rounded-xl shadow-md p-6 transition-all hover:shadow-lg ${className || ''}`}>
        <div className="flex items-start justify-between mb-3">
             <div className="flex items-center">
                {icon && <div className="mr-3 text-primary">{icon}</div>}
                <h3 className="text-xl font-semibold text-main">{title}</h3>
            </div>
            {action && <div className="-mt-1 -mr-1">{action}</div>}
        </div>
        <div className="text-muted space-y-2">{children}</div>
    </div>
);

const BookOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 010-1.414L11 3a1 1 0 011.414 0z" />
    </svg>
);

const HandIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
    </svg>
);

const QuestionMarkCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PrinterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

const VideoCameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DocumentTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const VolumeUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m-5 2a9 9 0 0014.23 4.23l1.77-1.77M4 12A9 9 0 0115.77 4.23l1.77 1.77" />
    </svg>
);

const LoadingSpinnerIcon = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const FocusEnterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" />
    </svg>
);

const FocusExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6m-6-6l-7 7m-5-5h6v6m-6-6l7 7m-7 5h6v6m-6-6l7 7m5 5h6v-6m-6 6l7-7" />
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const WandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const MusicNoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
    </svg>
);

const FlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 6v3m0 0v3m0-3h3m-3 0H9" />
    </svg>
);


const resourceIcons = {
    video: <VideoCameraIcon />,
    article: <DocumentTextIcon />,
    audio: <VolumeUpIcon />,
};


export const JournalEntry: React.FC<JournalEntryProps> = ({ entry, responses, onResponseChange, onShowToast, onReplaceResource, isFocusMode, onToggleFocusMode, imageUrl, onGenerateImage, isGeneratingImage, onShare, affirmation, isLoadingAffirmation, lyrics, isGeneratingLyrics, onGenerateLyrics, podcast, isGeneratingPodcast, onGeneratePodcast }) => {
  const [isPrintModalOpen, setPrintModalOpen] = useState(false);
  const [personalizedPrayer, setPersonalizedPrayer] = useState<string | null>(null);
  const [isGeneratingPrayer, setIsGeneratingPrayer] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [replacingResourceIndex, setReplacingResourceIndex] = useState<number | null>(null);
  
  // State for Deeper Reflection
  const [deeperPrompt, setDeeperPrompt] = useState<string | null>(null);
  const [isGeneratingDeeperPrompt, setIsGeneratingDeeperPrompt] = useState(false);
  const [deeperPromptError, setDeeperPromptError] = useState<string | null>(null);

  // State for Goal Setting
  const [goalSuggestions, setGoalSuggestions] = useState<string[]>([]);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  
  // State for QR Code Modal
  const [qrCodeData, setQrCodeData] = useState<{url: string, title: string} | null>(null);

  // State for Podcast Player
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset AI-generated content when the week (entry) changes to avoid showing stale data
    setPersonalizedPrayer(null);
    setPrayerError(null);
    setDeeperPrompt(null);
    setDeeperPromptError(null);
    setGoalSuggestions([]);
    setGoalError(null);
  }, [entry?.week]);

  useEffect(() => {
    let url: string | null = null;
    if (podcast) {
        try {
            const pcmData = decode(podcast);
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const dataSize = pcmData.length;
            const blockAlign = (numChannels * bitsPerSample) / 8;
            const byteRate = sampleRate * blockAlign;

            const buffer = new ArrayBuffer(44 + dataSize);
            const view = new DataView(buffer);

            const writeString = (view: DataView, offset: number, string: string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };
            
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            writeString(view, 8, 'WAVE');
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // PCM
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bitsPerSample, true);
            writeString(view, 36, 'data');
            view.setUint32(40, dataSize, true);

            const pcmAsUint8 = new Uint8Array(pcmData);
            for (let i = 0; i < pcmAsUint8.length; i++) {
                view.setUint8(44 + i, pcmAsUint8[i]);
            }

            const wavBlob = new Blob([view], { type: 'audio/wav' });
            url = URL.createObjectURL(wavBlob);
            setPodcastAudioUrl(url);
        } catch (error) {
            console.error("Failed to create WAV file from podcast data", error);
            setPodcastAudioUrl(null);
        }
    } else {
        setPodcastAudioUrl(null);
    }

    return () => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };
}, [podcast]);

  if (!entry) {
    return <div className="text-center p-8">Select a week to begin your journey.</div>;
  }
  
  const hasResponses = 
    (responses.promptResponse && responses.promptResponse.trim() !== '') ||
    (responses.reflection1Response && responses.reflection1Response.trim() !== '') ||
    (responses.reflection2Response && responses.reflection2Response.trim() !== '');

  const handleGeneratePrayer = async () => {
    if (!entry || !hasResponses) return;

    setIsGeneratingPrayer(true);
    setPrayerError(null);
    setPersonalizedPrayer(null); 

    try {
      const prayerText = await generatePersonalPrayer(entry, responses);
      setPersonalizedPrayer(prayerText);
    } catch (err) {
      if (err instanceof Error) {
        setPrayerError(err.message);
      } else {
        setPrayerError("An unknown error occurred while generating your prayer.");
      }
    } finally {
      setIsGeneratingPrayer(false);
    }
  };
  
  const handleGenerateDeeperPrompt = async () => {
    if (!entry || !hasResponses) return;
    setIsGeneratingDeeperPrompt(true);
    setDeeperPromptError(null);
    setDeeperPrompt(null);
    try {
        const promptText = await generateDeeperReflectionPrompt(entry, responses);
        setDeeperPrompt(promptText);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setDeeperPromptError(errorMessage);
        onShowToast(errorMessage, 'error');
    } finally {
        setIsGeneratingDeeperPrompt(false);
    }
  };

  const handleGenerateGoals = async () => {
    if (!entry) return;
    setIsGeneratingGoals(true);
    setGoalError(null);
    setGoalSuggestions([]);
    try {
        const result = await generateGoalSuggestions(entry, responses);
        setGoalSuggestions(result);
        if (result.length === 0) {
            onShowToast("No suggestions could be generated at this time.", "info");
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setGoalError(message);
        onShowToast(message, 'error');
    } finally {
        setIsGeneratingGoals(false);
    }
  };

  const handleReplaceClick = async (index: number, resource: SuggestedResource) => {
    if (!entry) return;
    setReplacingResourceIndex(index);
    await onReplaceResource(entry.week, index, resource);
    setReplacingResourceIndex(null);
  };


  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end space-x-2">
           <button
            onClick={onToggleFocusMode}
            className="no-print flex items-center bg-card text-muted px-3 py-2 rounded-lg shadow-md hover:bg-card-secondary hover:text-main focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors"
            aria-label={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
            title={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
          >
            {isFocusMode ? <FocusExitIcon /> : <FocusEnterIcon />}
            Focus
          </button>
          <button
            onClick={() => setPrintModalOpen(true)}
            className="no-print flex items-center bg-primary-dark text-on-primary px-3 py-2 rounded-lg shadow-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors"
            aria-label="Open print preview for this journal entry"
          >
            <PrinterIcon />
            Print Preview
          </button>
        </div>

        <header className="relative text-center p-6 bg-card rounded-xl shadow-lg border-t-4 border-primary overflow-hidden">
            <div className="absolute top-4 right-4 z-20">
                <TextToSpeechButton textToSpeak={`Week ${entry.week}: ${entry.theme}. ${entry.explanation}`} onShowToast={onShowToast} />
            </div>
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-main">{`Week ${entry.week}: ${entry.theme}`}</h2>
                <p className="mt-2 text-muted">{entry.explanation}</p>
            </div>
            <div className="mt-6 relative z-10 aspect-video rounded-lg overflow-hidden bg-card-secondary flex items-center justify-center">
                 {isGeneratingImage ? (
                    <ImageSkeleton />
                ) : imageUrl ? (
                    <img src={imageUrl} alt={`Reflective art for ${entry.theme}`} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-4">
                        <div className="mx-auto h-12 w-12 text-subtle"><ImageIcon /></div>
                        <p className="mt-2 text-sm text-muted">Generate a reflective image for this week's theme.</p>
                        <button 
                            onClick={() => onGenerateImage(entry.week, entry.explanation)}
                            className="mt-4 flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Image
                        </button>
                    </div>
                )}
            </div>
        </header>
        
        <InfoCard title="Weekly Podcast" icon={<MicrophoneIcon />}>
            <p className="text-sm text-muted mb-4">
                Listen to a short, AI-generated podcast inspired by this week's theme of '{entry.theme}'.
            </p>
            {!podcast && (
                <button
                    onClick={() => onGeneratePodcast(entry.week, entry)}
                    disabled={isGeneratingPodcast}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingPodcast ? (
                        <><LoadingSpinnerIcon /> <span className="ml-2">Generating Podcast...</span></>
                    ) : "Generate Podcast"}
                </button>
            )}
            {podcastAudioUrl && (
                <div className="mt-4 animate-fade-in">
                    <audio controls className="w-full" src={podcastAudioUrl}>
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </InfoCard>

        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard
            title="Your Daily Affirmation"
            icon={<SparklesIcon />}
            className="bg-accent-light"
            action={
              !isLoadingAffirmation && affirmation && (
                <div className="flex items-center space-x-1">
                  <TextToSpeechButton textToSpeak={affirmation} onShowToast={onShowToast} />
                  <button
                      onClick={() => onShare({ text: affirmation, source: "Daily Affirmation" })}
                      className="p-2 text-muted hover:text-primary rounded-full transition-colors hover:bg-card-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary"
                      title="Share this affirmation"
                      aria-label="Share this affirmation as an image"
                  >
                      <ShareIcon />
                  </button>
                </div>
              )
            }
          >
            {isLoadingAffirmation ? (
              <div className="animate-pulse">
                <div className="h-5 bg-card-secondary rounded w-3/4"></div>
              </div>
            ) : (
              <p className="font-serif italic text-lg text-accent-dark">"{affirmation}"</p>
            )}
          </InfoCard>

          <InfoCard 
            title="Bible Verse" 
            icon={<BookOpenIcon />}
            action={
                 <div className="flex items-center space-x-1">
                    <TextToSpeechButton textToSpeak={`Verse from ${entry.bibleVerse}. ${entry.bibleVerseText}`} onShowToast={onShowToast} />
                    <button
                        onClick={() => onShare({ text: entry.bibleVerseText, source: entry.bibleVerse })}
                        className="p-2 text-muted hover:text-primary rounded-full transition-colors hover:bg-card-secondary focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary"
                        title="Share this verse"
                        aria-label="Share this verse as an image"
                    >
                        <ShareIcon />
                    </button>
                </div>
            }
          >
            <blockquote className="border-l-4 border-primary-light pl-4">
              <p className="font-serif italic text-lg">"{entry.bibleVerseText}"</p>
              <cite className="block text-right mt-2 not-italic text-muted">{entry.bibleVerse}</cite>
            </blockquote>
          </InfoCard>
        </div>

        <InfoCard 
          title="Biblical Aspiration & Personal Goal" 
          icon={<FlagIcon />}
        >
          <p className="text-lg text-muted">{entry.biblicalAspiration}</p>
          <div className="mt-6 pt-6 border-t border-default">
            <h4 className="text-base font-semibold text-main mb-2">My Personal Goal for this Week</h4>
            <p className="text-sm text-muted mb-4">Translate this week's theme into a small, actionable step.</p>
             <textarea
                id="personal-goal"
                rows={3}
                className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                placeholder="e.g., I will call a friend I haven't spoken to in a while."
                aria-label="Your personal goal for the week"
                value={responses.personalGoal || ''}
                onChange={(e) => onResponseChange(entry.week, 'personalGoal', e.target.value)}
            />
            <div className="mt-3">
                 <button 
                    onClick={handleGenerateGoals} 
                    disabled={isGeneratingGoals}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingGoals ? (
                        <><LoadingSpinnerIcon /> <span className="ml-2">Suggesting...</span></>
                    ) : "Suggest a Goal"}
                </button>
                {goalError && <p className="text-sm text-red-600 mt-2">{goalError}</p>}
                {goalSuggestions.length > 0 && (
                    <div className="mt-4 space-y-2 animate-fade-in">
                        <p className="text-xs text-subtle">Click a suggestion to use it:</p>
                        {goalSuggestions.map((suggestion, index) => (
                            <button 
                                key={index} 
                                onClick={() => onResponseChange(entry.week, 'personalGoal', suggestion)}
                                className="block w-full text-left p-2 text-sm text-main bg-card-secondary rounded-md hover:bg-primary-light transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </InfoCard>

        <InfoCard 
          title="Weekly Prompt" 
          icon={<PencilIcon />}
          action={
            <TextToSpeechButton textToSpeak={entry.prompt} onShowToast={onShowToast} />
          }
        >
            <p className="text-lg text-muted">{entry.prompt}</p>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="prompt-response" className="block text-sm font-medium text-muted">
                    Your Response
                </label>
                <AudioRecorderButton 
                    onTranscription={(text) => onResponseChange(entry.week, 'promptResponse', (responses.promptResponse || '') + ' ' + text)}
                    onShowToast={onShowToast}
                />
              </div>
              <textarea
                  id="prompt-response"
                  rows={8}
                  className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                  placeholder="Write your thoughts here or use the microphone to record..."
                  aria-label="Your response to the weekly prompt"
                  value={responses.promptResponse || ''}
                  onChange={(e) => onResponseChange(entry.week, 'promptResponse', e.target.value)}
              />
          </div>
        </InfoCard>

        <div className="grid md:grid-cols-2 gap-6">
            <InfoCard title="Reflection Questions" icon={<QuestionMarkCircleIcon />}>
              <div className="space-y-6">
                  <div>
                      <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-main pr-2">
                              {entry.reflectionQuestion1}
                          </p>
                          <TextToSpeechButton textToSpeak={entry.reflectionQuestion1} onShowToast={onShowToast} />
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="reflection-1-response" className="block text-sm font-medium text-muted">
                            Your Reflection
                        </label>
                        <AudioRecorderButton 
                            onTranscription={(text) => onResponseChange(entry.week, 'reflection1Response', (responses.reflection1Response || '') + ' ' + text)}
                            onShowToast={onShowToast}
                        />
                      </div>
                      <textarea
                          id="reflection-1-response"
                          rows={5}
                          className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                          placeholder="Your reflection..."
                          aria-label={`Response for the question: ${entry.reflectionQuestion1}`}
                          value={responses.reflection1Response || ''}
                          onChange={(e) => onResponseChange(entry.week, 'reflection1Response', e.target.value)}
                      />
                  </div>
                  <div>
                      <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-main pr-2">
                              {entry.reflectionQuestion2}
                          </p>
                          <TextToSpeechButton textToSpeak={entry.reflectionQuestion2} onShowToast={onShowToast} />
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="reflection-2-response" className="block text-sm font-medium text-muted">
                            Your Reflection
                        </label>
                        <AudioRecorderButton 
                            onTranscription={(text) => onResponseChange(entry.week, 'reflection2Response', (responses.reflection2Response || '') + ' ' + text)}
                            onShowToast={onShowToast}
                        />
                      </div>
                      <textarea
                          id="reflection-2-response"
                          rows={5}
                          className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                          placeholder="Your reflection..."
                          aria-label={`Response for the question: ${entry.reflectionQuestion2}`}
                          value={responses.reflection2Response || ''}
                          onChange={(e) => onResponseChange(entry.week, 'reflection2Response', e.target.value)}
                      />
                  </div>
              </div>
          </InfoCard>
          
          <div className="flex flex-col gap-6">
            <InfoCard 
                title="Inspirational Quote"
                className="transform hover:scale-105 hover:shadow-xl duration-300 ease-in-out"
                action={
                     <div className="flex items-center space-x-1">
                        <TextToSpeechButton textToSpeak={`A quote by ${entry.quote.author}: ${entry.quote.text}`} onShowToast={onShowToast} />
                         <button
                            onClick={() => onShare({ text: entry.quote.text, source: `– ${entry.quote.author}` })}
                            className="p-2 text-muted hover:text-primary rounded-full transition-colors hover:bg-card-secondary focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary"
                            title="Share this quote"
                            aria-label="Share this quote as an image"
                        >
                            <ShareIcon />
                        </button>
                    </div>
                }
              >
                  <blockquote className="border-l-4 border-primary-light pl-4">
                  <p className="font-serif italic">"{entry.quote.text}"</p>
                  <cite className="block text-right mt-2 not-italic text-muted">&ndash; {entry.quote.author}</cite>
              </blockquote>
            </InfoCard>

            <InfoCard title="Deeper Reflection" icon={<WandIcon />}>
              <p className="text-sm text-muted mb-4">
                  Once you've written something, unlock a personalized prompt to help you reflect even further.
              </p>
              {!deeperPrompt && (
                  <button 
                      onClick={handleGenerateDeeperPrompt} 
                      disabled={isGeneratingDeeperPrompt || !hasResponses}
                      className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isGeneratingDeeperPrompt ? (
                          <> <LoadingSpinnerIcon /> <span className="ml-2">Generating...</span> </>
                      ) : "Reveal a Deeper Prompt"}
                  </button>
              )}
              {deeperPromptError && <p className="text-sm text-red-600 mt-2">{deeperPromptError}</p>}
              {deeperPrompt && (
                  <div className="space-y-4 animate-fade-in">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-main pr-2">{deeperPrompt}</p>
                        <TextToSpeechButton textToSpeak={deeperPrompt} onShowToast={onShowToast} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="deeper-reflection-response" className="block text-sm font-medium text-muted">
                                Your Deeper Reflection
                            </label>
                            <AudioRecorderButton 
                                onTranscription={(text) => onResponseChange(entry.week, 'deeperReflectionResponse', (responses.deeperReflectionResponse || '') + ' ' + text)}
                                onShowToast={onShowToast}
                            />
                        </div>
                        <textarea
                            id="deeper-reflection-response"
                            rows={5}
                            className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                            placeholder="Your deeper reflection..."
                            aria-label={`Response for the deeper reflection question: ${deeperPrompt}`}
                            value={responses.deeperReflectionResponse || ''}
                            onChange={(e) => onResponseChange(entry.week, 'deeperReflectionResponse', e.target.value)}
                        />
                      </div>
                  </div>
              )}
            </InfoCard>
          </div>
        </div>

        <InfoCard title="Suggested Resources" icon={<BookOpenIcon />}>
            <p className="text-sm text-muted mb-4">
                Explore these external resources for guided meditation, prayer, and deeper reflection on this week's theme.
            </p>
            <ul className="space-y-3">
                {entry.suggestedResources && entry.suggestedResources.map((resource, index) => (
                    <li key={index} className="group flex items-center justify-between p-1 -m-1 rounded-lg hover:bg-primary-light transition-colors">
                        <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center flex-1"
                            aria-label={`${resource.title} (${resource.type}). Opens in a new tab.`}
                        >
                            <div className="flex-shrink-0 mr-4 text-primary">
                                {resourceIcons[resource.type] || <DocumentTextIcon />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-medium text-main group-hover:text-primary-on-light truncate">{resource.title}</p>
                                <p className="text-xs text-muted capitalize">{resource.type}</p>
                            </div>
                            <ExternalLinkIcon />
                        </a>
                         <div className="ml-2 flex-shrink-0">
                            <button
                                onClick={() => handleReplaceClick(index, resource)}
                                disabled={replacingResourceIndex !== null}
                                className="p-2 text-subtle rounded-full hover:bg-card-secondary hover:text-muted focus:outline-none focus:ring-2 ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Find a new resource if this link is broken"
                                aria-label="Find a new resource"
                            >
                                {replacingResourceIndex === index ? <LoadingSpinnerIcon /> : <RefreshIcon />}
                            </button>
                        </div>
                    </li>
                ))}
                {(!entry.suggestedResources || entry.suggestedResources.length === 0) && (
                    <p className="text-sm text-subtle">No additional resources suggested for this week.</p>
                )}
            </ul>
        </InfoCard>

        <InfoCard 
          title="Weekly Prayer" 
          icon={<HandIcon />}
          action={
            <div className="flex items-center space-x-1">
                <TextToSpeechButton textToSpeak={entry.prayer} onShowToast={onShowToast} />
            </div>
          }
        >
            <p className="whitespace-pre-wrap leading-relaxed">{entry.prayer}</p>
            <div 
                className="mt-6 pt-6 border-t border-default"
                aria-live="polite"
            >
                <div className="flex items-center mb-3">
                    <div className="mr-3 text-primary"><SparklesIcon /></div>
                    <h4 className="text-lg font-semibold text-muted">Create a Personal Prayer</h4>
                </div>
                <p className="text-sm text-muted mb-4">
                    Use your reflections from this week to generate a unique prayer tailored to your journey.
                </p>
                <button 
                    onClick={handleGeneratePrayer} 
                    disabled={isGeneratingPrayer || !hasResponses}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={!hasResponses ? "Disabled: Write a journal entry first to enable prayer generation." : "Generate a personal prayer based on your journal entries."}
                    aria-busy={isGeneratingPrayer}
                >
                    {isGeneratingPrayer ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : "Help Me Pray"}
                </button>

                {prayerError && (
                     <div role="alert" className="mt-4 bg-red-100 border border-red-200 text-red-800 text-sm p-3 rounded-md">
                        <strong>Error:</strong> {prayerError}
                    </div>
                )}

                {personalizedPrayer && (
                    <div className="mt-4 animate-fade-in">
                        <label htmlFor="personalized-prayer" className="block text-sm font-medium text-muted mb-2">
                            Your Personalized Prayer (AI-Assisted)
                        </label>
                        <textarea
                            id="personalized-prayer"
                            rows={8}
                            className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                            value={personalizedPrayer}
                            onChange={(e) => setPersonalizedPrayer(e.target.value)}
                            aria-label="Your editable personalized prayer"
                        />
                        <p className="text-xs text-subtle mt-1">You can edit this prayer to make it your own.</p>
                    </div>
                )}
            </div>
        </InfoCard>
        
        <GuidedMeditation entry={entry} onShowToast={onShowToast} />

        <InfoCard title={`Song for the Soul: "${entry.songTitle}"`} icon={<MusicNoteIcon />}>
            <p className="text-sm text-muted mb-4">
                Listen to the specially composed song for this week's theme of '{entry.theme}'. Available on major music platforms for $0.99.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                 <a 
                    href={entry.songLinks.spotify}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Listen on Spotify
                </a>
                <a 
                    href={entry.songLinks.appleMusic}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    Listen on Apple Music
                </a>
                 <button
                    onClick={() => setQrCodeData({ url: entry.songLinks.spotify, title: entry.songTitle })}
                    className="flex-1 text-center px-4 py-2 bg-card-secondary text-main font-semibold rounded-md hover:bg-primary-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                    Show QR Code
                </button>
            </div>
            <div className="mt-6 pt-6 border-t border-default">
                <h4 className="text-base font-semibold text-main mb-2">Song Lyrics</h4>
                {!lyrics && (
                    <>
                        <p className="text-sm text-muted mb-4">Generate AI-powered lyrics for this week's song to deepen your reflection.</p>
                        <button
                            onClick={() => onGenerateLyrics(entry.week, entry)}
                            disabled={isGeneratingLyrics}
                            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingLyrics ? (
                                <><LoadingSpinnerIcon /> <span className="ml-2">Generating Lyrics...</span></>
                            ) : "Generate Lyrics"}
                        </button>
                    </>
                )}
                {lyrics && (
                    <div className="mt-4 p-4 bg-card-secondary rounded-md max-h-60 overflow-y-auto animate-fade-in">
                        <p className="whitespace-pre-wrap text-main leading-relaxed">{lyrics}</p>
                    </div>
                )}
            </div>
        </InfoCard>
      </div>
      
      {entry && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setPrintModalOpen(false)}
          entry={entry}
          responses={responses}
          imageUrl={imageUrl}
        />
      )}
       {qrCodeData && (
        <QRCodeModal
            isOpen={!!qrCodeData}
            onClose={() => setQrCodeData(null)}
            url={qrCodeData.url}
            title={qrCodeData.title}
        />
      )}
    </>
  );
};