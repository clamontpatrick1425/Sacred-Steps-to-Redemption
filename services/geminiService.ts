import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import type { WeeklyTheme, JournalResponses, SavedEntries, GratitudeEntry, PrayerWallEntry, EmotionDataPoint, MomentOfGrace } from '../types';
import { weeklyImagePrompts } from '../weeklyImagePrompts';
import { renderDevotionalAudio, audioBufferToWavBlob } from '../utils/devotionalAudio';

const journalSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      week: { type: Type.INTEGER, description: "Week number from 1 to 52." },
      theme: { type: Type.STRING, description: "The theme for the week." },
      explanation: { type: Type.STRING, description: "A brief explanation of the weekly theme." },
      biblicalAspiration: { type: Type.STRING, description: "A biblical aspiration related to the theme." },
      prompt: { type: Type.STRING, description: "The main journal prompt for the week." },
      bibleVerse: { type: Type.STRING, description: "A relevant Bible verse citation (e.g., 'Philippians 4:13')." },
      bibleVerseText: { type: Type.STRING, description: "The full text of the corresponding Bible verse." },
      reflectionQuestion1: { type: Type.STRING, description: "The first reflection question." },
      reflectionQuestion2: { type: Type.STRING, description: "The second reflection question." },
      quote: {
        type: Type.OBJECT,
        description: "An inspirational spiritual quote with its author.",
        properties: {
            text: { type: Type.STRING, description: "The text of the quote." },
            author: { type: Type.STRING, description: "The author of the quote." },
        },
        required: ['text', 'author'],
      },
      prayer: { type: Type.STRING, description: "A weekly prayer, 2500 characters or less." },
      songTitle: { type: Type.STRING, description: "An uplifting song title related to the theme." },
      songLinks: {
          type: Type.OBJECT,
          properties: {
              spotify: { type: Type.STRING, description: "A placeholder URL for the song on Spotify." },
              appleMusic: { type: Type.STRING, description: "A placeholder URL for the song on Apple Music." },
          },
          required: ['spotify', 'appleMusic'],
      },
    },
    required: [
      'week',
      'theme',
      'explanation',
      'biblicalAspiration',
      'prompt',
      'bibleVerse',
      'bibleVerseText',
      'reflectionQuestion1',
      'reflectionQuestion2',
      'quote',
      'prayer',
      'songTitle',
      'songLinks'
    ]
  }
};

import { allWeeklyThemes } from '../journalThemesData';

export const getApiKey = (): string | null => {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || null;
};

export const TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"];

