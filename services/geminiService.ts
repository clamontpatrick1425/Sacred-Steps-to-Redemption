import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import type { WeeklyTheme, JournalResponses, SavedEntries, GratitudeEntry, PrayerWallEntry, EmotionDataPoint, MomentOfGrace } from '../types';

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

export const generateJournalContent = async (): Promise<WeeklyTheme[]> => {
  // Directly return the complete 52-week curriculum from our static file
  return [...allWeeklyThemes];
};

export const generatePersonalPrayer = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text.trim();

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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `I'm on a Christian spiritual recovery journey and I'm feeling '${feeling}'. Please provide one relevant and encouraging Bible verse with its citation that speaks to this feeling.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: verseSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error finding verse for feeling:", error);
        throw new Error("Failed to find a verse for your feeling. Please try again.");
    }
};

export const generateSpeech = async (textToSpeak: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
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
    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    return base64Audio;

  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate audio. Please try again.");
  }
};

export const generateMilestoneSummary = async (
  milestone: number,
  themesForPeriod: WeeklyTheme[],
  entriesForPeriod: SavedEntries,
  gratitudeEntries: GratitudeEntry[],
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error generating milestone summary:", error);
    throw new Error("Failed to generate your milestone summary. Please try again.");
  }
};

export const getFallbackRecoveryImage = (week: number): string => {
  const fallbacks = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Yosemite River Dawn
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", // Forest Path rays
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80", // Misty lake mountains
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80", // Forest stream rocks
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", // Ocean Sunrise beach
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80", // Sunlit green leaf
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", // Open country field tree
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80", // Sunbeam leaves
    "https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?auto=format&fit=crop&w=1200&q=80", // Meadow clouds morning
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80"  // Wood rings timeline
  ];
  const index = Math.abs(Math.floor(week)) % fallbacks.length;
  return fallbacks[index];
};

export const generateReflectiveImage = async (promptText: string, week?: number): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = `An abstract digital painting inspired by the following concept: "${promptText}". Style: serene, hopeful, gentle, ethereal watercolor. Do not include any text or recognizable human figures. Focus on symbolic imagery and color to evoke the feeling of the concept.`;

  if (week === 1) {
    const characters = [
      "An East Asian female",
      "An African American male",
      "A Caucasian female",
      "A Hispanic male",
      "A South Asian female",
      "A Middle Eastern male",
      "An indigenous female",
      "An African American female",
      "A Hispanic female",
      "A South Asian male"
    ];
    const chosenCharacter = characters[Math.floor(Math.random() * characters.length)];

    prompt = `Core Visual Metaphor
A quiet beginning: awareness, humility, and the recognition of light already present.

Image Generation Prompt
A serene early-morning landscape just after sunrise. Near the path, ${chosenCharacter} is sitting quietly, looking in active contemplation. Soft golden light filters through low clouds, illuminating a simple dirt path winding gently forward. Dew clings to tall grass, catching the light like small blessings. The scene feels still and reverent, as if the world is pausing to give thanks. No visible destination—only presence, peace, and quiet appreciation. Painterly realism, cinematic lighting, shallow depth of field, warm earth tones, contemplative mood.

Negative Prompt
No text, no religious symbols, no crosses, no churches, no dramatic skies, no people in distress, no darkness, no addiction imagery, no urban settings, no clutter, no neon colors, no surreal distortions.`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "4:3"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image data found in response.");

  } catch (error: any) {
    console.error("Error generating reflective image:", error);
    const originalMsg = error?.message || String(error) || "";
    const isPermission = originalMsg.toLowerCase().includes("permission") || originalMsg.toLowerCase().includes("403") || originalMsg.toLowerCase().includes("api_key") || originalMsg.toLowerCase().includes("unauthorized");
    if (isPermission) {
      throw new Error(`Permission Denied (403): ${originalMsg}`);
    }
    throw new Error(`Failed to generate reflective image: ${originalMsg}`);
  }
};


export const generateDeeperReflectionPrompt = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: { temperature: 0.75 },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating deeper reflection prompt:", error);
        throw new Error("Failed to generate a deeper reflection prompt.");
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const audioPart = {
        inlineData: {
            mimeType,
            data: base64Audio,
        },
    };

    const prompt = "Transcribe the following audio recording accurately. The content is a personal and reflective journal entry for a spiritual recovery program. Please only return the transcribed text.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: { parts: [audioPart, {text: prompt}] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio. The model may not be available in your region. Please try again later.");
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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
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
    } catch (error) {
        console.error("Error generating parable segment:", error);
        throw new Error("Failed to continue the story. Please try again.");
    }
};

export const generateReflectionSummary = async (theme: WeeklyTheme, responses: Partial<JournalResponses>): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text.trim();

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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
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
    } catch (error) {
        console.error("Error generating goal suggestions:", error);
        throw new Error("Failed to generate goal suggestions. Please try again.");
    }
};


export const generateMeditationScript = async (theme: WeeklyTheme): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
        return response.text.trim();
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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: emotionalArcSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: momentsOfGraceSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error extracting moments of grace:", error);
        throw new Error("Failed to extract key moments from your journal. Please try again later.");
    }
};

export const generateSongLyrics = async (songTitle: string, theme: WeeklyTheme): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating song lyrics:", error);
        throw new Error("Failed to generate song lyrics. Please try again.");
    }
};

export const generatePodcastScript = async (theme: WeeklyTheme): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                temperature: 0.75,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating podcast script:", error);
        throw new Error("Failed to generate podcast script. Please try again.");
    }
};

export const generateRedemptionReport = async (
  userName: string,
  entries: SavedEntries,
  triggers: { intensity: number; trigger: string; copingMechanism?: string; createdAt: string }[],
  gratitudeCount: number
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating redemption report:", error);
    throw new Error("Failed to generate redemption report.");
  }
};
