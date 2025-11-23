import React, { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/geminiService';

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 6v3m0 0v3m0-3h3m-3 0H9" />
    </svg>
);

const StopCircleIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
    </svg>
);

const LoadingIcon = () => (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface AudioRecorderButtonProps {
    onTranscription: (text: string) => void;
    onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error("FileReader result is not a string"));
            }
            // remove the header `data:audio/webm;base64,`
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({ onTranscription, onShowToast }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStatus('recording');
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop()); // Release microphone
                setStatus('transcribing');
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                try {
                    const base64Audio = await blobToBase64(audioBlob);
                    const transcribedText = await transcribeAudio(base64Audio, 'audio/webm');
                    onTranscription(transcribedText);
                } catch (err) {
                    const message = err instanceof Error ? err.message : "An unknown error occurred.";
                    onShowToast(`Transcription failed: ${message}`, 'error');
                } finally {
                     setStatus('idle');
                }
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            onShowToast("Microphone access was denied. Please enable it in your browser settings.", 'error');
            setStatus('idle');
        }
    };
    
    const handleClick = () => {
        if (status === 'idle') {
            handleStartRecording();
        } else if (status === 'recording') {
            stopRecording();
        }
    };
    
    const getButtonState = () => {
        switch (status) {
            case 'idle':
                return { icon: <MicrophoneIcon />, label: 'Record audio entry', color: 'text-muted hover:text-primary' };
            case 'recording':
                return { icon: <StopCircleIcon />, label: 'Stop recording', color: 'text-red-500 animate-pulse' };
            case 'transcribing':
                return { icon: <LoadingIcon />, label: 'Transcribing...', color: 'text-primary' };
            default:
                 return { icon: <MicrophoneIcon />, label: 'Record audio entry', color: 'text-muted' };
        }
    };
    
    const { icon, label, color } = getButtonState();

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={status === 'transcribing'}
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary ${color} ${status === 'transcribing' ? 'cursor-wait' : 'hover:bg-card-secondary'}`}
            aria-label={label}
            title={label}
        >
            {icon}
        </button>
    );
};