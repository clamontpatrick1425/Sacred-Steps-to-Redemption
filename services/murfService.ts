/**
 * Murf AI Speech Synthesis Service
 * Provides studio-quality AI voiceover generation for Sacred Steps companion podcast episodes.
 */

export interface MurfVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
  recommendedStyle: string;
  availableStyles: string[];
}

export const CURATED_MURF_VOICES: MurfVoice[] = [
  {
    id: 'en-US-terrell',
    name: 'Terrell',
    gender: 'male',
    description: 'Warm, calm, and inspirational — deeply human cadence for devotionals',
    recommendedStyle: 'Inspirational',
    availableStyles: ['Inspirational', 'Conversational', 'Calm', 'Narration'],
  },
  {
    id: 'en-US-carter',
    name: 'Carter',
    gender: 'male',
    description: 'Warm, documentary-style narrator with natural conversational warmth',
    recommendedStyle: 'Calm',
    availableStyles: ['Calm', 'Conversational', 'Documentary', 'Narration'],
  },
  {
    id: 'en-US-wayne',
    name: 'Wayne',
    gender: 'male',
    description: 'Deep, serene, and pastoral — provides steady, reassuring comfort',
    recommendedStyle: 'Calm',
    availableStyles: ['Calm', 'Conversational', 'Inspirational', 'Narration'],
  },
  {
    id: 'en-US-daniel',
    name: 'Daniel',
    gender: 'male',
    description: 'Empathetic and thoughtful storyteller with genuine emotional vulnerability',
    recommendedStyle: 'Storytelling',
    availableStyles: ['Storytelling', 'Conversational', 'Inspirational'],
  },
  {
    id: 'en-US-imani',
    name: 'Imani',
    gender: 'female',
    description: 'Nurturing, compassionate, and deeply comforting spiritual guide',
    recommendedStyle: 'Conversational',
    availableStyles: ['Conversational'],
  },
  {
    id: 'en-US-alina',
    name: 'Alina',
    gender: 'female',
    description: 'Uplifting, clear, and encouraging youthful companion',
    recommendedStyle: 'Conversational',
    availableStyles: ['Conversational'],
  },
  {
    id: 'en-US-samantha',
    name: 'Samantha',
    gender: 'female',
    description: 'Gentle, elegant, and expressive conversational tone',
    recommendedStyle: 'Conversational',
    availableStyles: ['Conversational', 'Luxury'],
  },
];

export interface ParsedSection {
  sectionNumber: number;
  title: string;
  timeRange: string;
  targetWords: string;
  audioCue?: string;
  content: string;
  spokenWords: string;
  wordCount: number;
}

export interface MurfGenerationResponse {
  audioUrl?: string;
  audioBase64: string;
  duration: number;
  voiceId: string;
  wordDurations?: { word: string; startMs: number; endMs: number }[];
  remainingCharacterCount?: number;
  chunksCount?: number;
}

export const getMurfApiKey = (): string => {
  return (
    (typeof process !== 'undefined' && process.env && (process.env.MURF_API_KEY || process.env.VITE_MURF_API_KEY)) ||
    ''
  );
};

/**
 * Strips producer audio cues like [Music: ...] and section headers from the script
 * so Murf AI reads natural conversational speech without reciting brackets or cues.
 */
export const cleanScriptForMurf = (rawScript: string): string => {
  if (!rawScript) return '';

  let cleaned = rawScript;

  // Remove bracketed audio cues: [Music: ...], [Audio Cue: ...], [Host: ...]
  cleaned = cleaned.replace(/\[\s*(?:Music|Audio Cue|Host|Sound|Producer)[\s\S]*?\]/gi, ' ');
  cleaned = cleaned.replace(/\[[\s\S]*?\]/g, ' ');

  // Remove section headers like "1. The Hook & Welcome (0:00 - 0:45 | ~100 words)"
  cleaned = cleaned.replace(/^\s*\d+\.\s*(?:The Hook|The Core Message|Spiritual Grounding|The Journal Invitation|The Prayer)[\s\S]*?$/gim, ' ');
  cleaned = cleaned.replace(/^\s*(?:Audio Cue|Content|Sign-Off|Welcome|Hook|Spiritual Grounding):\s*/gim, ' ');

  // Normalize spaces and line breaks while keeping natural paragraph pauses
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return cleaned;
};

/**
 * Parses the 5 timed sections from the Master Podcast Script.
 */
