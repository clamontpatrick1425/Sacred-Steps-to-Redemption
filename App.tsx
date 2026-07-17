
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateJournalContent, generateReflectiveImage, generateSongLyrics, generatePodcastScript, generateSpeech, getFallbackRecoveryImage } from './services/geminiService';
import type { WeeklyTheme, SavedEntries, JournalResponses, UndoAction, GratitudeEntry, ToastMessage, AppTheme, AppFontSize, SavedLyrics, SavedPodcasts } from './types';
import { Header } from './components/Header';
import { JournalEntry } from './components/JournalEntry';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { ProgressTracker } from './components/ProgressTracker';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { EnhancedWeekNavigator } from './components/EnhancedWeekNavigator';
import { UndoToast } from './components/UndoToast';
import { VerseFinder } from './components/VerseFinder';
import { GratitudeJar } from './components/GratitudeJar';
import { GratitudeReminder } from './components/GratitudeReminder';
import { GratitudeWordCloud } from './components/GratitudeWordCloud';
import { MilestoneCard } from './components/MilestoneCard';
import { NotificationToast } from './components/NotificationToast';
import { SettingsModal } from './components/SettingsModal';
import { StreakTracker } from './components/StreakTracker';
import { InteractiveParable } from './components/InteractiveParable';
import { ParablePlayerModal } from './components/ParablePlayerModal';
import { AuthModal } from './components/AuthModal';
import { PinLock } from './components/PinLock';
import { SOSModal } from './components/SOSModal';
import { TriggerTracker } from './components/TriggerTracker';
import { MoodTracker } from './components/MoodTracker';
import { MeditationTimer } from './components/MeditationTimer';
import { RedemptionDashboard } from './components/RedemptionDashboard';
import { RecoverySEOFAQSection } from './components/RecoverySEOFAQSection';
import { auth, onAuthStateChanged, signOut } from './firebase';
import { syncJournalEntries, syncUserProfile, saveJournalDocToCloud } from './utils/syncHelper';
import { getAllPodcasts, savePodcast } from './utils/podcastDb';

const MILESTONES = [4, 13, 26, 52];

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1877F2" className="h-12 w-12">
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
  </svg>
);

const YouTubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FF0000" className="h-12 w-12">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12">
    <defs>
      <radialGradient id="ig-grad" cx="0.3" cy="1" r="1">
        <stop offset="0" stopColor="#FFDC80" />
        <stop offset="0.5" stopColor="#F77737" />
        <stop offset="1" stopColor="#C13584" />
      </radialGradient>
    </defs>
    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.058 1.644.07 4.85.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689-.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);


