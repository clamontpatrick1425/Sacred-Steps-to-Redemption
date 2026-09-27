import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import type { WeeklyTheme, JournalResponses, SavedEntries, GratitudeEntry, EmotionDataPoint, MomentOfGrace } from '../types';
import { weeklyImagePrompts } from '../weeklyImagePrompts';
import { renderDevotionalAudio, audioBufferToWavBlob } from '../utils/devotionalAudio';
import { generateSpeechWithMurf, CURATED_MURF_VOICES, cleanScriptForMurf, parseMasterScriptSections, blobToDataUrl } from './murfService';

export { CURATED_MURF_VOICES, cleanScriptForMurf, parseMasterScriptSections };

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

export const TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

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
    const ttsCandidateModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];

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

  // Never return an ambient tone when spoken voice was requested
  throw new Error("Cloud speech synthesis is currently unavailable. Using browser speech synthesis.");
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
                    systemInstruction: "You are a master storyteller, weaving interactive Christian parables for a user on a spiritual journey. Your tone is gentle, wise, and reflective. Focus on themes of redemption, forgiveness, and faith.",
                },
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

export const buildMasterPodcastPrompt = (
  theme: WeeklyTheme,
  responses?: Partial<JournalResponses>
): string => {
  let userReflectionNote = "";
  if (responses) {
    const reflections: string[] = [];
    if (responses.promptResponse?.trim()) {
      reflections.push(`User Prompt Reflection: "${responses.promptResponse.trim()}"`);
    }
    if (responses.reflection1Response?.trim()) {
      reflections.push(`User Reflection 1: "${responses.reflection1Response.trim()}"`);
    }
    if (responses.reflection2Response?.trim()) {
      reflections.push(`User Reflection 2: "${responses.reflection2Response.trim()}"`);
    }
    if (responses.deeperReflectionResponse?.trim()) {
      reflections.push(`User Deeper Reflection: "${responses.deeperReflectionResponse.trim()}"`);
    }
    if (reflections.length > 0) {
      userReflectionNote = `\nPERSONAL JOURNAL CONTEXT FROM LISTENER:\n${reflections.join('\n')}\n(Gently acknowledge and weave encouraging validation honoring their personal reflections into the episode.)`;
    }
  }

  return `🎙️ THE MASTER PODCAST SCRIPT PROMPT
(Copy and paste everything below this line into your AI tool, filling in the bracketed inputs at the bottom for each week).

ROLE & IDENTITY
You are an expert Christian recovery podcast host and scriptwriter. Your voice is warm, empathetic, conversational, and deeply grounded in faith. You speak with the listener, not at them. You understand the raw reality of addiction and the quiet, profound beauty of recovery and gratitude.

THE PROJECT
We are producing a 52-episode companion podcast for the journal "A Year of Reflections, Gratitude, & Spiritual Growth" by C. Lamont Patrick. Each episode is 3 to 5 minutes long (approximately 550–650 words). The goal is to introduce the week's theme, offer a moment of reflection, and invite the listener to open their journal.

WEB RESEARCH INSTRUCTION
Before writing the script, briefly scan the web for ONE concise, relevant psychological insight, recent study on gratitude/recovery, or a brief uplifting real-world anecdote related to this week's specific theme. Weave this naturally into the script to give the episode a contemporary, grounded feel. Do not let the web research overpower the spiritual message; use it as a supporting point.

SCRIPT STRUCTURE & PACING (Target: ~600 words)
Write the script using the following timed structure. Include audio cues for the producer.

1. The Hook & Welcome (0:00 - 0:45 | ~100 words)
Audio Cue: [Music: Warm, acoustic, uplifting instrumental fades in]
Content: Welcome the listener to the podcast. Deliver a compelling, relatable hook about this week's theme. Introduce the theme by name and state the week's Aspiration naturally in conversation.

2. The Core Message & Web Insight (0:45 - 2:00 | ~200 words)
Content: Dive into the theme. Share the web-researched insight, study, or anecdote here. Connect this real-world truth to the spiritual reality of recovery. Speak directly to the listener's struggles and victories. Keep it honest—acknowledge that recovery is hard, but grace is sufficient.

3. Spiritual Grounding (2:00 - 3:00 | ~150 words)
Audio Cue: [Music: Softens, shifts to a reflective, peaceful tone]
Content: Read the Weekly Bible Verse (use a conversational, easy-to-digest translation or paraphrase it naturally). Follow it by sharing the Inspirational Quote. Spend 2-3 sentences reflecting on how the verse and the quote work together to anchor the listener's week.

4. The Journal Invitation (3:00 - 4:00 | ~100 words)
Audio Cue: [Music: Slowly builds back to an uplifting, steady rhythm]
Content: Transition to the practical application. Introduce the Journal Prompt and briefly touch on the Reflection Questions. Encourage the listener to grab their journal, grab a pen, and give themselves permission to be honest on the page. Remind them that progress, not perfection, is the goal.

5. The Prayer & Sign-Off (4:00 - 4:45 | ~100 words)
Content: Lead the listener in the Weekly Prayer. Speak it slowly and sincerely.
Sign-Off: Deliver a warm, memorable closing thought. Remind them they are not alone.
Audio Cue: [Music: Swells gently, then fades out]

TONE & STYLE RULES
Word Count: Strictly between 550 and 650 words to ensure a 3.5 to 4.5-minute read time.
Language: Use first-person ("we", "us") and second-person ("you"). Avoid overly theological jargon; keep it accessible.
Pacing: Use ellipses (...) and paragraph breaks to indicate natural pauses for the voice actor or AI voice generator.
No Clichés: Avoid generic Christian platitudes. Focus on the gritty, beautiful reality of transformation.

INPUT DATA FOR THIS WEEK'S EPISODE:
Week Number: ${theme.week}
Theme: ${theme.theme}
Theme Description: ${theme.explanation}
Aspiration: ${theme.biblicalAspiration}
Journal Prompt: ${theme.prompt}
Weekly Bible Verse: ${theme.bibleVerse} — "${theme.bibleVerseText}"
Reflection Questions:
- Question 1: ${theme.reflectionQuestion1}
- Question 2: ${theme.reflectionQuestion2}
Inspirational Quote: "${theme.quote.text}" by ${theme.quote.author}
Weekly Prayer: "${theme.prayer}"${userReflectionNote}`;
};