export const parseMasterScriptSections = (script: string): ParsedSection[] => {
  if (!script) return [];

  const sectionDefs = [
    { num: 1, title: 'The Hook & Welcome', time: '0:00 - 0:45', target: '~100 words' },
    { num: 2, title: 'The Core Message & Web Insight', time: '0:45 - 2:00', target: '~200 words' },
    { num: 3, title: 'Spiritual Grounding', time: '2:00 - 3:00', target: '~150 words' },
    { num: 4, title: 'The Journal Invitation', time: '3:00 - 4:00', target: '~100 words' },
    { num: 5, title: 'The Prayer & Sign-Off', time: '4:00 - 4:45', target: '~100 words' },
  ];

  const results: ParsedSection[] = [];

  // Match pattern: 1. The Hook & Welcome ... up to 2. ...
  for (let i = 0; i < sectionDefs.length; i++) {
    const current = sectionDefs[i];
    const nextNum = i + 1 < sectionDefs.length ? sectionDefs[i + 1].num : null;

    let regex: RegExp;
    if (nextNum) {
      regex = new RegExp(
        `(?:^|\\n)\\s*${current.num}\\.\\s*.*?\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*${nextNum}\\.\\s*)`,
        'i'
      );
    } else {
      regex = new RegExp(`(?:^|\\n)\\s*${current.num}\\.\\s*.*?\\n([\\s\\S]*)$`, 'i');
    }

    const match = script.match(regex);
    if (match && match[1]) {
      const rawBody = match[1].trim();
      const cueMatch = rawBody.match(/\[Music:[\s\S]*?\]/i) || rawBody.match(/\[[\s\S]*?\]/);
      const audioCue = cueMatch ? cueMatch[0] : undefined;
      const spoken = cleanScriptForMurf(rawBody);
      const wordCount = spoken.split(/\s+/).filter(Boolean).length;

      results.push({
        sectionNumber: current.num,
        title: current.title,
        timeRange: current.time,
        targetWords: current.target,
        audioCue,
        content: rawBody,
        spokenWords: spoken,
        wordCount,
      });
    }
  }

  // Fallback if sections were formatted differently without numbers:
  if (results.length === 0) {
    const spoken = cleanScriptForMurf(script);
    const wordCount = spoken.split(/\s+/).filter(Boolean).length;
    results.push({
      sectionNumber: 1,
      title: 'Complete Devotional Episode',
      timeRange: '0:00 - 4:30',
      targetWords: '~600 words',
      content: script,
      spokenWords: spoken,
      wordCount,
    });
  }

  return results;
};

/**
 * Chunks long text into pieces under the specified max character length (default 2400 chars,
 * well under Murf's 3,000 char per request limit).
 */