export async function callGeminiWithFallback<T>(
  fn: (model: string) => Promise<T>,
  models: string[] = TEXT_MODELS
): Promise<T> {
  let lastError: any = null;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt with model ${model} failed:`, err?.message || err);
    }
  }
  throw lastError;
}

export const generateJournalContent = async (): Promise<WeeklyTheme[]> => {
  // Directly return the complete 52-week curriculum from our static file
  return [...allWeeklyThemes];
};

export const generatePersonalPrayer = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let summary_of_user_responses = "The user has reflected on the following:\n";
  if (responses.promptResponse && responses.promptResponse.trim()) {
    summary_of_user_responses += `- Main prompt response: "${responses.promptResponse}"\n`;
  }
  if (responses.reflection1Response && responses.reflection1Response.trim()) {
    summary_of_user_responses += `- Reflection 1 response: "${responses.reflection1Response}"\n`;
  }
  if (responses.reflection2Response && responses.reflection2Response.trim()) {
    summary_of_user_responses += `- Reflection 2 response: "${responses.reflection2Response}"\n`;
  }

  const prompt = `
    You are a gentle, encouraging spiritual guide for a person on a recovery journey from addiction using a Christian spiritual journal.
    The theme for this week is '${theme.theme}'.
    Based on my journal entries this week about '${theme.theme}', where I've expressed feelings of '${summary_of_user_responses}', please compose a short, personal prayer for me. 
    The prayer should be hopeful, acknowledge my struggles, and focus on seeking strength, gratitude, and guidance.
    The tone should be warm, personal, and uplifting. Address the prayer directly to God.
    Do not include any introductory text like "Here is a prayer for you:". Just provide the prayer itself.
  `;

  try {
    return await callGeminiWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.8,
          topP: 0.95,
        },
      });
      return response.text.trim();
    });
  } catch (error) {
    console.error("Error generating personal prayer:", error);
    throw new Error("Failed to generate a personal prayer. Please try again.");
  }
};

const verseSchema = {
    type: Type.OBJECT,
    properties: {
        verse: { type: Type.STRING, description: "The full text of the Bible verse." },
        citation: { type: Type.STRING, description: "The citation for the Bible verse (e.g., 'John 3:16')." },
    },
    required: ['verse', 'citation'],
};

export const findVerseForFeeling = async (feeling: string): Promise<{ verse: string; citation: string; }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `I'm on a Christian spiritual recovery journey and I'm feeling '${feeling}'. Please provide one relevant and encouraging Bible verse with its citation that speaks to this feeling.`;

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: verseSchema,
                },
            });
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        });
    } catch (error) {
        console.error("Error finding verse for feeling:", error);
        throw new Error("Failed to find a verse for your feeling. Please try again.");
    }
};

export const generateSpeech = async (textToSpeak: string): Promise<string> => {
  const apiKey = getApiKey();
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const ttsCandidateModels = ["gemini-3.1-flash-tts-preview", "gemini-3.8-flash"];

    for (const model of ttsCandidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: `Read the following in a calm, gentle, and clear voice: ${textToSpeak}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return base64Audio;
        }
      } catch (error) {
        console.warn(`TTS generation with model ${model} did not succeed:`, error);
      }
    }
  }

  // Graceful fallback to rich ambient devotional soundscape
  try {
    const buffer = await renderDevotionalAudio('Country Gospel', 16);
    const blob = audioBufferToWavBlob(buffer);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (audioErr) {
    console.error("Error generating fallback devotional audio:", audioErr);
    throw new Error("Unable to synthesize audio at this time. Please try again.");
  }
};

export const generateMilestoneSummary = async (
  milestone: number,
  themesForPeriod: WeeklyTheme[],
  entriesForPeriod: SavedEntries,
  gratitudeEntries: GratitudeEntry[],
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const themeList = themesForPeriod.map(t => t.theme).join(', ');
  
  const responseSnippets = Object.values(entriesForPeriod)
    .flatMap(entry => Object.values(entry))
    .filter(response => response && response.trim().length > 10) // Get meaningful snippets
    .map(response => `"${response.substring(0, 80)}..."`) // Truncate for brevity
    .slice(0, 5) // Limit to 5 snippets
    .join('\n- ');

  const gratitudeSnippets = gratitudeEntries
    .slice(-10) // Get the 10 most recent
    .map(g => `"${g.text}"`)
    .join(', ');

  const prompt = `
    You are an encouraging, warm, and insightful spiritual mentor.
    A person on a recovery journey from addiction using a Christian spiritual journal has just completed ${milestone} weeks of reflection.
    
    Over this period, they have reflected on themes like: ${themeList}.
    
    Here are some of their reflections and struggles they've written about:
    - ${responseSnippets || "They have been reflecting privately on their journey."}
    
    They have also been practicing gratitude, noting things like: ${gratitudeSnippets || "practicing thankfulness for their blessings."}
    
    Based on this, please write a short, uplifting, and personal message (2-3 paragraphs) directly to this person. 
    The message should:
    1. Acknowledge their incredible dedication and the hard work they've put in to reach this ${milestone}-week milestone.
    2. Gently highlight their perseverance and courage, referencing the nature of their reflections if possible.
    3. Provide encouragement for the path ahead, reinforcing hope and faith.
    4. The tone should be like a personal letter, celebratory and deeply supportive.
    
    Do not include a generic greeting like "Dear user,". Start the message directly. For example, "Reaching this milestone is a testament to your strength...".
  `;

  try {
    return await callGeminiWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.8,
          topP: 0.95,
        },
      });
      return response.text.trim();
    });
  } catch (error) {
    console.error("Error generating milestone summary:", error);
    throw new Error("Failed to generate your milestone summary. Please try again.");
  }
};

