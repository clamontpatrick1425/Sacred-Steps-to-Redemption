import type { WeeklyTheme, JournalResponses } from '../types';

export type ShareContentType =
  | 'summary'
  | 'prompt'
  | 'reflection1'
  | 'reflection2'
  | 'deeper'
  | 'goal'
  | 'prayer'
  | 'scripture';

export interface ShareFormatOptions {
  contentType: ShareContentType;
  entry: WeeklyTheme;
  responses: Partial<JournalResponses>;
  includeScripture?: boolean;
  includeHashtags?: boolean;
  includeAppUrl?: boolean;
  authorName?: string | null;
  customPrayer?: string | null;
}

export interface ShareDataPayload {
  title: string;
  text: string;
  url: string;
}

/**
 * Checks if the Web Share API is available in the current browser/device environment
 */
export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Checks if the browser supports sharing files (such as images) via Web Share API
 */
export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files })
  );
}

/**
 * Get current application URL for sharing
 */
export function getShareUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    // Clean hash or query if desired, or provide canonical origin
    return window.location.origin;
  }
  return 'https://faith-journal.app';
}

/**
 * Builds clean, beautifully formatted share text based on the selected content and user preferences
 */
export function buildSharePayload(options: ShareFormatOptions): ShareDataPayload {
  const {
    contentType,
    entry,
    responses,
    includeScripture = true,
    includeHashtags = true,
    includeAppUrl = true,
    authorName = null,
    customPrayer = null,
  } = options;

  const url = getShareUrl();
  let title = `Week ${entry.week}: ${entry.theme} — Pilgrim's Journey`;
  const parts: string[] = [];

  // 1. Header
  const authorLine = authorName && authorName.trim() ? `Shared by ${authorName.trim()}` : null;
  parts.push(`🌿 Week ${entry.week}: ${entry.theme}${authorLine ? `\n👤 ${authorLine}` : ''}`);

  // 2. Specific Content Section
  switch (contentType) {
    case 'summary': {
      title = `Week ${entry.week} Reflection Summary: ${entry.theme}`;
      parts.push(`\n📝 Journey Focus:\n${entry.explanation}`);

      if (responses.promptResponse && responses.promptResponse.trim()) {
        const preview = responses.promptResponse.trim();
        parts.push(`\n💭 Core Reflection:\n"${preview}"`);
      } else if (responses.reflection1Response && responses.reflection1Response.trim()) {
        parts.push(`\n💭 Reflection:\n"${responses.reflection1Response.trim()}"`);
      }

      if (responses.personalGoal && responses.personalGoal.trim()) {
        parts.push(`\n🎯 Personal Commitment:\n"${responses.personalGoal.trim()}"`);
      }
      break;
    }

    case 'prompt': {
      title = `Week ${entry.week} Prompt Reflection: ${entry.theme}`;
      parts.push(`\n📌 Weekly Prompt:\n${entry.prompt}`);
      if (responses.promptResponse && responses.promptResponse.trim()) {
        parts.push(`\n💭 My Reflection:\n"${responses.promptResponse.trim()}"`);
      } else {
        parts.push('\n💭 (Reflecting on this week’s prompt)');
      }
      break;
    }

    case 'reflection1': {
      title = `Week ${entry.week} Reflection: ${entry.reflectionQuestion1}`;
      parts.push(`\n❓ Reflection Question:\n${entry.reflectionQuestion1}`);
      if (responses.reflection1Response && responses.reflection1Response.trim()) {
        parts.push(`\n💭 My Thoughts:\n"${responses.reflection1Response.trim()}"`);
      } else {
        parts.push('\n💭 (Reflecting on this question)');
      }
      break;
    }

    case 'reflection2': {
      title = `Week ${entry.week} Reflection: ${entry.reflectionQuestion2}`;
      parts.push(`\n❓ Reflection Question:\n${entry.reflectionQuestion2}`);
      if (responses.reflection2Response && responses.reflection2Response.trim()) {
        parts.push(`\n💭 My Thoughts:\n"${responses.reflection2Response.trim()}"`);
      } else {
        parts.push('\n💭 (Reflecting on this question)');
      }
      break;
    }

    case 'deeper': {
      title = `Week ${entry.week} Deeper Reflection: ${entry.theme}`;
      parts.push(`\n🌊 Deeper Reflection:\n"${responses.deeperReflectionResponse?.trim() || entry.explanation}"`);
      break;
    }

    case 'goal': {
      title = `Week ${entry.week} Commitment & Goal: ${entry.theme}`;
      parts.push(`\n🎯 My Personal Commitment:\n"${responses.personalGoal?.trim() || 'Taking steps toward recovery and spiritual growth.'}"`);
      break;
    }

    case 'prayer': {
      title = `Week ${entry.week} Prayer: ${entry.theme}`;
      const prayerText = customPrayer?.trim() || entry.prayer;
      parts.push(`\n🙏 Weekly Prayer:\n"${prayerText}"`);
      break;
    }

    case 'scripture': {
      title = `Scripture Anchor: ${entry.bibleVerse}`;
      parts.push(`\n📖 Scripture Anchor (${entry.bibleVerse}):\n"${entry.bibleVerseText}"`);
      break;
    }
  }

  // 3. Optional Scripture Anchor (if not already scripture mode)
  if (includeScripture && contentType !== 'scripture') {
    parts.push(`\n📖 Scripture Anchor:\n"${entry.bibleVerseText}" — ${entry.bibleVerse}`);
  }

  // 4. Optional Hashtags
  if (includeHashtags) {
    parts.push('\n#FaithJourney #ChristianRecovery #DailyDevotion #PilgrimProgress');
  }

  // 5. Optional App Link
  if (includeAppUrl) {
    parts.push(`\n✨ Read & reflect: ${url}`);
  }

  const text = parts.join('\n');

  return {
    title,
    text,
    url,
  };
}

/**
 * Triggers native Web Share API
 */
export async function executeWebShare(data: ShareDataPayload): Promise<{
  success: boolean;
  error?: string;
  cancelled?: boolean;
}> {
  if (!canUseWebShare()) {
    return { success: false, error: 'Web Share API not supported on this browser/device.' };
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url,
    });
    return { success: true };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    return { success: false, error: err?.message || 'Failed to open share dialog.' };
  }
}

/**
 * Generates direct social platform share links for fallback or desktop sharing
 */
export function getSocialShareLinks(payload: ShareDataPayload) {
  const encodedText = encodeURIComponent(payload.text);
  const encodedUrl = encodeURIComponent(payload.url);
  const encodedTitle = encodeURIComponent(payload.title);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
  };
}

/**
 * Copy text cleanly to the user's clipboard
 */
export async function copyShareTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