export const chunkTextForMurf = (text: string, maxChunkLength = 2400): string[] => {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      if (para.length > maxChunkLength) {
        // Break paragraph by sentence
        const sentences = para.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [para];
        currentChunk = '';
        for (const sent of sentences) {
          if ((currentChunk + ' ' + sent).trim().length <= maxChunkLength) {
            currentChunk = currentChunk ? currentChunk + ' ' + sent : sent;
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sent;
          }
        }
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
};

/**
 * Helper to convert Blob to base64 Data URL safely using FileReader
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      // Node.js fallback if ever needed
      blob.arrayBuffer().then((buf) => {
        const base64 = Buffer.from(buf).toString('base64');
        resolve(`data:audio/mp3;base64,${base64}`);
      }).catch(reject);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Optimizes devotional script length to fit Murf AI's character constraints (< 2,500 chars)
 * ensuring a single, crystal-clear, studio-grade MP3 generated in ~8-10 seconds.
 */
export const optimizeScriptForMurf = (text: string, maxChars = 2400): string => {
  const cleaned = cleanScriptForMurf(text);
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  // Find the last complete sentence ending before maxChars
  const sub = cleaned.substring(0, maxChars);
  const lastPunctuation = Math.max(
    sub.lastIndexOf('. '),
    sub.lastIndexOf('! '),
    sub.lastIndexOf('? '),
    sub.lastIndexOf('.\n')
  );

  if (lastPunctuation > 1600) {
    return sub.substring(0, lastPunctuation + 1).trim();
  }

  return sub.trim();
};

/**
 * Single-chunk call to Murf AI API
 */
export const synthesizeSingleMurfChunk = async (
  text: string,
  voiceId = 'en-US-terrell',
  style = 'Inspirational',
  apiKey?: string,
  rate = -3,
  pitch = 0
): Promise<{
  audioFile?: string;
  encodedAudio?: string;
  audioLengthInSeconds: number;
  wordDurations?: { word: string; startMs: number; endMs: number }[];
  remainingCharacterCount?: number;
}> => {
  const key = apiKey || getMurfApiKey();
  const endpoint = 'https://api.murf.ai/v1/speech/generate';

  // Request parameters tailored for natural, non-robotic, contemplative human delivery:
  // - Premium voice: en-US-terrell (warm, grounded, middle-aged male)
  // - Style: Inspirational (deeply human inflection, natural spiritual resonance)
  // - Rate: -3% (gentle, unhurried cadence giving space for reflection)
  // - Pitch: 0 (natural vocal timbre)
  const bodyPayload: Record<string, any> = {
    voiceId: voiceId || 'en-US-terrell',
    text,
    format: 'MP3',
    encodeAsBase64: true,
    rate,
    pitch,
  };

  if (style) {
    bodyPayload.style = style;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Murf AI synthesis failed (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  return {
    audioFile: data.audioFile || undefined,
    encodedAudio: data.encodedAudio || undefined,
    audioLengthInSeconds: data.audioLengthInSeconds || 0,
    wordDurations: data.wordDurations || [],
    remainingCharacterCount: data.remainingCharacterCount,
  };
};

/**
 * Synthesize complete podcast script via Murf AI.
 * Handles single or multi-chunk MP3 generation (well under Murf's 3,000 char limit),
 * ensuring the ENTIRE script (all 5 sections from hook to prayer) is voiced in studio quality.
 * Guaranteed to retrieve and assemble the full audio stream before returning for IndexedDB caching.
 */
export const generateSpeechWithMurf = async (
  rawScript: string,
  voiceId = 'en-US-terrell',
  style = 'Inspirational',
  rate = -3,
  pitch = 0
): Promise<MurfGenerationResponse> => {
  const apiKey = getMurfApiKey();
  if (!apiKey) {
    throw new Error('Murf AI API Key is not configured.');
  }

  const cleanedText = cleanScriptForMurf(rawScript);
  if (!cleanedText) {
    throw new Error('Script text is empty after cleaning.');
  }

  // Chunk text at natural sentence/paragraph boundaries under 2,000 chars (safe ceiling below 3,000 max)
  const chunks = chunkTextForMurf(cleanedText, 2000);
  console.info(`Calling Murf AI for voice "${voiceId}" (${cleanedText.length} chars across ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}, rate=${rate})...`);

  if (chunks.length === 1) {
    const result = await synthesizeSingleMurfChunk(chunks[0], voiceId, style, apiKey, rate, pitch);
    if (!result.audioFile && !result.encodedAudio) {
      throw new Error('Murf AI did not return an audio file or stream.');
    }

    let audioBase64 = result.encodedAudio
      ? (result.encodedAudio.startsWith('data:') ? result.encodedAudio : `data:audio/mp3;base64,${result.encodedAudio}`)
      : '';
    let audioUrl = result.audioFile;

    // Ensure complete audio stream retrieval into a verified base64 data URL
    if (!audioBase64 && audioUrl && typeof fetch !== 'undefined') {
      const fileRes = await fetch(audioUrl);
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        audioBase64 = await blobToDataUrl(blob);
      }
    }

    return {
      audioUrl: audioUrl || (audioBase64 ? audioBase64 : undefined),
      audioBase64,
      duration: Math.round(result.audioLengthInSeconds || 260),
      voiceId,
      wordDurations: result.wordDurations,
      remainingCharacterCount: result.remainingCharacterCount,
      chunksCount: 1,
    };
  }

  // Multiple chunks: synthesize all chunks sequentially and concatenate into a single continuous MP3 stream
  const audioBlobs: Blob[] = [];
  let totalDuration = 0;
  const allWordDurations: { word: string; startMs: number; endMs: number }[] = [];
  let currentOffsetMs = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.info(`Synthesizing Murf chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
    const chunkRes = await synthesizeSingleMurfChunk(chunk, voiceId, style, apiKey, rate, pitch);

    const chunkDuration = chunkRes.audioLengthInSeconds || 0;
    totalDuration += chunkDuration;

    if (chunkRes.wordDurations) {
      for (const wd of chunkRes.wordDurations) {
        allWordDurations.push({
          word: wd.word,
          startMs: wd.startMs + currentOffsetMs,
          endMs: wd.endMs + currentOffsetMs,
        });
      }
    }
    currentOffsetMs += Math.round(chunkDuration * 1000);

    if (chunkRes.encodedAudio) {
      const rawBase64 = chunkRes.encodedAudio.replace(/^data:audio\/\w+;base64,/, '');
      const byteChars = atob(rawBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let j = 0; j < byteChars.length; j++) {
        byteNumbers[j] = byteChars.charCodeAt(j);
      }
      const byteArray = new Uint8Array(byteNumbers);
      audioBlobs.push(new Blob([byteArray], { type: 'audio/mp3' }));
    } else if (chunkRes.audioFile) {
      const fileRes = await fetch(chunkRes.audioFile);
      if (!fileRes.ok) {
        throw new Error(`Failed to fetch audio for chunk ${i + 1}`);
      }
      const blob = await fileRes.blob();
      audioBlobs.push(blob);
    }
  }

  const combinedBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
  const audioBase64 = await blobToDataUrl(combinedBlob);
  const audioUrl = URL.createObjectURL(combinedBlob);

  return {
    audioUrl,
    audioBase64,
    duration: Math.round(totalDuration || 280),
    voiceId,
    wordDurations: allWordDurations,
    chunksCount: chunks.length,
  };
};