export const getFallbackRecoveryImage = (week: number): string => {
  const fallbacks = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Yosemite dawn golden light and cleansing water
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", // Open forest path with dawn sunbeams
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80", // Serene misty dawn mountain lake
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", // Golden dawn coastline and cleansing waves
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80", // Open path and sunrise horizon
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80", // Sunbeams illuminating new life
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", // Dawn golden meadow of grace
    "https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?auto=format&fit=crop&w=1200&q=80"  // Quiet morning stillness in the hills
  ];
  const index = Math.abs(Math.floor(week)) % fallbacks.length;
  return fallbacks[index];
};

export const generateReflectiveImage = async (promptText: string, week?: number): Promise<string> => {
  const currentWeek = week || 1;
  const curatedPrompt = (week && weeklyImagePrompts[week]) ? weeklyImagePrompts[week] : promptText;

  const prompt = `Sacred Steps to Redemption reflective artwork:
Visual Description: ${curatedPrompt}
Aesthetic: Cinematic, high-contrast natural lighting, tactile fine art photography, warm golden hour tones, Dawn Gold (#D4AF37) highlights and Deep Sacred Blue (#1C2A39) shadows. Serene, peaceful, inspiring atmosphere.
Negative Prompt: No distorted limbs, no extra hands or feet, no grotesque elements, no neon colors, no artificial studio lighting, no distress, no despair, no text, no watermark.`;

  const apiKey = getApiKey();
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const imageCandidateModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];

    for (const model of imageCandidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: "4:3"
            }
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
      } catch (imgError: any) {
        console.warn(`Model ${model} image generation unavailable:`, imgError?.message || imgError);
      }
    }
  }

  // Gracefully fallback to high-resolution curated recovery photography
  console.info(`Using curated reflective recovery landscape for Week ${currentWeek}`);
  return getFallbackRecoveryImage(currentWeek);
};


export const generateDeeperReflectionPrompt = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const responseSnippets = `
      - Main Prompt: ${responses.promptResponse || '(not answered)'}
      - Reflection 1: ${responses.reflection1Response || '(not answered)'}
      - Reflection 2: ${responses.reflection2Response || '(not answered)'}
    `;

    const prompt = `
        You are a gentle spiritual guide. A person is reflecting on the theme of '${theme.theme}'. Their journal entries so far are:
        ${responseSnippets}
        Based on their writing, generate a single, gentle, open-ended follow-up question to help them reflect even more deeply. 
        The question should be encouraging and directly related to what they've written. 
        Do not include any preamble like "Here is a question for you:". Just provide the question itself.
    `;
    
    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: { temperature: 0.75 },
            });
            return response.text.trim();
        });
    } catch (error) {
        console.error("Error generating deeper reflection prompt:", error);
        throw new Error("Failed to generate a deeper reflection prompt.");
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const audioPart = {
        inlineData: {
            mimeType,
            data: base64Audio,
        },
    };

    const prompt = "Transcribe the following audio recording accurately. The content is a personal and reflective journal entry for a spiritual recovery program. Please only return the transcribed text.";

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: { parts: [audioPart, {text: prompt}] },
            });
            return response.text.trim();
        }, ["gemini-3.5-transcribe", "gemini-3.8-flash"]);
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio. Please try again later.");
    }
};

