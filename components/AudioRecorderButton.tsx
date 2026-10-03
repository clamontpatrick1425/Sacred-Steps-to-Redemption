import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';

const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 6v3m0 0v3m0-3h3m-3 0H9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
  </svg>
);

const StopCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface AudioRecorderButtonProps {
  onTranscription: (text: string) => void;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
  variant?: 'compact' | 'badge' | 'full';
  className?: string;
  fieldLabel?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('FileReader result is not a string'));
      }
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onTranscription,
  onShowToast,
  variant = 'badge',
  className = '',
  fieldLabel = 'reflection',
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.3, 0.2, 0.4, 0.25]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Clean up all resources when component unmounts
  const cleanupResources = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // Start recording using available microphone
  const handleStartRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onShowToast('Microphone recording is not supported in this browser.', 'error');
      return;
    }

    try {
      cleanupResources();
      finalTranscriptRef.current = '';
      setInterimTranscript('');
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Real-time audio frequency visualizer via Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (!analyser || ctx.state === 'closed') return;
            analyser.getByteFrequencyData(dataArray);
            const sample1 = (dataArray[1] || 0) / 255;
            const sample2 = (dataArray[3] || 0) / 255;
            const sample3 = (dataArray[5] || 0) / 255;
            const sample4 = (dataArray[7] || 0) / 255;
            const sample5 = (dataArray[9] || 0) / 255;
            setAudioLevels([sample1, sample2, sample3, sample4, sample5]);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          };
          updateLevels();
        }
      } catch (e) {
        console.warn('AudioContext visualization not available:', e);
      }

      // Initialize native Web Speech Recognition if available for real-time dictation
      const SpeechRecognitionClass =
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptPiece = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + transcriptPiece.trim();
              } else {
                interim += transcriptPiece;
              }
            }
            const currentCombined = finalTranscriptRef.current + (interim ? (finalTranscriptRef.current ? ' ' : '') + interim : '');
            setInterimTranscript(currentCombined);
          };

          recognition.onerror = (e: any) => {
            console.warn('Speech recognition notice:', e?.error || e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.warn('Could not start Web Speech Recognition:', recErr);
        }
      }

      // MediaRecorder for capturing high-fidelity audio chunks
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
        else mimeType = '';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setStatus('recording');
      onShowToast(`Microphone active. Speak your ${fieldLabel}...`, 'info');

      // Recording elapsed timer
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            // Auto-stop after 3 minutes
            stopRecordingAndTranscribe();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error('Error accessing microphone:', err);
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isDenied) {
        onShowToast('Microphone access was denied. Please allow microphone permissions in your browser.', 'error');
      } else {
        onShowToast('Unable to open microphone. Please check your audio device settings.', 'error');
      }
      setStatus('idle');
      cleanupResources();
    }
  };

  // Stop recording and process transcription
  const stopRecordingAndTranscribe = async () => {
    if (status !== 'recording') return;

    setStatus('transcribing');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recordedMime = mediaRecorderRef.current?.mimeType || 'audio/webm';

    // Stop MediaRecorder and resolve recorded audio blob
    const audioBlobPromise = new Promise<Blob>((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(new Blob(audioChunksRef.current, { type: recordedMime }));
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMime });
        resolve(audioBlob);
      };
      mediaRecorderRef.current.stop();
    });

    try {
      const audioBlob = await audioBlobPromise;

      // Clean up mic stream immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Check if real-time speech recognition already captured text
      const speechText = (finalTranscriptRef.current + ' ' + interimTranscript).trim();

      if (speechText.length > 5) {
        // Fast path: high quality speech captured live
        const formatted = speechText.charAt(0).toUpperCase() + speechText.slice(1);
        onTranscription(formatted);
        onShowToast('Voice reflection added to journal!', 'success');
      } else if (audioBlob.size > 1000) {
        // Fallback: AI cloud transcription for audio blob
        onShowToast('Transcribing audio with Gemini AI...', 'info');
        const base64 = await blobToBase64(audioBlob);
        const text = await transcribeAudio(base64, recordedMime || 'audio/webm');
        if (text && text.trim().length > 0) {
          const cleanText = text.trim();
          onTranscription(cleanText);
          onShowToast('Voice reflection transcribed and added!', 'success');
        } else {
          onShowToast('No speech was detected in the recording. Please try speaking closer to the mic.', 'info');
        }
      } else {
        onShowToast('Recording was too short to transcribe.', 'info');
      }
    } catch (err: unknown) {
      console.error('Transcription error:', err);
      // If AI failed but we have any partial transcript from browser, use it
      const fallbackText = (finalTranscriptRef.current || interimTranscript).trim();
      if (fallbackText) {
        onTranscription(fallbackText);
        onShowToast('Voice reflection saved from live dictation.', 'success');
      } else {
        const msg = err instanceof Error ? err.message : 'Transcription failed.';
        onShowToast(`Transcription note: ${msg}`, 'error');
      }
    } finally {
      cleanupResources();
      setStatus('idle');
      setInterimTranscript('');
      setRecordingSeconds(0);
    }
  };

  // Cancel recording without saving
  const handleCancel = () => {
    cleanupResources();
    setStatus('idle');
    setInterimTranscript('');
    setRecordingSeconds(0);
    onShowToast('Voice recording cancelled.', 'info');
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // ACTIVE RECORDING BANNER
  if (status === 'recording') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg shadow-xs animate-fade-in text-xs max-w-full">
        {/* Pulsing Red Dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
        </span>

        {/* Live Timer */}
        <span className="font-mono font-bold text-red-700 dark:text-red-300 shrink-0">
          {formatDuration(recordingSeconds)}
        </span>

        {/* Live Audio Visualizer Bars */}
        <div className="hidden sm:flex items-center gap-0.5 h-4 px-1 shrink-0">
          {audioLevels.map((lvl, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, lvl * 18)}px` }}
            />
          ))}
        </div>

        {/* Real-time Interim Text Preview */}
        <span className="text-stone-600 dark:text-stone-300 truncate max-w-[130px] sm:max-w-[200px] italic">
          {interimTranscript ? `“${interimTranscript}”` : 'Listening...'}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            type="button"
            onClick={stopRecordingAndTranscribe}
            className="flex items-center space-x-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
            title="Done speaking: transcribe and insert into reflection"
          >
            <span>✓</span>
            <span>Done</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 text-stone-400 hover:text-red-500 transition-colors cursor-pointer rounded"
            title="Cancel recording"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // TRANSCRIBING STATE
  if (status === 'transcribing') {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-amber-800 dark:text-amber-200 animate-pulse">
        <LoadingIcon />
        <span className="font-medium text-[11px]">Transcribing reflection...</span>
      </div>
    );
  }

  // IDLE BUTTON: COMPACT VARIANT
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleStartRecording}
        className={`p-1.5 rounded-full text-muted hover:text-primary hover:bg-card-secondary transition-colors focus:outline-none focus:ring-2 ring-primary cursor-pointer ${className}`}
        aria-label="Voice-to-Journal: Record reflection with microphone"
        title="Voice-to-Journal: Record reflection with your microphone"
      >
        <MicrophoneIcon />
      </button>
    );
  }

  // IDLE BUTTON: BADGE VARIANT (Default prominent Voice-to-Journal button)
  return (
    <button
      type="button"
      onClick={handleStartRecording}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-2xs transition-all focus:outline-none focus:ring-2 ring-primary cursor-pointer group ${className}`}
      aria-label="Voice-to-Journal: Record with microphone"
      title="Voice-to-Journal: Dictate your reflection using your device microphone"
    >
      <span className="text-primary group-hover:scale-110 transition-transform">
        <MicrophoneIcon />
      </span>
      <span>Voice-to-Journal</span>
    </button>
  );
};
