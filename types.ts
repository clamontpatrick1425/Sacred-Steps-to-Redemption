

export interface SuggestedResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'audio';
}

export interface WeeklyTheme {
  week: number;
  theme: string;
  explanation: string;
  biblicalAspiration: string;
  prompt: string;
  bibleVerse: string;
  bibleVerseText: string;
  reflectionQuestion1: string;
  reflectionQuestion2: string;
  quote: {
    text: string;
    author: string;
  };
  prayer: string;
  suggestedResources: SuggestedResource[];
  songTitle: string;
  songLinks: {
    spotify: string;
    appleMusic: string;
  };
}

export interface JournalResponses {
  promptResponse: string;
  reflection1Response: string;
  reflection2Response: string;
  deeperReflectionResponse?: string;
  personalGoal?: string;
  goalReflection?: string;
}

export type SavedEntries = {
  [week: number]: Partial<JournalResponses>;
};

export type SavedLyrics = {
  [week: number]: string;
};

export type SavedPodcasts = {
  [week: number]: string;
};

export type UndoAction = {
  week: number;
  field: keyof JournalResponses;
  previousValue: string;
};

export interface GratitudeEntry {
  id: number;
  text: string;
}

export interface ToastMessage {
  message: string;
  type: 'error' | 'info' | 'success';
}

export type AppTheme = 'sky' | 'dark';
export type AppFontSize = 'sm' | 'base' | 'lg';

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
}

export interface PrayerWallEntry {
  id: number;
  text: string;
  prayers: number;
  timestamp: number;
}

export interface DailyAffirmation {
  text: string;
  date: string; // YYYY-MM-DD
  week: number;
}

export interface EmotionDataPoint {
  week: number;
  emotions: { [key: string]: number }; // e.g., { hope: 7, gratitude: 8, struggle: 3 }
}

export interface MomentOfGrace {
  week: number;
  moment: string;
}