const parableSchema = {
    type: Type.OBJECT,
    properties: {
        storySegment: { type: Type.STRING, description: "The next segment of the story, about 1-2 paragraphs long." },
        choices: { 
            type: Type.ARRAY, 
            description: "An array of 2 or 3 distinct, meaningful choices for the user to make next. If the story is ending, this can be empty.",
            items: { type: Type.STRING } 
        },
        isEnding: { type: Type.BOOLEAN, description: "Set to true if this is the natural conclusion of the story." },
    },
    required: ['storySegment', 'choices', 'isEnding'],
};

export const generateParableSegment = async (
    parableTitle: string,
    storyHistory: string,
    userChoice: string | null
): Promise<{ storySegment: string; choices: string[]; isEnding: boolean; }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = userChoice
        ? `Continue the interactive parable "${parableTitle}".
           The story so far:
           ${storyHistory}
           The user has just chosen to: "${userChoice}".
           Write the next part of the story based on this choice. The new segment should be about 1-2 paragraphs. 
           Conclude by presenting 2 or 3 distinct, meaningful choices for the user to make. 
           If the story has reached a natural conclusion based on the user's choice, provide a final reflective summary and set isEnding to true.`
        : `Begin an interactive parable based on the story of "${parableTitle}".
           Write the opening scene, setting the stage in 1-2 paragraphs.
           Conclude by presenting the user with their first 2 or 3 meaningful choices.`;

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: parableSchema,
                    temperature: 0.8,
                },
                systemInstruction: "You are a master storyteller, weaving interactive Christian parables for a user on a spiritual journey. Your tone is gentle, wise, and reflective. Focus on themes of redemption, forgiveness, and faith.",
            });

            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        });
    } catch (error) {
        console.error("Error generating parable segment:", error);
        throw new Error("Failed to continue the story. Please try again.");
    }
};

export const generateReflectionSummary = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const userResponses = `
    - Response to main prompt ('${theme.prompt}'): "${responses.promptResponse || 'Not answered'}"
    - Response to reflection 1 ('${theme.reflectionQuestion1}'): "${responses.reflection1Response || 'Not answered'}"
    - Response to reflection 2 ('${theme.reflectionQuestion2}'): "${responses.reflection2Response || 'Not answered'}"
    ${responses.deeperReflectionResponse ? `- Response to deeper reflection: "${responses.deeperReflectionResponse}"` : ''}
  `;

  const prompt = `
    You are an insightful and empathetic spiritual guide.
    A user has completed their journal entry for the week with the theme of '${theme.theme}'.
    Based on their written reflections below, please generate a concise, encouraging summary (1-2 paragraphs).
    The summary should gently highlight key insights, recurring feelings, or areas of growth evident in their writing.
    The tone should be warm, affirmative, and non-judgmental.

    User's reflections:
    ${userResponses}

    Provide only the summary text, without any introductory phrases like "Here is your summary:".
  `;

  try {
    return await callGeminiWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      return response.text.trim();
    });
  } catch (error) {
    console.error("Error generating reflection summary:", error);
    throw new Error("Failed to generate a reflection summary. Please try again.");
  }
};

const goalSuggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "An array of 2-3 concise, actionable, and personalized goal suggestions.",
            items: { type: Type.STRING }
        }
    },
    required: ['suggestions'],
};

export const generateGoalSuggestions = async (
  theme: WeeklyTheme,
  responses: Partial<JournalResponses>
): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const responseSnippets = Object.values(responses)
        .filter(r => r && r.trim())
        .map(r => `- "${r.substring(0, 100)}..."`)
        .join('\n');

    const prompt = `
        You are an encouraging spiritual mentor for a person on a recovery journey from addiction.
        The theme for this week is '${theme.theme}'.
        Their journal reflections so far this week include:
        ${responseSnippets || "The user has not written much yet."}
        
        Based on the weekly theme and their reflections, suggest 2-3 small, actionable, and personal goals they could set for the week to apply the theme in their life.
        The goals should be practical and encouraging. Phrase each goal as a complete sentence, for example starting with "I will...".
    `;

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: goalSuggestionsSchema,
                    temperature: 0.8,
                },
            });
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed.suggestions || [];
        });
    } catch (error) {
        console.error("Error generating goal suggestions:", error);
        throw new Error("Failed to generate goal suggestions. Please try again.");
    }
};