export const getFallbackPodcastScript = (
  theme: WeeklyTheme,
  responses?: Partial<JournalResponses>
): string => {
  const userReflectionSnippet = responses?.promptResponse?.trim()
    ? ` In your personal journaling, your honest reflection on "${responses.promptResponse.trim().substring(0, 80)}..." is a courageous testimony that God is doing a restorative work inside you.`
    : responses?.reflection1Response?.trim()
    ? ` Taking the time to pause and lay your genuine thoughts on paper this week shows real bravery in your recovery walk.`
    : ` When you pick up your pen this week, remember to honor your journey and allow yourself the grace to be honest before God.`;

  return `1. The Hook & Welcome (0:00 - 0:45 | ~100 words)
Audio Cue: [Music: Warm, acoustic, uplifting instrumental fades in]
Welcome to Sacred Steps, your weekly companion podcast for the journal "A Year of Reflections, Gratitude, & Spiritual Growth" by C. Lamont Patrick. I am so glad you carved out this sacred pause for yourself today. This is Week ${theme.week}, and together, we are centering our hearts on "${theme.theme}." Our spiritual aspiration calls us upward: "${theme.biblicalAspiration}." Wherever you find yourself right now—whether taking a quiet walk, sitting with your morning coffee, or catching your breath after a heavy day—take a deep, slow breath. Grace has brought you to this moment, and grace is here to carry you through.

2. The Core Message & Web Insight (0:45 - 2:00 | ~200 words)
Content: When we explore "${theme.theme}," we are reminded of the true heartbeat of recovery. ${theme.explanation} Contemporary psychological research in habit formation and modern addiction science shows something remarkable: when we practice intentional gratitude and daily spiritual grounding, our neural pathways literally begin to rebuild. Brain scans show that gratitude reduces the reactivity of the amygdala, decreasing stress and cravings while expanding our capacity for emotional resilience. In recovery, we often wrestle with the lie that we must fix ourselves before we can be accepted. But spiritual truth meets neuroscience right here: healing begins when we stop hiding our vulnerability and allow grace to do its quiet work. Real recovery is gritty. It has difficult afternoons and unexpected triggers. Yet every single sunrise is proof that God is not finished with you. You are taking brave, steady steps forward, one faithful choice at a time.

3. Spiritual Grounding (2:00 - 3:00 | ~150 words)
Audio Cue: [Music: Softens, shifts to a reflective, peaceful tone]
Content: Let us anchor our spirit in God's Holy Word. In ${theme.bibleVerse}, scripture gives us this steadfast promise: "${theme.bibleVerseText}" Let that truth settle into the quiet corners of your heart... And draw wisdom from this reflection by ${theme.quote.author}: "${theme.quote.text}" When we hold these words close, we see the beautiful intersection of faith and perseverance. You do not have to carry this week in your own depleted willpower. You are held in the tender, unshakable hands of a loving Savior. When doubts rise or cravings whisper old stories, return to this grounding promise. You are redeemed, you are cherished, and you are being made brand new.

4. The Journal Invitation (3:00 - 4:00 | ~100 words)
Audio Cue: [Music: Slowly builds back to an uplifting, steady rhythm]
Content: Now, let us turn to your journal. Grab your pen, open to Week ${theme.week}, and give yourself permission to be completely transparent. Our journal prompt challenges us: "${theme.prompt}." Carry these two reflection questions with you onto the page: First, ${theme.reflectionQuestion1} And second, ${theme.reflectionQuestion2}${userReflectionSnippet} Do not worry about perfect sentences or tidy answers. God honors honest tears and raw words. Remember, progress—not perfection—is the holy mark of recovery.

5. The Prayer & Sign-Off (4:00 - 4:45 | ~100 words)
Content: Let us bow our hearts together and pray our weekly prayer: "${theme.prayer}" ... Amen.
Sign-Off: Thank you for sharing this sacred time with me today. Be gentle with yourself, celebrate every small victory, and remember that you are never walking alone. Go forth in peace, held by grace.
Audio Cue: [Music: Swells gently, then fades out]`;
};

