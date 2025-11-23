import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import type { WeeklyTheme, JournalResponses, SavedEntries, GratitudeEntry, SuggestedResource, PrayerWallEntry, EmotionDataPoint, MomentOfGrace } from '../types';

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
      suggestedResources: {
        type: Type.ARRAY,
        description: "An array of exactly 3 suggested resources like guided meditations or articles related to the week's theme.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the resource." },
            url: { type: Type.STRING, description: "A valid URL to the resource (e.g., YouTube video, article)." },
            type: { type: Type.STRING, description: "The type of resource: 'video', 'article', or 'audio'." },
          },
          required: ['title', 'url', 'type'],
        },
      },
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
      'suggestedResources',
      'songTitle',
      'songLinks'
    ]
  }
};

export const generateJournalContent = async (): Promise<WeeklyTheme[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Generate a complete 52-week journal for a program named 'Sacred Steps to Redemption', which is focused on battling addiction through Christian spirituality. 
    The tone should be encouraging, hopeful, and centered on thankfulness and redemption. 
    Each of the 52 weeks must include all of the following fields: 
    - week: The week number (1-52).
    - theme: A concise theme for the week (e.g., 'Honesty', 'Surrender', 'Gratitude').
    - explanation: A brief paragraph explaining the theme's relevance to recovery.
    - biblicalAspiration: A short, actionable spiritual goal based on biblical principles.
    - prompt: A primary journaling prompt for the user to reflect on.
    - bibleVerse: A relevant Bible verse citation (e.g., 'Philippians 4:13').
    - bibleVerseText: The complete text of the Bible verse.
    - reflectionQuestion1: A thought-provoking question related to the theme.
    - reflectionQuestion2: A second, distinct reflection question.
    - quote: An object containing an inspirational quote from a notable spiritual figure or author, with 'text' and 'author' fields. Ensure the author's name is always provided.
    - prayer: A heartfelt weekly prayer under 2500 characters.
    - suggestedResources: An array of exactly 3 relevant external resources for guided meditation, prayer, or reflection that align with the week's theme. Try to provide real, well-known resources where possible. For each resource, provide a 'title', a valid 'url' (e.g., to a YouTube video or a reputable article), and a 'type' ('video', 'article', 'audio').
    - songTitle: A creative, uplifting song title related to the week's theme.
    - songLinks: An object with two keys: 'spotify' and 'appleMusic'. Use placeholder URLs for these, for example: 'https://open.spotify.com/track/placeholder123' and 'https://music.apple.com/us/album/placeholder/123'.
    
    Ensure the output is a JSON array containing exactly 52 unique weekly entries.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: journalSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("API returned an empty or invalid array.");
    }
    
    // Sort by week number to ensure order
    return data.sort((a, b) => a.week - b.week);

  } catch (error) {
    console.error("Error generating journal content:", error);
    throw new Error("Failed to fetch journal content from Gemini API.");
  }
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
      model: "gemini-2.5-flash",
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
            model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash-preview-tts",
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
      model: "gemini-2.5-flash",
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

export const findReplacementResource = async (
  theme: WeeklyTheme,
  brokenResource: SuggestedResource
): Promise<SuggestedResource> => {
    if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    I need a replacement for a broken link in a recovery journal.
    Theme: "${theme.theme}".
    The user is looking for a replacement for: "${brokenResource.title}" (${brokenResource.type}).
    
    USE GOOGLE SEARCH to find a valid URL for a high-quality, currently available ${brokenResource.type} (or similar) that matches this theme.
    
    Return the details in this exact format:
    Title: <The title of the resource>
    URL: <The direct URL>
    Type: <video, article, or audio>
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "text/plain",
      },
    });

    const text = response.text || "";
    
    // Parse the formatted text response
    const titleMatch = text.match(/Title:\s*(.+)/i);
    const urlMatch = text.match(/URL:\s*(.+)/i);
    const typeMatch = text.match(/Type:\s*(.+)/i);

    let title = titleMatch ? titleMatch[1].trim() : "";
    let url = urlMatch ? urlMatch[1].trim() : "";
    let type = typeMatch ? typeMatch[1].trim().toLowerCase() : "article";
    
    // Prioritize grounding chunks for the URL as they are real search results
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunk = response.candidates[0].groundingMetadata.groundingChunks.find(c => c.web?.uri);
        if (chunk?.web?.uri) {
            url = chunk.web.uri;
            if (chunk.web.title) title = chunk.web.title;
        }
    }

    if (!url) {
        // Fallback: if no URL found, maybe try to construct a search URL or throw
        throw new Error("No valid URL found in search results.");
    }

    if (!title) title = "Suggested Resource";
    
    // Normalize type
    if (!['video', 'article', 'audio'].includes(type)) {
        type = 'article';
    }

    return {
        title,
        url,
        type: type as 'video' | 'article' | 'audio'
    };

  } catch (error) {
    console.error("Error finding replacement resource:", error);
    throw new Error("Failed to find a replacement resource. Please try again later.");
  }
};

