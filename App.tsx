import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateJournalContent, findReplacementResource, generateReflectiveImage, createChatSession, moderatePrayerWallSubmission, generateDailyAffirmation, generateSongLyrics, generatePodcastScript, generateSpeech } from './services/geminiService';
import type { WeeklyTheme, SavedEntries, JournalResponses, UndoAction, GratitudeEntry, ToastMessage, SuggestedResource, AppTheme, AppFontSize, ChatMessage, PrayerWallEntry, DailyAffirmation, SavedLyrics, SavedPodcasts } from './types';
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
import { ChatFAB } from './components/ChatFAB';
import { SpiritualGuideChat } from './components/SpiritualGuideChat';
import { InteractiveParable } from './components/InteractiveParable';
import { ParablePlayerModal } from './components/ParablePlayerModal';
import { PrayerWall } from './components/PrayerWall';
import { PrayerWallModal } from './components/PrayerWallModal';
import { DailyAffirmationCard } from './components/DailyAffirmationCard';
import { ShareCardModal } from './components/ShareCardModal';
import { JourneyMap } from './components/JourneyMap';
import { JourneyMapModal } from './components/JourneyMapModal';
import { GoalReflectionModal } from './components/GoalReflectionModal';
import type { Chat } from '@google/genai';


const MILESTONES = [4, 13, 26, 52];
const KAIROS_GREETING = { id: Date.now(), role: 'model' as const, text: "Grace and peace to you. I am Kairos, your spiritual guide. How can I support you on your journey today?" };

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
    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.058 1.644.07 4.85.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
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
  const [randomGratitude, setRandomGratitude] = useState<GratitudeEntry | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [shareableContent, setShareableContent] = useState<{ text: string, source: string } | null>(null);

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

  // AI Feature States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const [generatingImageForWeek, setGeneratingImageForWeek] = useState<number | null>(null);
  const [isParableModalOpen, setIsParableModalOpen] = useState(false);
  const [isPrayerWallOpen, setIsPrayerWallOpen] = useState(false);
  const [isJourneyMapOpen, setIsJourneyMapOpen] = useState(false);
  const [dailyAffirmation, setDailyAffirmation] = useState<string | null>(null);
  const [isLoadingAffirmation, setIsLoadingAffirmation] = useState<boolean>(true);
  const [goalReflectionNeeded, setGoalReflectionNeeded] = useState<{ week: number; goal: string; } | null>(null);
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
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const storedMessages = localStorage.getItem('chatMessages');
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return [KAIROS_GREETING];
    } catch (e) {
      console.error("Failed to parse chat messages from localStorage", e);
      return [KAIROS_GREETING];
    }
  });

  const [prayerWallEntries, setPrayerWallEntries] = useState<PrayerWallEntry[]>(() => {
    try {
        const storedPrayers = localStorage.getItem('prayerWallEntries');
        if (storedPrayers) {
            const parsed = JSON.parse(storedPrayers);
            if (Array.isArray(parsed)) return parsed;
        }
        return [];
    } catch (e) {
        console.error("Failed to parse prayer wall entries from localStorage", e);
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

  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcasts>(() => {
    try {
      const storedPodcasts = localStorage.getItem('savedPodcasts');
      if (storedPodcasts) {
        const parsed = JSON.parse(storedPodcasts);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.error("Failed to parse saved podcasts from localStorage", e);
      return {};
    }
  });


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
  }, []);

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
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatMessages]);


  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('gratitudeEntries', JSON.stringify(gratitudeEntries));
    }, 1000);
    return () => clearTimeout(timer);
  }, [gratitudeEntries]);

  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('prayerWallEntries', JSON.stringify(prayerWallEntries));
    }, 1000);
    return () => clearTimeout(timer);
  }, [prayerWallEntries]);


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

  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('savedPodcasts', JSON.stringify(savedPodcasts));
    }, 1000);
    return () => clearTimeout(timer);
  }, [savedPodcasts]);


  const loadJournalContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const content = await generateJournalContent();
      setThemes(content);
      // Initialize chat session after content is loaded
      if (!chatRef.current) {
          chatRef.current = createChatSession();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournalContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Daily Affirmation Logic
  useEffect(() => {
    const fetchAffirmation = async () => {
        if (themes.length === 0) return;

        setIsLoadingAffirmation(true);
        const today = new Date().toISOString().split('T')[0];
        const currentTheme = themes.find(t => t.week === currentWeek);

        try {
            const storedData = localStorage.getItem('dailyAffirmation');
            if (storedData) {
                const savedAffirmation: DailyAffirmation = JSON.parse(storedData);
                if (savedAffirmation.date === today && savedAffirmation.week === currentWeek) {
                    setDailyAffirmation(savedAffirmation.text);
                    setIsLoadingAffirmation(false);
                    return;
                }
            }
            
            if (currentTheme) {
                const newAffirmationText = await generateDailyAffirmation(currentTheme.theme);
                const newAffirmation: DailyAffirmation = {
                    text: newAffirmationText,
                    date: today,
                    week: currentWeek,
                };
                localStorage.setItem('dailyAffirmation', JSON.stringify(newAffirmation));
                setDailyAffirmation(newAffirmationText);
            }
        } catch (err) {
            console.error("Failed to fetch daily affirmation", err);
            // Don't show a toast for this, just fail silently.
            setDailyAffirmation("Today, I am open to grace and healing.");
        } finally {
            setIsLoadingAffirmation(false);
        }
    };
    fetchAffirmation();
  }, [currentWeek, themes]);


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


  const handleWeekChange = (newWeek: number) => {
    const oldWeek = currentWeek;
    if (newWeek !== oldWeek) {
        const previousGoal = savedEntries[oldWeek]?.personalGoal;
        if (previousGoal && !savedEntries[oldWeek]?.goalReflection) {
            setGoalReflectionNeeded({ week: oldWeek, goal: previousGoal });
        }
    }
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

    setSavedEntries(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: value
      }
    }));
    
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

    setSavedEntries(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: previousValue,
      },
    }));

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

  const handleAddPrayer = async (text: string) => {
    const isAppropriate = await moderatePrayerWallSubmission(text);
    if (!isAppropriate) {
        showToast("This submission was flagged as inappropriate and was not posted.", 'error');
        return;
    }
    const newPrayer: PrayerWallEntry = {
        id: Date.now(),
        text,
        prayers: 0,
        timestamp: Date.now(),
    };
    setPrayerWallEntries(prev => [newPrayer, ...prev]);
    showToast("Your prayer has been shared.", 'success');
  };

  const handlePrayForEntry = (id: number) => {
    setPrayerWallEntries(prev => 
        prev.map(entry => entry.id === id ? { ...entry, prayers: entry.prayers + 1 } : entry)
    );
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
  
  const handleClearChat = () => {
    setChatMessages([KAIROS_GREETING]);
    // Re-initialize the chat session to clear its internal server-side history
    chatRef.current = createChatSession();
    showToast("Conversation cleared", 'info');
  };

  const handleGenerateImage = async (week: number, promptText: string) => {
    setGeneratingImageForWeek(week);
    try {
        const imageUrl = await generateReflectiveImage(promptText);
        setGeneratedImages(prev => ({ ...prev, [week]: imageUrl }));
    } catch(err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        showToast(message, 'error');
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
        setSavedPodcasts(prev => ({ ...prev, [week]: audio }));
        showToast("Your weekly podcast is ready!", "success");
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        showToast(message, 'error');
    } finally {
        setIsGeneratingPodcastForWeek(null);
    }
  };

  const handleGoalReflectionSubmit = (week: number, reflection: string) => {
    handleResponseChange(week, 'goalReflection', reflection);
    setGoalReflectionNeeded(null);
    showToast("Your goal reflection has been saved.", "success");
  };


  const handleReplaceResource = async (week: number, resourceIndex: number, brokenResource: SuggestedResource) => {
    const themeToUpdate = themes.find(t => t.week === week);
    if (!themeToUpdate) return;

    try {
        const newResource = await findReplacementResource(themeToUpdate, brokenResource);
        setThemes(prevThemes =>
            prevThemes.map(theme => {
                if (theme.week === week) {
                    const updatedResources = [...theme.suggestedResources];
                    updatedResources[resourceIndex] = newResource;
                    return { ...theme, suggestedResources: updatedResources };
                }
                return theme;
            })
        );
        showToast("Resource has been updated!", 'success');
    } catch (error) {
        if (error instanceof Error) {
            showToast(error.message, 'error');
        } else {
            showToast("An unknown error occurred.", 'error');
        }
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
                  <ProgressTracker 
                    completedWeeks={completedWeeksCount}
                    totalWeeks={themes.length || 52}
                  />
                  <StreakTracker streak={reflectionStreak} />
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
                  <JourneyMap onOpen={() => setIsJourneyMapOpen(true)} />
                  <InteractiveParable onStart={() => setIsParableModalOpen(true)} />
                  <PrayerWall onOpen={() => setIsPrayerWallOpen(true)} />
               </div>
            </aside>
          )}
          <main className={`transition-all duration-300 ease-in-out ${isFocusMode ? 'lg:col-span-12' : 'lg:col-span-9'}`}>
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
              onReplaceResource={handleReplaceResource}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
              imageUrl={generatedImages[currentWeek] || null}
              isGeneratingImage={generatingImageForWeek === currentWeek}
              onGenerateImage={handleGenerateImage}
              onShare={setShareableContent}
              affirmation={dailyAffirmation}
              isLoadingAffirmation={isLoadingAffirmation}
              lyrics={savedLyrics[currentWeek] || null}
              isGeneratingLyrics={isGeneratingLyricsForWeek === currentWeek}
              onGenerateLyrics={handleGenerateLyrics}
              podcast={savedPodcasts[currentWeek] || null}
              isGeneratingPodcast={isGeneratingPodcastForWeek === currentWeek}
              onGeneratePodcast={handleGeneratePodcast}
            />
          </main>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-main">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <div className="container mx-auto p-4 md:p-8">
        {renderContent()}
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
      />
      {shareableContent && (
        <ShareCardModal 
            isOpen={!!shareableContent}
            onClose={() => setShareableContent(null)}
            text={shareableContent.text}
            source={shareableContent.source}
        />
      )}
      <ChatFAB onOpen={() => setIsChatOpen(true)} />
      <SpiritualGuideChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chat={chatRef.current}
        messages={chatMessages}
        setMessages={setChatMessages}
        onClear={handleClearChat}
        currentTheme={selectedEntry?.theme}
      />
      <ParablePlayerModal
        isOpen={isParableModalOpen}
        onClose={() => setIsParableModalOpen(false)}
        onShowToast={showToast}
      />
      <PrayerWallModal
        isOpen={isPrayerWallOpen}
        onClose={() => setIsPrayerWallOpen(false)}
        entries={prayerWallEntries}
        onAddPrayer={handleAddPrayer}
        onPray={handlePrayForEntry}
        onShowToast={showToast}
      />
      <JourneyMapModal
        isOpen={isJourneyMapOpen}
        onClose={() => setIsJourneyMapOpen(false)}
        savedEntries={savedEntries}
        themes={themes}
        onShowToast={showToast}
      />
      {goalReflectionNeeded && (
        <GoalReflectionModal
            isOpen={!!goalReflectionNeeded}
            onClose={() => setGoalReflectionNeeded(null)}
            goal={goalReflectionNeeded.goal}
            week={goalReflectionNeeded.week}
            onSubmit={handleGoalReflectionSubmit}
        />
      )}
    </div>
  );
};

export default App;