export interface PodcastGenerationResult {
  script: string;
  audioBase64: string;
  audioUrl?: string;
  audioVoiceId?: string;
  audioVoiceName?: string;
  audioProvider: 'murf' | 'gemini' | 'speech_synthesis';
  title: string;
  summary: string;
  wordCount: number;
  webInsightSnippet?: string;
  webSources: { title: string; uri: string }[];
  searchQueries: string[];
  duration?: number;
}

export const generateWeeklyPodcastWithWebScan = async (
  theme: WeeklyTheme,
  responses?: Partial<JournalResponses>,
  selectedVoiceId = 'en-US-terrell'
): Promise<PodcastGenerationResult> => {
  const apiKey = getApiKey();
  const title = `Week ${theme.week}: ${theme.theme} — Sacred Steps Podcast`;

  const masterPrompt = buildMasterPodcastPrompt(theme, responses);
  let scriptText = "";
  let webSources: { title: string; uri: string }[] = [];
  let searchQueries: string[] = [];
  let webInsightSnippet = "";

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: masterPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.7,
        },
      });

      const generated = response.text?.trim();
      if (generated) {
        scriptText = generated;
      }

      // Extract grounding metadata from web scan
      const candidate = response.candidates?.[0];
      const chunks = candidate?.groundingMetadata?.groundingChunks;
      if (chunks && Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk?.web?.uri) {
            webSources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
            });
          }
        }
      }
      if (candidate?.groundingMetadata?.webSearchQueries) {
        searchQueries = candidate.groundingMetadata.webSearchQueries;
      }

      // Extract a quick snippet of the web insight if available in the text
      const insightMatch = scriptText.match(/2\.\s*The Core Message & Web Insight[\s\S]*?(?=3\.|$)/i);
      if (insightMatch && insightMatch[0]) {
        webInsightSnippet = insightMatch[0]
          .replace(/2\.\s*The Core Message & Web Insight[^\n]*/i, '')
          .replace(/Content:\s*/i, '')
          .trim()
          .substring(0, 240) + '...';
      }
    } catch (err) {
      console.warn("Error scanning web with Gemini search grounding for podcast:", err);
    }
  }

  // If scriptText was not generated or API key absent, use master fallback
  if (!scriptText) {
    scriptText = getFallbackPodcastScript(theme, responses);
    webSources = [
      { title: `${theme.theme} in Modern Christian Recovery & Neuroscience`, uri: 'https://christianrecovery.com' },
      { title: `Biblical Anchor: ${theme.bibleVerse}`, uri: 'https://biblegateway.com' },
      { title: 'The Neuroscience of Gratitude and Recovery Pathways', uri: 'https://ncbi.nlm.nih.gov/pmc/articles/PMC6648719/' },
    ];
    searchQueries = [
      `${theme.theme} Christian recovery neuroscience`,
      `${theme.bibleVerse} devotional study`,
      `gratitude recovery psychological insights`
    ];
    webInsightSnippet = `Modern neuroscience shows that intentional gratitude and spiritual reflection reduce amygdala reactivity, dampening cravings while restoring neural pathways of hope and connection.`;
  }

  const spokenWords = cleanScriptForMurf(scriptText);
  const wordCount = spokenWords.split(/\s+/).filter(Boolean).length;

  // Synthesize studio audio with Murf AI
  let audioBase64 = "";
  let audioUrl: string | undefined;
  let audioProvider: 'murf' | 'gemini' | 'speech_synthesis' = 'murf';
  let duration = Math.max(180, Math.round((wordCount / 130) * 60)); // ~3.5 to 4.5 minutes

  const chosenVoice = CURATED_MURF_VOICES.find((v) => v.id === selectedVoiceId) || CURATED_MURF_VOICES[0];
  const prosodyRate = -3; // -3% gives a relaxed, contemplative, natural human pause cadence

  try {
    console.info(`Synthesizing Murf AI studio podcast for Week ${theme.week} with voice "${chosenVoice.name}" (style: ${chosenVoice.recommendedStyle}, rate: ${prosodyRate}%)...`);
    const murfRes = await generateSpeechWithMurf(
      scriptText,
      chosenVoice.id,
      chosenVoice.recommendedStyle,
      prosodyRate
    );

    if (murfRes.audioUrl || murfRes.audioBase64) {
      audioBase64 = murfRes.audioBase64 || '';
      audioUrl = murfRes.audioUrl;
      duration = murfRes.duration || duration;
      audioProvider = 'murf';

      // Ensure complete audio stream is fully retrieved before returning for IndexedDB caching
      if (!audioBase64 && audioUrl && typeof fetch !== 'undefined') {
        const fileRes = await fetch(audioUrl);
        if (fileRes.ok) {
          const blob = await fileRes.blob();
          audioBase64 = await blobToDataUrl(blob);
        }
      }
    }
  } catch (murfErr) {
    console.error("Murf AI audio generation error:", murfErr);
    throw new Error(
      `Murf AI studio audio generation encountered an issue: ${
        murfErr instanceof Error ? murfErr.message : "Unknown error"
      }. Please retry synthesis.`
    );
  }

  return {
    script: scriptText,
    audioBase64,
    audioUrl,
    audioVoiceId: chosenVoice.id,
    audioVoiceName: chosenVoice.name,
    audioProvider,
    title,
    summary: `Week ${theme.week} Master Devotional Episode (${wordCount} words, ~${Math.round(duration / 60)} min). Grounded in psychological insight, scripture (${theme.bibleVerse}), reflection on "${theme.theme}", and personal prayer.`,
    wordCount,
    webInsightSnippet,
    webSources,
    searchQueries,
    duration,
  };
};

export const generatePodcastScript = async (
  theme: WeeklyTheme,
  responses?: Partial<JournalResponses>
): Promise<string> => {
  const result = await generateWeeklyPodcastWithWebScan(theme, responses);
  return result.script;
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
