import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { WeeklyTheme, JournalResponses, WeeklyPodcastData } from '../types';
import {
  generateWeeklyPodcastWithWebScan,
  getFallbackPodcastScript,
  CURATED_MURF_VOICES,
  cleanScriptForMurf,
} from '../services/geminiService';
import { generateSpeechWithMurf } from '../services/murfService';
import { savePodcast, getPodcast, savePodcastMetadata, getPodcastMetadata, deletePodcast, isDummyToneAudio } from '../utils/podcastDb';
import { base64ToWavBlob } from '../utils/audioUtils';

interface WeeklyPodcastCardProps {
  entry: WeeklyTheme;
  responses?: Partial<JournalResponses>;
  podcastAudio?: string | null;
  isGeneratingPodcast?: boolean;
  onGeneratePodcast?: (week: number, theme: WeeklyTheme, responses?: Partial<JournalResponses>) => Promise<WeeklyPodcastData | string | void>;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

interface SentenceItem {
  id: number;
  text: string;
  wordCount: number;
  startTime: number;
  duration: number;
}

// Helper to cleanly break markdown/devotional text into spoken sentences
export const splitScriptIntoSentences = (text: string, playbackRate = 1.0): SentenceItem[] => {
  if (!text) return [];
  // Clean bracketed cues, asterisks, hashtags
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/^(\d+\.\s*[^\n]+|Content:\s*|Sign-Off:\s*|Audio Cue:\s*)/gim, '')
    .trim();

  // Split by double newline (paragraphs) first, then sentences
  const paragraphs = cleaned.split(/\n\s*\n/);
  const rawSentences: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;
    const matches = trimmedPara.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g);
    if (matches) {
      for (const m of matches) {
        const s = m.trim();
        if (s.length > 0) {
          rawSentences.push(s);
        }
      }
    } else {
      rawSentences.push(trimmedPara);
    }
  }

  const items: SentenceItem[] = [];
  let cumulativeTime = 0;
  // Standard conversational reading rate ~ 130 words per minute
  const baseWordsPerSec = (130 / 60) * playbackRate;

  rawSentences.forEach((sentenceText, idx) => {
    const wordCount = sentenceText.split(/\s+/).filter(Boolean).length;
    const sentenceDuration = Math.max(2.2, wordCount / baseWordsPerSec);
    items.push({
      id: idx,
      text: sentenceText,
      wordCount,
      startTime: cumulativeTime,
      duration: sentenceDuration,
    });
    cumulativeTime += sentenceDuration;
  });

  return items;
};