export const generateMeditationScript = async (theme: WeeklyTheme): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        You are a calm and gentle guide for meditation.
        Create a short, 2-3 minute guided meditation script for a person on a Christian spiritual recovery journey.
        The script should be soothing, encouraging, and based on the following weekly theme:
        - Theme: "${theme.theme}"
        - Explanation: "${theme.explanation}"
        - Key Bible Verse: "${theme.bibleVerseText}" (${theme.bibleVerse})

        Structure the meditation with:
        1. A brief opening to settle the mind and focus on breathing.
        2. A body section that reflects on the weekly theme and verse, encouraging feelings of peace, hope, and release.
        3. A short closing to bring awareness back to the present moment, feeling refreshed and centered in faith.
        
        The language should be simple, direct, and filled with grace. Speak directly to the listener.
        Return only the script text, without any introductory phrases.
    `;
    
    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature: 0.7,
                },
            });
            return response.text.trim();
        });
    } catch (error) {
        console.error("Error generating meditation script:", error);
        throw new Error("Failed to generate a meditation script. Please try again.");
    }
};

const emotionalArcSchema = {
    type: Type.ARRAY,
    description: "An array of weekly emotional analysis data points.",
    items: {
        type: Type.OBJECT,
        properties: {
            week: { type: Type.INTEGER, description: "The week number." },
            emotions: {
                type: Type.OBJECT,
                description: "Key-value pairs of emotions and their intensity (1-10).",
                properties: {
                    hope: { type: Type.INTEGER },
                    gratitude: { type: Type.INTEGER },
                    struggle: { type: Type.INTEGER },
                    peace: { type: Type.INTEGER },
                },
                required: ["hope", "gratitude", "struggle", "peace"],
            },
        },
        required: ["week", "emotions"],
    }
};

export const analyzeEmotionalArc = async (entries: SavedEntries): Promise<EmotionDataPoint[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const conciseEntries = Object.entries(entries)
        .filter(([, value]) => Object.values(value).some(v => v && v.trim() !== ''))
        .map(([week, value]) => `Week ${week}: ${Object.values(value).join(' ')}`.substring(0, 500))
        .join('\n');

    const prompt = `
        Analyze the following journal entries from a user on a Christian spiritual recovery journey.
        For each week provided, rate the intensity of the following four emotions on a scale of 1 (low) to 10 (high): "hope", "gratitude", "struggle", and "peace".
        Consider the user's language, tone, and the topics they discuss.
        If an entry for a week is missing or very short, provide an average or neutral score (e.g., 5).
        
        Entries:
        ${conciseEntries}
    `;

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: emotionalArcSchema,
                },
            });
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        });
    } catch (error) {
        console.error("Error analyzing emotional arc:", error);
        throw new Error("Failed to analyze your emotional journey. Please try again later.");
    }
};

const momentsOfGraceSchema = {
    type: Type.ARRAY,
    description: "An array of insightful quotes from the user's journal.",
    items: {
        type: Type.OBJECT,
        properties: {
            week: { type: Type.INTEGER, description: "The week the moment is from." },
            moment: { type: Type.STRING, description: "The insightful sentence or phrase." },
        },
        required: ["week", "moment"],
    }
};

export const extractMomentsOfGrace = async (entries: SavedEntries): Promise<MomentOfGrace[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const fullText = Object.entries(entries)
        .map(([week, responses]) => `--- Week ${week} ---\n${Object.values(responses).join('\n')}`)
        .join('\n\n');

    const prompt = `
        From the following journal entries of a person on a spiritual recovery journey, extract 5 to 7 of the most powerful, insightful, or hopeful sentences.
        These "Moments of Grace" should capture key breakthroughs, shifts in perspective, or profound statements of faith or vulnerability.
        For each moment, provide the original text and the week it came from.
        
        Journal Text:
        ${fullText}
    `;

    try {
        return await callGeminiWithFallback(async (model) => {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: momentsOfGraceSchema,
                },
            });
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        });
    } catch (error) {
        console.error("Error extracting moments of grace:", error);
        throw new Error("Failed to extract key moments from your journal. Please try again later.");
    }
};

export const getFallbackDevotionalLyrics = (songTitle: string, theme: WeeklyTheme): string => {
  return `[Verse 1]