export const generateReflectiveImage = async (promptText: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `An abstract digital painting inspired by the following concept: "${promptText}". Style: serene, hopeful, gentle, ethereal watercolor. Do not include any text or recognizable human figures. Focus on symbolic imagery and color to evoke the feeling of the concept.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Error generating reflective image:", error);
    throw new Error("Failed to generate reflective image. Please try again.");
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
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { temperature: 0.75 },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating deeper reflection prompt:", error);
        throw new Error("Failed to generate a deeper reflection prompt.");
    }
};

export const createChatSession = (): Chat => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are a gentle, wise, and encouraging spiritual guide for a person on a recovery journey from addiction using a Christian spiritual journal. Your name is 'Kairos', meaning a moment of divine opportunity. Respond with empathy, hope, and insight. Keep your responses concise and thoughtful, often referencing concepts of grace, redemption, and faith. When asked for clarification on biblical verses, provide context and meaning in a simple, understandable way.",
        },
    });
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
            model: 'gemini-3-pro-preview',
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
            model: "gemini-2.5-flash",
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

export const moderatePrayerWallSubmission = async (text: string): Promise<boolean> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        You are a content moderator for a Christian spiritual recovery app's anonymous prayer wall.
        The purpose of the wall is for users to share prayers and notes of gratitude.
        Analyze the following user submission to determine if it is appropriate.
        An appropriate submission is one that is positive, hopeful, prayerful, or expresses gratitude. It must not contain negativity, hate speech, violence, profanity, or personal attacks.
        
        Submission: "${text}"

        Is this submission appropriate? Respond with only "yes" or "no".
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        const decision = response.text.trim().toLowerCase();
        return decision === 'yes';

    } catch (error) {
        console.error("Error moderating submission:", error);
        // Fail safely - assume inappropriate if moderation fails
        return false;
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
      model: "gemini-2.5-flash",
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

export const generateDailyAffirmation = async (theme: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        Generate a short, positive, first-person daily affirmation for someone on a Christian spiritual recovery journey.
        The affirmation should be directly related to the weekly theme of '${theme}'.
        It needs to be concise, encouraging, and easy to remember (around 10-15 words).
        Example for theme 'Hope': "Today, I choose to see hope in all circumstances."
        Respond with only the affirmation text, without any quotation marks or introductory phrases.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating daily affirmation:", error);
        throw new Error("Failed to generate a daily affirmation.");
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
            model: "gemini-2.5-flash",
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
            model: "gemini-2.5-flash",
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
            model: "gemini-3-pro-preview",
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
            model: "gemini-2.5-flash",
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
            model: "gemini-2.5-flash",
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
        You are an inspirational podcast host. Your style is talkative yet friendly and very encouraging.
        Create a short podcast script for a person on a Christian spiritual recovery journey.
        The script should be less than 5 minutes long when spoken at a comfortable pace (around 700-750 words).
        The episode should be based on the following weekly theme:
        - Theme: "${theme.theme}"
        - Explanation: "${theme.explanation}"
        - Key Bible Verse: "${theme.bibleVerseText}" (${theme.bibleVerse})

        Structure the podcast with:
        1. A warm and welcoming introduction.
        2. A reflection on the weekly theme and how it applies to the challenges and hopes of recovery.
        3. An exploration of the bible verse, explaining its meaning in a relatable way.
        4. A concluding thought that leaves the listener feeling hopeful, empowered, and not alone.

        The language should be simple, direct, and filled with grace. Speak directly to the listener as 'you'.
        Return only the script text, without any introductory phrases like "Here is your script:".
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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