export const WeeklyPodcastCard: React.FC<WeeklyPodcastCardProps> = ({
  entry,
  responses,
  podcastAudio,
  isGeneratingPodcast = false,
  onGeneratePodcast,
  onShowToast,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [podcastData, setPodcastData] = useState<WeeklyPodcastData | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.95);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-US-terrell');
  const [activeTab, setActiveTab] = useState<'player' | 'download'>('player');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSentenceRef = useRef<HTMLDivElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);
  const sentenceIndexRef = useRef<number>(0);
  const rateRef = useRef<number>(1.0);
  const volumeRef = useRef<number>(0.95);
  const isMutedRef = useRef<boolean>(false);

  // Keep refs in sync for speech callbacks
  rateRef.current = playbackRate;
  volumeRef.current = isMuted ? 0 : volume;
  isMutedRef.current = isMuted;
  sentenceIndexRef.current = currentSentenceIndex;

  // Active script text for current week
  const activeScript = useMemo(() => {
    if (podcastData?.script && podcastData.script.trim().length > 30) {
      return podcastData.script;
    }
    return getFallbackPodcastScript(entry, responses);
  }, [podcastData, entry, responses]);

  // Clean word count for pacing metrics
  const cleanSpokenText = useMemo(() => {
    return cleanScriptForMurf(activeScript);
  }, [activeScript]);

  const wordCount = useMemo(() => {
    return cleanSpokenText.split(/\s+/).filter(Boolean).length;
  }, [cleanSpokenText]);

  // Structured sentences with timing metrics
  const sentences = useMemo(() => {
    return splitScriptIntoSentences(activeScript, playbackRate);
  }, [activeScript, playbackRate]);

  // Studio Audio Source derived from Murf AI or stored audio
  const studioAudioSrc = useMemo(() => {
    if (podcastData?.audioUrl) {
      return podcastData.audioUrl;
    }
    if (
      podcastData?.audioProvider !== 'speech_synthesis' &&
      podcastData?.audioBase64 &&
      podcastData.audioBase64.length > 500 &&
      !isDummyToneAudio(podcastData.audioBase64, podcastData.duration, podcastData.audioProvider)
    ) {
      if (podcastData.audioBase64.startsWith('data:')) {
        return podcastData.audioBase64;
      }
      return `data:audio/mp3;base64,${podcastData.audioBase64}`;
    }
    return null;
  }, [podcastData?.audioUrl, podcastData?.audioBase64, podcastData?.audioProvider, podcastData?.duration]);

  // Total estimated duration in seconds
  const totalDuration = useMemo(() => {
    if (podcastData?.duration && podcastData.duration > 30) {
      return podcastData.duration;
    }
    if (sentences.length === 0) return 240;
    const last = sentences[sentences.length - 1];
    return Math.max(180, Math.round(last.startTime + last.duration));
  }, [podcastData?.duration, sentences]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Initialize SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Pick highest quality natural English voice
  const selectVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!availableVoices || availableVoices.length === 0) return null;
    const preferredNames = [
      'Google US English',
      'Microsoft Jenny Online',
      'Microsoft Guy Online',
      'Microsoft Aria Online',
      'Samantha',
      'Karen',
      'Daniel',
      'Moira',
      'Serena',
      'Alex',
    ];

    for (const name of preferredNames) {
      const match = availableVoices.find(v => v.name.includes(name));
      if (match) return match;
    }

    const enVoice = availableVoices.find(v => v.lang.startsWith('en'));
    return enVoice || availableVoices[0] || null;
  }, [availableVoices]);

  // Stop any active speech and clear intervals
  const stopSpeech = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    isSpeakingRef.current = false;
    setIsPlaying(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Speech cancellation error:', e);
      }
    }
  }, []);

  // Sync audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentSentenceIndex(0);
      onShowToast(`Completed Week ${entry.week} episode.`, 'info');
    };
    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      let activeIdx = 0;
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].startTime <= cur) {
          activeIdx = i;
        } else {
          break;
        }
      }
      setCurrentSentenceIndex(activeIdx);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [sentences, entry.week, onShowToast]);

  // When week changes, reset player and load cached metadata
  useEffect(() => {
    stopSpeech();
    setCurrentSentenceIndex(0);
    setCurrentTime(0);
    setPodcastData(null);

    let isMounted = true;
    const loadWeekMetadata = async () => {
      try {
        const savedMeta = await getPodcastMetadata(entry.week);
        if (!isMounted) return;
        if (savedMeta) {
          // If stored audio is a dummy tone, purge it immediately
          if (isDummyToneAudio(savedMeta.audioBase64, savedMeta.duration, savedMeta.audioProvider)) {
            savedMeta.audioBase64 = '';
            savedMeta.audioProvider = 'speech_synthesis';
            savedMeta.duration = Math.max(180, Math.round(((savedMeta.wordCount || 600) / 130) * 60));
            await deletePodcast(entry.week);
            await savePodcastMetadata(entry.week, savedMeta);
          }
          // If week 1 has no studio audio yet, link to prebuilt studio-grade Murf audio
          if (entry.week === 1 && !savedMeta.audioUrl && !savedMeta.audioBase64) {
            savedMeta.audioUrl = '/audio/week1-terrell.mp3';
            savedMeta.audioProvider = 'murf';
            savedMeta.audioVoiceId = 'en-US-terrell';
            savedMeta.audioVoiceName = 'Terrell (Murf AI Studio)';
            savedMeta.duration = 282;
            await savePodcastMetadata(entry.week, savedMeta);
          } else if (entry.week === 1 && savedMeta.audioUrl === '/audio/week1-terrell.mp3' && savedMeta.duration < 250) {
            savedMeta.duration = 282;
            await savePodcastMetadata(entry.week, savedMeta);
          }
          setPodcastData(savedMeta);
          if (savedMeta.audioVoiceId) {
            setSelectedVoiceId(savedMeta.audioVoiceId);
          }
          return;
        }

        // Check if raw audio or script was saved
        const rawAudio = podcastAudio || (await getPodcast(entry.week));
        if (!isMounted) return;

        const isRawTone = isDummyToneAudio(rawAudio, undefined, 'speech_synthesis');
        if (isRawTone) {
          await deletePodcast(entry.week);
        }

        const isWeekOnePrebuilt = entry.week === 1 && !rawAudio;
        const defaultScript = getFallbackPodcastScript(entry, responses);
        setPodcastData({
          week: entry.week,
          title: `Week ${entry.week}: ${entry.theme} — Sacred Steps Podcast`,
          script: defaultScript,
          summary: `Weekly companion devotional reflection for Week ${entry.week}: ${entry.theme}`,
          audioBase64: isRawTone ? '' : (rawAudio || ''),
          audioUrl: isWeekOnePrebuilt ? '/audio/week1-terrell.mp3' : undefined,
          audioProvider: isRawTone ? 'speech_synthesis' : (rawAudio || isWeekOnePrebuilt ? 'murf' : 'speech_synthesis'),
          audioVoiceId: 'en-US-terrell',
          audioVoiceName: 'Terrell (Murf AI Studio)',
          duration: isWeekOnePrebuilt ? 282 : 280,
          wordCount: 620,
          webInsightSnippet: 'Modern addiction science and neuroscience demonstrate that intentional gratitude and spiritual reflection reduce amygdala stress reactivity and rebuild neural pathways of resilience.',
          webSources: [
            { title: `${entry.theme} & Christian Recovery Principles`, uri: 'https://christianrecovery.com' },
            { title: `Scripture Reflection: ${entry.bibleVerse}`, uri: 'https://biblegateway.com' },
            { title: 'The Neuroscience of Gratitude and Recovery Pathways', uri: 'https://ncbi.nlm.nih.gov/pmc/articles/PMC6648719/' }
          ],
          searchQueries: [`${entry.theme} recovery faith`, `${entry.bibleVerse} study`, `gratitude neuroscience addiction`],
        });
      } catch (err) {
        console.warn('Could not load podcast metadata for week:', err);
      }
    };

    loadWeekMetadata();

    return () => {
      isMounted = false;
      stopSpeech();
    };
  }, [entry.week, podcastAudio, stopSpeech]);

  // Auto-scroll transcript container to active sentence
  useEffect(() => {
    if (autoScrollTranscript && activeSentenceRef.current && transcriptContainerRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentSentenceIndex, autoScrollTranscript]);

  // Core speech synthesis reader for sequential sentences (fallback when audio element is idle)
  const speakSentence = useCallback((index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Audio speech synthesis is not supported in this browser.', 'error');
      return;
    }

    if (index < 0 || index >= sentences.length) {
      stopSpeech();
      setCurrentSentenceIndex(0);
      setCurrentTime(0);
      onShowToast(`Completed Week ${entry.week} devotional podcast reflection.`, 'info');
      return;
    }

    const item = sentences[index];
    setCurrentSentenceIndex(index);
    sentenceIndexRef.current = index;
    setCurrentTime(item.startTime);

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const cleanText = item.text
      .replace(/\[.*?\]/g, '')
      .replace(/[*#_]/g, '')
      .replace(/^\d+\.\s*/, '')
      .trim();

    if (!cleanText) {
      if (index + 1 < sentences.length) {
        speakSentence(index + 1);
      } else {
        stopSpeech();
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const chosenVoice = selectVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
    utterance.rate = rateRef.current;
    utterance.volume = isMutedRef.current ? 0 : volumeRef.current;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsPlaying(true);
    };

    utterance.onend = () => {
      if (!isSpeakingRef.current) return;
      const nextIndex = index + 1;
      if (nextIndex < sentences.length) {
        speakSentence(nextIndex);
      } else {
        stopSpeech();
        setCurrentSentenceIndex(0);
        setCurrentTime(0);
        onShowToast(`Finished Week ${entry.week} podcast.`, 'info');
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis event notice:', e);
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (isSpeakingRef.current && index + 1 < sentences.length) {
        setTimeout(() => speakSentence(index + 1), 100);
      } else {
        stopSpeech();
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to trigger speech synthesis:', err);
      stopSpeech();
    }
  }, [sentences, selectVoice, stopSpeech, onShowToast, entry.week]);

  // Timer updater while speech synthesis is active (when not using HTMLAudio)
  useEffect(() => {
    if (isPlaying && (!studioAudioSrc || audioRef.current?.paused)) {
      timerIntervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying, studioAudioSrc, totalDuration]);

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      stopSpeech();
      setIsPlaying(false);
    } else {
      // If studio audio is present, play it
      if (studioAudioSrc && audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('HTML audio playback error:', err);
            setIsPlaying(false);
            onShowToast('Tap play again to start audio playback.', 'info');
          });
      } else {
        // Automatically synthesize with Murf AI so the user receives studio-quality audio!
        handleSynthesizeWithMurf();
      }
    }
  };

  // Click specific sentence to read from there
  const handleSentenceClick = (idx: number) => {
    const targetSentence = sentences[idx];
    if (!targetSentence) return;
    setCurrentSentenceIndex(idx);
    setCurrentTime(targetSentence.startTime);

    if (studioAudioSrc && audioRef.current) {
      audioRef.current.currentTime = targetSentence.startTime;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Audio seek playback notice:', err);
        });
    } else {
      handleSynthesizeWithMurf();
    }
  };

  // Rewind: skip back 15s or 2 sentences
  const handleSkipBack = () => {
    const targetTime = Math.max(0, currentTime - 15);
    setCurrentTime(targetTime);

    if (studioAudioSrc && audioRef.current) {
      audioRef.current.currentTime = targetTime;
    } else {
      const target = Math.max(0, currentSentenceIndex - 2);
      if (isPlaying) {
        speakSentence(target);
      } else {
        setCurrentSentenceIndex(target);
        setCurrentTime(sentences[target]?.startTime || 0);
      }
    }
  };

  // Forward: skip ahead 15s or 2 sentences
  const handleSkipForward = () => {
    const targetTime = Math.min(totalDuration, currentTime + 15);
    setCurrentTime(targetTime);

    if (studioAudioSrc && audioRef.current) {
      audioRef.current.currentTime = targetTime;
    } else {
      const target = Math.min(sentences.length - 1, currentSentenceIndex + 2);
      if (isPlaying) {
        speakSentence(target);
      } else {
        setCurrentSentenceIndex(target);
        setCurrentTime(sentences[target]?.startTime || 0);
      }
    }
  };

  // Scrubber change
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    let targetIdx = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].startTime <= targetTime) {
        targetIdx = i;
      } else {
        break;
      }
    }
    setCurrentSentenceIndex(targetIdx);

    if (studioAudioSrc && audioRef.current) {
      audioRef.current.currentTime = targetTime;
    } else if (isPlaying) {
      speakSentence(targetIdx);
    }
  };

  // Playback speed cycle
  const handleRateChange = () => {
    const rates = [1.0, 1.25, 1.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    rateRef.current = nextRate;

    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    if (isPlaying && isSpeakingRef.current) {
      speakSentence(currentSentenceIndex);
    }
  };

  // Mute toggle
  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    if (isPlaying && isSpeakingRef.current) {
      speakSentence(currentSentenceIndex);
    }
  };

  // Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(false);
    volumeRef.current = newVol;
    isMutedRef.current = false;
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = false;
    }
  };

  // One-click Murf AI Studio Synthesis for active script & selected voice
  const handleSynthesizeWithMurf = async (voiceIdToUse?: string) => {
    stopSpeech();
    setIsLoadingAudio(true);
    const vId = voiceIdToUse || selectedVoiceId;
    const chosenVoiceObj = CURATED_MURF_VOICES.find(v => v.id === vId) || CURATED_MURF_VOICES[0];
    onShowToast(`Synthesizing studio episode with Murf AI (${chosenVoiceObj.name})...`, 'info');

    try {
      const murfRes = await generateSpeechWithMurf(activeScript, chosenVoiceObj.id, chosenVoiceObj.recommendedStyle);
      const newMeta: WeeklyPodcastData = {
        week: entry.week,
        title: podcastData?.title || `Week ${entry.week}: ${entry.theme} — Sacred Steps Podcast`,
        script: activeScript,
        summary: podcastData?.summary || `Weekly companion devotional reflection for Week ${entry.week}: ${entry.theme}`,
        audioBase64: murfRes.audioBase64 || '',
        audioUrl: murfRes.audioUrl,
        audioVoiceId: chosenVoiceObj.id,
        audioVoiceName: `${chosenVoiceObj.name} (Murf AI Studio)`,
        audioProvider: 'murf',
        wordCount: wordCount,
        webInsightSnippet: podcastData?.webInsightSnippet,
        webSources: podcastData?.webSources,
        searchQueries: podcastData?.searchQueries,
        duration: murfRes.duration || 160,
        generatedAt: new Date().toISOString(),
      };

      if (murfRes.audioBase64) {
        await savePodcast(entry.week, murfRes.audioBase64);
      }
      await savePodcastMetadata(entry.week, newMeta);

      setPodcastData(newMeta);
      setCurrentSentenceIndex(0);
      setCurrentTime(0);
      onShowToast(`Murf AI studio audio ready (${chosenVoiceObj.name})!`, 'success');

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch((err) => {
            console.warn('Playback error after synthesis:', err);
          });
        }
      }, 300);
    } catch (err) {
      console.error('Murf AI synthesis error:', err);
      const msg = err instanceof Error ? err.message : 'Murf AI synthesis failed.';
      onShowToast(msg, 'error');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Play quick browser voice preview (synthetic fallback)
  const handlePlayBrowserVoicePreview = () => {
    if (isPlaying) {
      stopSpeech();
      return;
    }
    isSpeakingRef.current = true;
    setIsPlaying(true);
    speakSentence(currentSentenceIndex);
    onShowToast('Playing quick browser voice preview.', 'info');
  };

  // Re-scan web and regenerate podcast using Master Podcast Prompt & Murf AI
  const handleReScanWebAndGenerate = async () => {
    stopSpeech();
    setIsLoadingAudio(true);
    const chosenVoiceObj = CURATED_MURF_VOICES.find(v => v.id === selectedVoiceId) || CURATED_MURF_VOICES[0];
    onShowToast(`Scanning web for "${entry.theme}" recovery insights & crafting Murf Studio episode (${chosenVoiceObj.name})...`, 'info');

    try {
      const result = await generateWeeklyPodcastWithWebScan(entry, responses, selectedVoiceId);
      const newMeta: WeeklyPodcastData = {
        week: entry.week,
        title: result.title,
        script: result.script,
        summary: result.summary,
        audioBase64: result.audioBase64,
        audioUrl: result.audioUrl,
        audioVoiceId: result.audioVoiceId,
        audioVoiceName: result.audioVoiceName,
        audioProvider: result.audioProvider,
        wordCount: result.wordCount,
        webInsightSnippet: result.webInsightSnippet,
        webSources: result.webSources,
        searchQueries: result.searchQueries,
        duration: result.duration || 240,
        generatedAt: new Date().toISOString(),
      };

      await savePodcast(entry.week, result.audioBase64);
      await savePodcastMetadata(entry.week, newMeta);

      setPodcastData(newMeta);
      setCurrentSentenceIndex(0);
      setCurrentTime(0);
      onShowToast(`Week ${entry.week} studio episode ready (${result.audioVoiceName || 'Murf AI Studio'})!`, 'success');

      // Auto-start playback of the studio MP3
      setTimeout(() => {
        if (audioRef.current && (result.audioUrl || result.audioBase64)) {
          audioRef.current.currentTime = 0;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch((playErr) => {
            console.warn('Autoplay prevented or delayed:', playErr);
            setIsPlaying(false);
            onShowToast(`Studio episode ready! Tap Play to listen.`, 'success');
          });
        }
      }, 400);
    } catch (err) {
      console.error('Failed to regenerate podcast:', err);
      const msg = err instanceof Error ? err.message : 'Failed to scan and generate podcast.';
      onShowToast(msg, 'error');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Copy full transcript to clipboard
  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(activeScript);
    onShowToast('Full spoken transcript copied to clipboard!', 'success');
  };

  // Download transcript as text file
  const handleDownloadTranscript = () => {
    const blob = new Blob([activeScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SacredSteps_Week_${entry.week}_${entry.theme.replace(/\s+/g, '_')}_Transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast(`Downloaded Week ${entry.week} transcript.`, 'info');
  };

  // Download podcast audio file (MP3 / WAV)
  const handleDownloadAudio = () => {
    if (podcastData?.audioUrl) {
      const a = document.createElement('a');
      a.href = podcastData.audioUrl;
      a.download = `SacredSteps_Week_${entry.week}_${entry.theme.replace(/\s+/g, '_')}_MurfStudio.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onShowToast(`Downloading Week ${entry.week} studio audio MP3...`, 'success');
      return;
    }
    if (podcastData?.audioBase64) {
      const blob = base64ToWavBlob(podcastData.audioBase64);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SacredSteps_Week_${entry.week}_${entry.theme.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`Downloading Week ${entry.week} audio...`, 'info');
      return;
    }
    onShowToast('Audio file is not yet generated. Tap "Generate Studio Episode" first.', 'info');
  };

  const isWorking = isLoadingAudio || isGeneratingPodcast;

  return (
    <div
      id={`weekly-podcast-card-week-${entry.week}`}
      className="bg-card border border-default rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
      {/* Hidden audio element for high fidelity Murf AI studio playback */}
      <audio ref={audioRef} src={studioAudioSrc || undefined} preload="metadata" />

      {/* Card Header */}
      <div className="bg-gradient-to-r from-[#111C28] via-[#1C2A39] to-[#243547] text-white p-5 sm:p-6 border-b border-[#D4AF37]/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <span className="p-2.5 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shadow-inner">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight">
                Sacred Steps: Week {entry.week} — {entry.theme}
              </h3>
              <p className="text-xs sm:text-sm text-[#D4AF37]/90 mt-0.5 font-sans">
                Devotional Audio Reflection &bull; {entry.bibleVerse}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id={`podcast-download-header-btn-week-${entry.week}`}
              onClick={() => setActiveTab('download')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer ${
                activeTab === 'download'
                  ? 'bg-[#D4AF37] text-[#111C28] font-bold shadow'
                  : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30'
              }`}
              title="Open Download Audio Tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation: Audio Player vs Download Audio */}
      <div className="flex border-b border-default bg-card-secondary/60 px-4 sm:px-6">
        <button
          id={`podcast-tab-player-week-${entry.week}`}
          onClick={() => setActiveTab('player')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'player'
              ? 'border-[#D4AF37] text-main font-bold bg-card'
              : 'border-transparent text-muted hover:text-main hover:bg-card/50'
          }`}
        >
          <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>Audio Player</span>
        </button>

        <button
          id={`podcast-tab-download-week-${entry.week}`}
          onClick={() => setActiveTab('download')}
          className={`flex items-center space-x-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'download'
              ? 'border-[#D4AF37] text-main font-bold bg-card'
              : 'border-transparent text-muted hover:text-main hover:bg-card/50'
          }`}
        >
          <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download Audio</span>
          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
            MP3
          </span>
        </button>
      </div>

      {activeTab === 'download' ? (
        /* ========================================================================= */
        /* DOWNLOAD AUDIO TAB                                                        */
        /* ========================================================================= */
        <div className="p-5 sm:p-6 space-y-6 bg-card animate-fade-in">
          {/* Episode Info Banner */}
          <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-[#1C2A39] via-[#16222e] to-[#111C28] text-white border border-[#D4AF37]/30 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                    Week {entry.week} Audio Episode
                  </span>
                  <h4 className="text-lg sm:text-xl font-serif font-bold text-white">
                    {entry.theme} &bull; Devotional Podcast
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5">
                    Scriptural Anchor: {entry.bibleVerse}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  MP3 Audio Ready
                </span>
              </div>
            </div>

            {/* Episode Audio Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-white/60 block text-[10px] uppercase tracking-wider">Duration</span>
                <span className="font-semibold text-white text-sm mt-0.5 block">{formatTime(totalDuration)}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-white/60 block text-[10px] uppercase tracking-wider">Audio Format</span>
                <span className="font-semibold text-white text-sm mt-0.5 block">MP3 &bull; 44.1 kHz</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-white/60 block text-[10px] uppercase tracking-wider">Voice Narration</span>
                <span className="font-semibold text-white text-sm mt-0.5 block truncate">
                  {podcastData?.audioVoiceName || 'Terrell (Murf Studio)'}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-white/60 block text-[10px] uppercase tracking-wider">Word Count</span>
                <span className="font-semibold text-white text-sm mt-0.5 block">{wordCount} words</span>
              </div>
            </div>
          </div>

          {/* Download Action Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Download Audio File (MP3) */}
            <div className="p-5 rounded-xl bg-card-secondary border border-default shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-primary font-bold text-sm mb-1.5">
                  <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-main">Download Podcast Audio (MP3)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Download the full, high-fidelity spoken devotional audio file directly to your smartphone, tablet, or computer for offline listening.
                </p>
              </div>

              <button
                id={`podcast-download-tab-audio-btn-week-${entry.week}`}
                onClick={handleDownloadAudio}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E6CA65] text-[#111C28] font-bold text-sm shadow hover:brightness-105 transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Audio (MP3)</span>
              </button>
            </div>

            {/* Download Devotional Script / Transcript */}
            <div className="p-5 rounded-xl bg-card-secondary border border-default shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-primary font-bold text-sm mb-1.5">
                  <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-main">Download Spoken Transcript (TXT)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Export the word-for-word transcript including the complete devotional message, scripture anchor, and closing prayer.
                </p>
              </div>

              <button
                id={`podcast-download-tab-transcript-btn-week-${entry.week}`}
                onClick={handleDownloadTranscript}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-card border border-default hover:bg-card-secondary text-main font-semibold text-sm shadow transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Transcript (TXT)</span>
              </button>
            </div>
          </div>

          {/* Quick Audio Preview in Download Tab */}
          <div className="p-4 rounded-xl bg-card-secondary border border-default flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleTogglePlay}
                disabled={isWorking}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-[#1C2A39] text-[#D4AF37] hover:bg-[#16222e] border border-[#D4AF37]/40 shadow flex-shrink-0 cursor-pointer"
                title={isPlaying ? "Pause Preview" : "Play Preview"}
                aria-label={isPlaying ? "Pause Preview" : "Play Preview"}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div>
                <p className="text-xs font-semibold text-main">
                  Preview Audio &bull; Week {entry.week}: {entry.theme}
                </p>
                <p className="text-[11px] text-muted">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={() => setActiveTab('player')}
                className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Switch to Full Player &amp; Transcript</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Offline Listening Tips */}
          <div className="p-4 rounded-xl bg-card-secondary/70 border border-default text-xs text-muted space-y-1.5">
            <p className="font-semibold text-main flex items-center space-x-1.5">
              <span>💡</span>
              <span>Offline Listening Instructions</span>
            </p>
            <p className="leading-relaxed">
              Once downloaded, you can import this standard MP3 audio file into Apple Podcasts, Spotify (under Local Files), Google Drive, or your smartphone's default music player. Perfect for listening during morning walks, daily commutes, or step-work sessions without an internet connection.
            </p>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* AUDIO PLAYER TAB                                                          */
        /* ========================================================================= */
        <div className="p-5 sm:p-6 space-y-5 bg-card">
        {/* Playback Control Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card-secondary border border-default shadow-sm">
          <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start">
            {/* Rewind Button (15s) */}
            <button
              id={`podcast-rewind-week-${entry.week}`}
              onClick={handleSkipBack}
              disabled={isWorking}
              title="Rewind 15 seconds"
              aria-label="Rewind 15 seconds"
              className="p-2 text-muted hover:text-main transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Primary Play/Pause Button */}
            <button
              id={`podcast-play-btn-week-${entry.week}`}
              onClick={handleTogglePlay}
              disabled={isWorking}
              className={`relative flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg transition-all duration-300 transform active:scale-95 ${
                isPlaying
                  ? 'bg-[#1C2A39] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[#D4AF37]/25 hover:bg-[#16222e]'
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#E6CA65] text-[#111C28] hover:brightness-105 border border-[#D4AF37] shadow-md'
              } disabled:opacity-60 disabled:cursor-wait`}
              aria-label={
                isWorking
                  ? 'Preparing devotional audio...'
                  : isPlaying
                  ? 'Pause audio reflection'
                  : 'Play audio reflection'
              }
            >
              {isWorking ? (
                <svg className="animate-spin h-7 w-7 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isPlaying ? (
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Fast-Forward Button (15s) */}
            <button
              id={`podcast-forward-week-${entry.week}`}
              onClick={handleSkipForward}
              disabled={isWorking}
              title="Fast Forward 15 seconds"
              aria-label="Fast forward 15 seconds"
              className="p-2 text-muted hover:text-main transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>
          </div>

          {/* Episode Info & Clean Status */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="font-semibold text-main text-sm sm:text-base truncate">
                {entry.theme} &bull; Week {entry.week}
              </span>
              {isPlaying && (
                <span className="inline-flex items-center space-x-1 text-xs text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  <span className="w-1 h-3 bg-[#D4AF37] animate-pulse rounded-full"></span>
                  <span className="w-1 h-5 bg-[#D4AF37] animate-pulse delay-75 rounded-full"></span>
                  <span className="w-1 h-2 bg-[#D4AF37] animate-pulse delay-150 rounded-full"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider ml-1">
                    Playing
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-1 truncate">
              {isWorking
                ? 'Preparing devotional audio reflection...'
                : isPlaying
                ? `Reading segment ${currentSentenceIndex + 1} of ${sentences.length}`
                : 'Press play to listen'}
            </p>
          </div>

          {/* Speed & Volume */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-end">
            <button
              id={`podcast-speed-btn-week-${entry.week}`}
              onClick={handleRateChange}
              title="Change playback speed"
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-card border border-default hover:bg-card-secondary transition-colors text-main"
            >
              {playbackRate}x
            </button>

            <div className="flex items-center space-x-1.5">
              <button
                id={`podcast-mute-btn-week-${entry.week}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="p-1.5 text-muted hover:text-main transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <input
                id={`podcast-volume-slider-week-${entry.week}`}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume slider"
                className="w-16 sm:w-20 h-1.5 bg-input rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <input
              id={`podcast-scrubber-week-${entry.week}`}
              type="range"
              min="0"
              max={totalDuration}
              step="1"
              value={currentTime}
              onChange={handleScrub}
              disabled={isWorking}
              aria-label="Audio scrubber"
              className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-[#D4AF37] focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center text-xs text-muted font-mono">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[11px] text-muted font-sans">
              Segment {currentSentenceIndex + 1} / {sentences.length}
            </span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Devotional Reading Header */}
        <div className="flex items-center justify-between border-b border-default pb-2">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-main font-sans">
              Devotional Reflection Transcript
            </h4>
          </div>

          <div className="flex items-center space-x-2">
            <label className="hidden sm:flex items-center space-x-1.5 text-[11px] text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScrollTranscript}
                onChange={(e) => setAutoScrollTranscript(e.target.checked)}
                className="rounded border-default text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37] cursor-pointer"
              />
              <span>Auto-scroll</span>
            </label>

            <button
              onClick={handleCopyTranscript}
              title="Copy transcript"
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-card-secondary border border-default hover:bg-card text-main transition-colors flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Read-Along Transcript */}
        <div className="border border-default rounded-xl bg-card-secondary overflow-hidden shadow-inner">
          <div
            ref={transcriptContainerRef}
            className="p-4 sm:p-5 max-h-72 sm:max-h-80 overflow-y-auto space-y-2 text-sm leading-relaxed font-serif text-main select-text"
            tabIndex={0}
            aria-label="Devotional Transcript"
          >
            {sentences.map((item, idx) => {
              const isActive = idx === currentSentenceIndex;
              return (
                <div
                  key={item.id}
                  ref={isActive ? activeSentenceRef : null}
                  onClick={() => handleSentenceClick(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSentenceClick(idx);
                    }
                  }}
                  className={`p-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive && isPlaying
                      ? 'bg-[#D4AF37]/20 border-l-4 border-[#D4AF37] text-main font-semibold shadow-sm transform scale-[1.01]'
                      : isActive
                      ? 'bg-card border-l-4 border-[#D4AF37]/60 text-main font-medium shadow-sm'
                      : 'hover:bg-card/70 text-muted hover:text-main'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-[10px] font-mono text-muted/70 flex-shrink-0 mt-0.5 select-none w-5">
                      {idx + 1}.
                    </span>
                    <p className="flex-1">
                      {item.text}
                    </p>
                    {isActive && isPlaying && (
                      <span className="flex-shrink-0 text-[#D4AF37] mt-0.5 ml-1 animate-pulse">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Strip: Clean & Simplified */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-default">
          <div className="flex items-center gap-2">
            <button
              id={`podcast-download-btn-week-${entry.week}`}
              onClick={handleDownloadTranscript}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card-secondary border border-default hover:bg-card text-main transition-colors"
              title="Download full devotional transcript"
            >
              <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Transcript</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id={`podcast-reset-audio-btn-week-${entry.week}`}
              onClick={async () => {
                stopSpeech();
                await deletePodcast(entry.week);
                if (podcastData) {
                  const updated: WeeklyPodcastData = {
                    ...podcastData,
                    audioBase64: '',
                    audioUrl: undefined,
                    audioProvider: 'speech_synthesis',
                  };
                  setPodcastData(updated);
                  await savePodcastMetadata(entry.week, updated);
                }
                onShowToast(`Reset devotional audio for Week ${entry.week}.`, 'info');
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-muted hover:text-amber-400 hover:bg-card-secondary transition-colors"
              title="Reset audio for this week"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Reset Audio</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