Walking through the shadows where the silence felt so deep,
Carrying the promises I struggled once to keep.
Then I heard Your gentle voice calling out my name,
Breaking through the darkness, washing all my shame.

[Chorus]
This is ${songTitle}, stepping into grace,
Looking at the horizon, seeking Your warm embrace.
"${theme.bibleVerseText}" (${theme.bibleVerse})
By Your love we are redeemed, healed and made anew!

[Verse 2]
Every dawn is mercy, every breath a second start,
Laying down the burdens that once weighed upon my heart.
Rooted in Your faithfulness, trusting where You lead,
In the quiet waters, You are all I need.

[Bridge]
No longer bound by what used to be,
Your cross of redemption has set my spirit free.
From the first step taken to the victory won,
Walk in the light of the Rising Son!

[Chorus]
This is ${songTitle}, stepping into grace,
Looking at the horizon, seeking Your warm embrace.
"${theme.bibleVerseText}" (${theme.bibleVerse})
By Your love we are redeemed, healed and made anew!

[Outro]
One day at a time, held in Your hands.
Peace, mercy, and redemption forevermore. Amen.`;
};

export const generateSongLyrics = async (songTitle: string, theme: WeeklyTheme): Promise<string> => {
    const apiKey = getApiKey();
    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
You are a talented songwriter specializing in contemporary Christian music.
A user is on a spiritual recovery journey and is using a journal called 'Sacred Steps to Redemption'.
This week's theme is: "${theme.theme}".
The weekly bible verse is: "${theme.bibleVerseText}" (${theme.bibleVerse}).
The inspirational song title for this week is: "${songTitle}".

Please write a complete set of hopeful and uplifting song lyrics for the song "${songTitle}".
The lyrics should be deeply inspired by the weekly theme and bible verse.
The song should have a structure with at least two verses, a repeating chorus, and a bridge.
The tone should be encouraging, reflective, and suitable for worship or personal meditation.

Return only the lyrics, without any introductory text like "Here are the lyrics:".
        `;

        for (const model of TEXT_MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        temperature: 0.7,
                    },
                });
                const text = response.text?.trim();
                if (text) {
                    return text;
                }
            } catch (err: any) {
                console.warn(`Error generating song lyrics with ${model}:`, err?.message || err);
            }
        }
    }

    // Gracefully fallback to curated devotional song lyrics
    console.info(`Using curated devotional lyrics for "${songTitle}" (Week ${theme.week})`);
    return getFallbackDevotionalLyrics(songTitle, theme);
};

export const getFallbackPodcastScript = (theme: WeeklyTheme): string => {
  return `Welcome to this week's Sacred Steps devotional reflection. Take a quiet, centering breath right where you are.

This week, we reflect together on "${theme.theme}." ${theme.explanation}

God's Word reminds us in ${theme.bibleVerse}: "${theme.bibleVerseText}"

In true recovery and spiritual renewal, healing is not about walking flawlessly; it is about walking honestly, one day and one surrender at a time. When old burdens or doubts whisper that you cannot do this, remember that God's grace meets you right at your point of need.

You are deeply loved, you are known by your Creator, and you never have to walk this road alone. Step forward with peace and renewed hope today.`;
};

