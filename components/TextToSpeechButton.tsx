
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
    </svg>
);

const LoadingIcon = () => (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ErrorIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


interface TextToSpeechButtonProps {
    textToSpeak: string;
    onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

export const TextToSpeechButton: React.FC<TextToSpeechButtonProps> = ({ textToSpeak, onShowToast }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const errorTimerRef = useRef<number | null>(null);

    const stopPlayback = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null; // Prevent onended from firing on manual stop
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
        }
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }
        setStatus('idle');
    }, []);

    const startPlayback = useCallback(async () => {
        if (!textToSpeak) return;

        setStatus('loading');
        try {
            const base64Audio = await generateSpeech(textToSpeak);
            const audioData = decode(base64Audio);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                 await audioContext.resume();
            }

            const audioBuffer = await decodeAudioData(audioData, audioContext);
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContext.destination);
            
            sourceNode.onended = () => {
                setStatus('idle');
                sourceNodeRef.current = null;
            };

            sourceNode.start();
            sourceNodeRef.current = sourceNode;
            setStatus('playing');

        } catch (e) {
            console.error("TTS Error:", e);
            setStatus('error');
            onShowToast("Audio could not be generated. Please try again later.", 'error');
            
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            errorTimerRef.current = window.setTimeout(() => {
                setStatus(currentStatus => currentStatus === 'error' ? 'idle' : currentStatus);
            }, 5000);
        }
    }, [textToSpeak, onShowToast]);
    
    const handleClick = () => {
        if (status === 'loading') return;
        if (status === 'playing') {
            stopPlayback();
        } else { // 'idle' or 'error'
            startPlayback();
        }
    };

    useEffect(() => {
        // Cleanup on component unmount or if text changes
        return () => {
            stopPlayback();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, [stopPlayback]);

    const getButtonState = () => {
        switch (status) {
            case 'idle':
                return { icon: <SpeakerIcon />, label: 'Listen to this text', color: 'text-muted hover:text-primary' };
            case 'loading':
                return { icon: <LoadingIcon />, label: 'Loading audio...', color: 'text-primary' };
            case 'playing':
                return { icon: <StopIcon />, label: 'Stop playback', color: 'text-primary hover:text-primary-hover' };
            case 'error':
                return { icon: <ErrorIcon />, label: 'Error generating audio, click to retry', color: 'text-red-500 hover:text-red-600' };
            default:
                return { icon: <SpeakerIcon />, label: 'Listen to this text', color: 'text-muted' };
        }
    };

    const { icon, label, color } = getButtonState();

    return (
        <button
            onClick={handleClick}
            disabled={status === 'loading'}
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary ${color} ${status === 'loading' ? 'cursor-wait' : 'hover:bg-card-secondary'}`}
            aria-label={label}
            title={label}
        >
            {icon}
        </button>
    );
};