const App: React.FC = () => {
  const [themes, setThemes] = useState<WeeklyTheme[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastChange, setLastChange] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const hasSyncedRef = useRef<string | null>(null);
  const [randomGratitude, setRandomGratitude] = useState<GratitudeEntry | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // New states for personalization and focus mode
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => {
    const savedTheme = localStorage.getItem('appTheme') as AppTheme | null;
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'sky';
  });
  const [fontSize, setFontSize] = useState<AppFontSize>('base');
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Auth State
  const [user, setUser] = useState<{ name: string; email: string; uid?: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // New Feature States
  const [isPinLockOpen, setIsPinLockOpen] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isTriggerTrackerOpen, setIsTriggerTrackerOpen] = useState(false);

  // AI Feature States
  const [generatingImageForWeek, setGeneratingImageForWeek] = useState<number | null>(null);
  const [isParableModalOpen, setIsParableModalOpen] = useState(false);
  const [isGeneratingLyricsForWeek, setIsGeneratingLyricsForWeek] = useState<number | null>(null);
  const [isGeneratingPodcastForWeek, setIsGeneratingPodcastForWeek] = useState<number | null>(null);


  // Fix: Safely parse data from localStorage to avoid type errors with `JSON.parse`.
  const [savedEntries, setSavedEntries] = useState<SavedEntries>(() => {
    try {
      const storedEntries = localStorage.getItem('journalEntries');
      if (storedEntries) {
        const parsed = JSON.parse(storedEntries);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.error("Failed to parse journal entries from localStorage", e);
      return {};
    }
  });
  
  const [generatedImages, setGeneratedImages] = useState<{ [week: number]: string }>(() => {
    try {
        const storedImages = localStorage.getItem('generatedImages');
        if (storedImages) {
          const parsed = JSON.parse(storedImages);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
          }
        }
        return {};
    } catch(e) {
        console.error("Failed to parse generated images from localStorage", e);
        return {};
    }
  });


  // Fix: Safely parse data from localStorage to avoid type errors with `JSON.parse`.
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>(() => {
    try {
        const storedGratitude = localStorage.getItem('gratitudeEntries');
        if (storedGratitude) {
          const parsed = JSON.parse(storedGratitude);
          if (Array.isArray(parsed) && parsed.every(item => item && typeof item.id === 'number' && typeof item.text === 'string')) {
            return parsed;
          }
        }
        return [];
    } catch (e) {
        console.error("Failed to parse gratitude entries from localStorage", e);
        return [];
    }
  });
  
  const [savedLyrics, setSavedLyrics] = useState<SavedLyrics>(() => {
    try {
      const storedLyrics = localStorage.getItem('savedLyrics');
      if (storedLyrics) {
        const parsed = JSON.parse(storedLyrics);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.error("Failed to parse saved lyrics from localStorage", e);
      return {};
    }
  });

  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcasts>({});

  useEffect(() => {
    let active = true;
    const initPodcastsStore = async () => {
      try {
        const storedPodcasts = localStorage.getItem('savedPodcasts');
        if (storedPodcasts) {
          try {
            const parsed = JSON.parse(storedPodcasts);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              for (const [weekKey, base64Audio] of Object.entries(parsed)) {
                if (base64Audio && typeof base64Audio === 'string') {
                  await savePodcast(Number(weekKey), base64Audio);
                }
              }
            }
          } catch (migrationErr) {
            console.error("Error migrating podcasts from localStorage to IndexedDB:", migrationErr);
          }
          localStorage.removeItem('savedPodcasts');
        }

        const loadedPodcasts = await getAllPodcasts();
        if (active) {
          setSavedPodcasts(loadedPodcasts);
        }
      } catch (err) {
        console.error("Exception in initPodcastsStore IndexedDB:", err);
      }
    };
    initPodcastsStore();
    return () => {
      active = false;
    };
  }, []);


  // Fix: Safely parse data from localStorage to avoid type errors with `JSON.parse`.
  const [completedMilestones, setCompletedMilestones] = useState<number[]>(() => {
    try {
        const stored = localStorage.getItem('completedMilestones');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'number')) {
                return parsed;
            }
        }
        return [];
    } catch (e) {
        console.error("Failed to parse completed milestones from localStorage", e);
        return [];
    }
  });

  // Load and apply settings from localStorage on initial load
  useEffect(() => {
    const savedFontSize = localStorage.getItem('appFontSize') as AppFontSize | null;
    if (savedFontSize) setFontSize(savedFontSize);

    const savedPin = localStorage.getItem('privacyPin');
    if (savedPin) {
      setIsPinLockOpen(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const u = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          uid: firebaseUser.uid
        };
        setUser(u);

        if (hasSyncedRef.current !== firebaseUser.uid) {
          hasSyncedRef.current = firebaseUser.uid;
          setIsSyncing(true);
          try {
            // Two-way user profile sync
            await syncUserProfile(
              firebaseUser.uid,
              u.email,
              u.name,
              localStorage.getItem('privacyPin'),
              (pin) => {
                if (pin) {
                  setIsPinLockOpen(true);
                }
              }
            );

            // Two-way journal entry sync
            await syncJournalEntries(firebaseUser.uid, savedEntries, (merged) => {
              setSavedEntries(merged);
            });

            showToast(`Welcome ${u.name}! Your journey statistics have been compiled and secured on the cloud.`, 'success');
          } catch (err) {
            console.error("Failed to sync profile and journals with cloud database:", err);
            showToast("Cloud connection is running in offline mode. Local copies are active.", 'info');
          } finally {
            setIsSyncing(false);
          }
        }
      } else {
        setUser(null);
        hasSyncedRef.current = null;
        setIsDashboardOpen(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [savedEntries]);

  // Effect to save and apply theme
  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Clean up old attribute for consistency
    root.removeAttribute('data-theme');
  }, [theme]);

  // Effect to save and apply font size
  useEffect(() => {
    localStorage.setItem('appFontSize', fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);


  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('journalEntries', JSON.stringify(savedEntries));
    }, 1000);
    return () => clearTimeout(timer);
  }, [savedEntries]);

  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('generatedImages', JSON.stringify(generatedImages));
    }, 1000);
    return () => clearTimeout(timer);
  }, [generatedImages]);

  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('gratitudeEntries', JSON.stringify(gratitudeEntries));
    }, 1000);
    return () => clearTimeout(timer);
  }, [gratitudeEntries]);


  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('completedMilestones', JSON.stringify(completedMilestones));
    }, 1000);
    return () => clearTimeout(timer);
  }, [completedMilestones]);

  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('savedLyrics', JSON.stringify(savedLyrics));
    }, 1000);
    return () => clearTimeout(timer);
  }, [savedLyrics]);


  const loadJournalContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cachedThemes = localStorage.getItem('journalThemes_v3');
      if (cachedThemes) {
        setThemes(JSON.parse(cachedThemes));
        setIsLoading(false);
        return;
      }

      const content = await generateJournalContent();
      setThemes(content);
      localStorage.setItem('journalThemes_v3', JSON.stringify(content));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while loading journal content. Please check your connection and API key.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournalContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
    }, 5000);
  }, []);

  const handleLogin = (loggedInUser: { name: string; email: string }) => {
    showToast(`Welcome back, ${loggedInUser.name}!`, 'success');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("You have been logged out.", 'info');
    } catch (err) {
      showToast("Failed to log out.", 'error');
    }
  };


  const handleWeekChange = (newWeek: number) => {
    setCurrentWeek(newWeek);
  };
  
  const handleResponseChange = (week: number, field: keyof JournalResponses, value: string) => {
    if (!undoTimerRef.current) {
      const previousValue = savedEntries[week]?.[field] || '';
      setLastChange({
        week,
        field,
        previousValue,
      });
    }

    const updatedWeekResponses = {
      ...savedEntries[week],
      [field]: value
    };

    setSavedEntries(prev => ({
      ...prev,
      [week]: updatedWeekResponses
    }));

    if (auth.currentUser) {
      saveJournalDocToCloud(auth.currentUser.uid, week, updatedWeekResponses).catch((err) => {
        console.error("Cloud write failed during response change:", err);
      });
    }
    
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    undoTimerRef.current = window.setTimeout(() => {
      setLastChange(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (!lastChange) return;

    const { week, field, previousValue } = lastChange;

    const updatedWeekResponses = {
      ...savedEntries[week],
      [field]: previousValue,
    };

    setSavedEntries(prev => ({
      ...prev,
      [week]: updatedWeekResponses,
    }));

    if (auth.currentUser) {
      saveJournalDocToCloud(auth.currentUser.uid, week, updatedWeekResponses).catch((err) => {
        console.error("Cloud write failed during undo:", err);
      });
    }

    setLastChange(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };


  const handleAddGratitude = (text: string) => {
      if (!text.trim()) return;
      const newEntry: GratitudeEntry = { id: Date.now(), text: text.trim() };
      setGratitudeEntries(prev => [...prev, newEntry]);
  };

  const handleDeleteGratitude = (id: number) => {
      setGratitudeEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const pickRandomGratitude = useCallback(() => {
    if (gratitudeEntries.length === 0) {
        setRandomGratitude(null);
        return;
    }
    const randomIndex = Math.floor(Math.random() * gratitudeEntries.length);
    setRandomGratitude(gratitudeEntries[randomIndex]);
  }, [gratitudeEntries]);

  useEffect(() => {
    pickRandomGratitude();
  }, [gratitudeEntries, currentWeek, pickRandomGratitude]);

  const handleMilestoneSummaryGenerated = (milestone: number) => {
    setCompletedMilestones(prev => [...new Set([...prev, milestone])]);
  };
  
  const handleGenerateImage = async (week: number, promptText: string) => {
    setGeneratingImageForWeek(week);
    try {
        const imageUrl = await generateReflectiveImage(promptText, week);
        setGeneratedImages(prev => ({ ...prev, [week]: imageUrl }));
    } catch(err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        if (message.includes("403") || message.includes("permission") || message.includes("API_KEY") || message.includes("unauthorized") || message.includes("Failed to generate")) {
            const fallbackUrl = getFallbackRecoveryImage(week);
            setGeneratedImages(prev => ({ ...prev, [week]: fallbackUrl }));
            showToast("Custom AI generation requires a billing-enabled key in Settings > Secrets. Loaded a beautiful curated recovery landscape for you instead!", "info");
        } else {
            showToast(message, 'error');
        }
    } finally {
        setGeneratingImageForWeek(null);
    }
  };

  const handleGenerateLyrics = async (week: number, theme: WeeklyTheme) => {
    if (savedLyrics[week]) {
        showToast("Lyrics have already been generated for this week.", "info");
        return;
    }
    setIsGeneratingLyricsForWeek(week);
    try {
        const result = await generateSongLyrics(theme.songTitle, theme);
        setSavedLyrics(prev => ({ ...prev, [week]: result }));
        showToast("Lyrics generated successfully!", "success");
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        showToast(message, 'error');
    } finally {
        setIsGeneratingLyricsForWeek(null);
    }
  };

  const handleGeneratePodcast = async (week: number, theme: WeeklyTheme) => {
    if (savedPodcasts[week]) {
        showToast("Podcast has already been generated for this week.", "info");
        return;
    }
    setIsGeneratingPodcastForWeek(week);
    try {
        const script = await generatePodcastScript(theme);
        const audio = await generateSpeech(script);
        await savePodcast(week, audio);
        setSavedPodcasts(prev => ({ ...prev, [week]: audio }));
        showToast("Your weekly podcast is ready!", "success");
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        showToast(message, 'error');
    } finally {
        setIsGeneratingPodcastForWeek(null);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return themes.filter(theme => {
      const responses = savedEntries[theme.week];
      const themeText = `${theme.theme} ${theme.prompt}`.toLowerCase();
      const responseText = `
        ${responses?.promptResponse || ''} 
        ${responses?.reflection1Response || ''} 
        ${responses?.reflection2Response || ''}
      `.toLowerCase();

      return themeText.includes(lowerCaseQuery) || responseText.includes(lowerCaseQuery);
    });
  }, [searchQuery, themes, savedEntries]);
  
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleResultClick = (week: number) => {
    setCurrentWeek(week);
    setSearchQuery('');
  };

  const selectedEntry = themes.find(theme => theme.week === currentWeek) || null;
  const currentResponses = savedEntries[currentWeek] || { promptResponse: '', reflection1Response: '', reflection2Response: ''};

  const completedWeeksSet = useMemo(() => {
    const set = new Set<number>();
     Object.entries(savedEntries).forEach(([week, entry]: [string, Partial<JournalResponses>]) => {
          if (entry && (
              (entry.promptResponse && entry.promptResponse.trim() !== '') ||
              (entry.reflection1Response && entry.reflection1Response.trim() !== '') ||
              (entry.reflection2Response && entry.reflection2Response.trim() !== '')
          )) {
              set.add(Number(week));
          }
      });
    return set;
  }, [savedEntries]);
  
  const completedWeeksCount = completedWeeksSet.size;

  const reflectionStreak = useMemo(() => {
    if (completedWeeksSet.size === 0) {
        return 0;
    }

    // Fix: Directly spread the Set into Math.max to avoid a potential type inference issue with an intermediate array.
    const mostRecentWeek = Math.max(...completedWeeksSet);

    let streak = 0;
    for (let i = mostRecentWeek; i > 0; i--) {
        if (completedWeeksSet.has(i)) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
  }, [completedWeeksSet]);


  const eligibleMilestone = useMemo(() => {
    const latestEligible = MILESTONES.filter(m => completedWeeksCount >= m).pop();
    if (latestEligible && !completedMilestones.includes(latestEligible)) {
        return latestEligible;
    }
    return null;
  }, [completedWeeksCount, completedMilestones]);

  const milestoneData = useMemo(() => {
    if (!eligibleMilestone) return null;

    const endWeek = eligibleMilestone;
    const previousMilestoneIndex = MILESTONES.indexOf(endWeek) - 1;
    const startWeek = previousMilestoneIndex >= 0 ? MILESTONES[previousMilestoneIndex] + 1 : 1;
    
    const themesForPeriod = themes.filter(theme => theme.week >= startWeek && theme.week <= endWeek);
    const entriesForPeriod: SavedEntries = {};
    for (let i = startWeek; i <= endWeek; i++) {
        if (savedEntries[i]) {
            entriesForPeriod[i] = savedEntries[i];
        }
    }

    return {
        themes: themesForPeriod,
        entries: entriesForPeriod,
    };
  }, [eligibleMilestone, themes, savedEntries]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    if (error) {
      return <ErrorMessage message={error} />;
    }
    if (themes.length > 0) {
      return (
        <div className="grid lg:grid-cols-12 gap-8">
          {!isFocusMode && (
            <aside className="lg:col-span-3 transition-all duration-300 ease-in-out">
               <div className="sticky top-8 space-y-4">
                  {user && (
                    <div className="p-4 bg-card rounded-lg border border-default shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">Account Database</span>
                        <span className="flex h-2 w-2 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-tight">
                        Signed in as <strong className="text-main">{user.name}</strong> • Live synchronization is active.
                      </p>
                      <button
                        onClick={() => setIsDashboardOpen(prev => !prev)}
                        className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md font-bold transition-all text-xs border cursor-pointer ${
                          isDashboardOpen 
                            ? 'bg-primary text-on-primary border-primary hover:bg-primary-hover shadow-sm' 
                            : 'bg-card-secondary border-default text-main hover:bg-primary-light hover:border-primary/20'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>{isDashboardOpen ? 'Go Back to Weekly Journal' : 'View Compiled Insights'}</span>
                      </button>
                    </div>
                  )}
                  <ProgressTracker 
                    completedWeeks={completedWeeksCount}
                    totalWeeks={themes.length || 52}
                  />
                  <StreakTracker streak={reflectionStreak} />
                  <MoodTracker />
                  <MeditationTimer />
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                  />
                  {searchQuery.trim() ? (
                     <SearchResults
                      results={searchResults}
                      searchQuery={searchQuery}
                      onResultClick={handleResultClick}
                    />
                  ) : (
                    <EnhancedWeekNavigator
                      totalWeeks={themes.length || 52}
                      currentWeek={currentWeek}
                      onWeekChange={handleWeekChange}
                      completedWeeksSet={completedWeeksSet}
                    />
                  )}
                  <GratitudeJar 
                      entries={gratitudeEntries}
                      onAdd={handleAddGratitude}
                      onDelete={handleDeleteGratitude}
                  />
                  <GratitudeWordCloud entries={gratitudeEntries} />
                  <VerseFinder />
                  <InteractiveParable onStart={() => setIsParableModalOpen(true)} />
               </div>
            </aside>
          )}
          <main className={`transition-all duration-300 ease-in-out ${isFocusMode ? 'lg:col-span-12' : 'lg:col-span-9'}`}>
             {isDashboardOpen && user ? (
               <RedemptionDashboard 
                 user={user}
                 savedEntries={savedEntries}
                 completedWeeksCount={completedWeeksCount}
                 reflectionStreak={reflectionStreak}
                 completedMilestones={completedMilestones}
                 gratitudeCount={gratitudeEntries.length}
                 totalWeeks={themes.length || 52}
                 onClose={() => setIsDashboardOpen(false)}
               />
             ) : (
               <>
                 {eligibleMilestone && !isFocusMode && milestoneData && (
                  <MilestoneCard
                    milestone={eligibleMilestone}
                    themes={milestoneData.themes}
                    savedEntries={milestoneData.entries}
                    gratitudeEntries={gratitudeEntries}
                    onSummaryGenerated={handleMilestoneSummaryGenerated}
                  />
                )}
                {!isFocusMode && <GratitudeReminder entry={randomGratitude} onShuffle={pickRandomGratitude} />}
                <JournalEntry 
                  entry={selectedEntry} 
                  responses={currentResponses}
                  onResponseChange={handleResponseChange}
                  onShowToast={showToast}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                  imageUrl={generatedImages[currentWeek] || null}
                  isGeneratingImage={generatingImageForWeek === currentWeek}
                  onGenerateImage={handleGenerateImage}
                  lyrics={savedLyrics[currentWeek] || null}
                  isGeneratingLyrics={isGeneratingLyricsForWeek === currentWeek}
                  onGenerateLyrics={handleGenerateLyrics}
                  podcast={savedPodcasts[currentWeek] || null}
                  isGeneratingPodcast={isGeneratingPodcastForWeek === currentWeek}
                  onGeneratePodcast={handleGeneratePodcast}
                  lastChange={lastChange}
                  onUndo={handleUndo}
                  allThemes={themes}
                  allResponses={savedEntries}
                  allImages={generatedImages}
                />
               </>
             )}
          </main>
        </div>
      );
    }
    return null;
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (isPinLockOpen && !isSettingPin) {
    return <PinLock onUnlock={() => setIsPinLockOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-main">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogoutClick={handleLogout}
        onSOSClick={() => setIsSOSOpen(true)}
        onTriggerClick={() => setIsTriggerTrackerOpen(true)}
      />
      <div className="container mx-auto p-4 md:p-8">
        {renderContent()}
        <RecoverySEOFAQSection />
      </div>
       <footer className="text-center py-6 mt-8 border-t border-default">
        <p className="text-sm text-muted">
          Created with hope and faith for your recovery journey.
        </p>
        <div className="flex justify-center space-x-8 mt-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook" className="hover:opacity-80 transition-opacity">
                <FacebookIcon />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="Subscribe on YouTube" className="hover:opacity-80 transition-opacity">
                <YouTubeIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram" className="hover:opacity-80 transition-opacity">
                <InstagramIcon />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X" className="text-main hover:opacity-80 transition-opacity">
                <XIcon />
            </a>
        </div>
      </footer>
      <UndoToast
        isVisible={!!lastChange}
        onUndo={handleUndo}
      />
      <NotificationToast toast={toast} />
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        currentFontSize={fontSize}
        onFontSizeChange={setFontSize}
        onSetPinLock={() => setIsSettingPin(true)}
      />
      <ParablePlayerModal
        isOpen={isParableModalOpen}
        onClose={() => setIsParableModalOpen(false)}
        onShowToast={showToast}
      />
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />
      <SOSModal 
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
      />
      <TriggerTracker 
        isOpen={isTriggerTrackerOpen}
        onClose={() => setIsTriggerTrackerOpen(false)}
      />
      {isSettingPin && (
        <PinLock 
          isSettingPin={true}
          onSetPin={(pin) => {
            localStorage.setItem('privacyPin', pin);
            setIsSettingPin(false);
            showToast('Privacy PIN set successfully.', 'success');
          }}
          onCancel={() => setIsSettingPin(false)}
          onUnlock={() => {}}
        />
      )}
    </div>
  );
};

export default App;