export const generatePodcastScript = async (theme: WeeklyTheme): Promise<string> => {
    const prompt = `
        You are an inspirational podcast host. Your style is warm, welcoming, friendly, and deeply encouraging.
        Create a concise, highly inspiring podcast reflection for a person on a Christian spiritual recovery journey.
        The script MUST be short (around 150 to 200 words max, approx 1 to 1.5 minutes of spoken audio) so it is punchy and fits TTS limitations.
        The reflection should be based on the following weekly theme:
        - Theme: "${theme.theme}"
        - Explanation: "${theme.explanation}"
        - Key Bible Verse: "${theme.bibleVerseText}" (${theme.bibleVerse})

        Structure:
        1. A brief warm introduction greeting the listener on this week's theme.
        2. A quick, graceful reflection on this theme in recovery.
        3. A brief explanation of the Bible verse.
        4. A reassuring closing reminder that they are loved and not alone.

        Speak directly and warmly to the listener as 'you'. Limit to 150-200 words. Do not include sound effect cues or host names.
        Return only the script text, without any introductory/conversational phrases like "Here is your script:".
    `;

    const apiKey = getApiKey();
    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        for (const model of TEXT_MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        temperature: 0.75,
                    },
                });
                const text = response.text?.trim();
                if (text) {
                    return text;
                }
            } catch (error) {
                console.warn(`Error generating podcast script with ${model}:`, error);
            }
        }
    }

    // Graceful fallback to curated script if API key is missing or model permission denied
    console.info(`Using curated devotional podcast script for Week ${theme.week}`);
    return getFallbackPodcastScript(theme);
};

export const generateRedemptionReport = async (
  userName: string,
  entries: SavedEntries,
  triggers: { intensity: number; trigger: string; copingMechanism?: string; createdAt: string }[],
  gratitudeCount: number
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey });

  // Compile a small concise log of user journaling
  const totalEntriesLog = Object.entries(entries)
    .filter(([_, resp]) => Object.values(resp).some(v => v && v.trim()))
    .map(([week, resp]) => `Week ${week}: ${Object.values(resp).filter(v => v).join(". ").substring(0, 150)}...`)
    .slice(-10); // recent 10 journal entries

  // Compile a small concise log of triggers
  const totalTriggersLog = triggers
    .slice(0, 10)
    .map(t => `- Trigger: "${t.trigger}", Intensity: ${t.intensity}/10, Coping: "${t.copingMechanism || 'Not specified'}"`);

  const prompt = `
    You are a deeply compassionate, supportive, and wise spiritual counselor specializing in faith-based addiction recovery.
    Please compile a comprehensive "Sacred Steps Redemption Report" for a user named ${userName || 'Pilgrim'}.
    
    Here is their current journey status:
    - Total journaled weeks: ${Object.keys(entries).length}
    - Total triggers/cravings logged: ${triggers.length}
    - Total gratitude items written: ${gratitudeCount}
    
    Recent Journal Highlights:
    ${totalEntriesLog.join('\n') || "No journal entries have been completed yet."}
    
    Recent Triggers/Craving Logs:
    ${totalTriggersLog.join('\n') || "No trigger logs recorded yet."}
    
    Based on this compiled information, write a beautifully structured, highly encouraging, and deeply reflective Redemption Report.
    The report should include:
    1. **JOURNEY PROGRESS ASSESSMENT**: Celebrate their dedication, transparency, progress level, and steps already unlocked or completed.
    2. **CRAVING PROTECTION OVERVIEW**: Recognize triggers and offer gentle, highly empowering Christian spiritual strategies based on their logged triggers and coping mechanisms.
    3. **WORDS OF TRUST, HEALING & HOPE**: A personalized, hope-filled note of redemption, reminding them of God's grace and reassuring them they are not alone.
    
    Use a warm, comforting, wise, and encouraging Christian tone. Do not use overly complex jargon. Present clear headings.
  `;

  try {
    return await callGeminiWithFallback(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.8,
        },
      });
      return response.text.trim();
    });
  } catch (error) {
    console.error("Error generating redemption report:", error);
    throw new Error("Failed to generate redemption report.");
  }
};
